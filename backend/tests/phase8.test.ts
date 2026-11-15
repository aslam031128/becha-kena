import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { User, Listing, Conversation, Message, Offer } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  OfferStatus,
  MessageType
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';
import { offerExpirationQueue } from '../src/queues/offerExpiration.queue.js';
import { processOfferExpiration } from '../src/queues/offerExpiration.worker.js';

describe('Phase 8: Binding Offer Negotiation Protocol Specification', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Express;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Offer.deleteMany({});

    jest.spyOn(offerExpirationQueue, 'getJob').mockImplementation(async (_jobId: string) => ({
      id: 'job_expire_test',
      remove: jest.fn().mockResolvedValue(true)
    } as any));

    jest.spyOn(offerExpirationQueue, 'add').mockImplementation(async (name: any, data: any, opts: any) => ({
      id: opts?.jobId || 'job_expire_test',
      name,
      data,
      opts
    } as any));
  });

  const createUserAndToken = async (overrides: Partial<any> = {}) => {
    const user = await User.create({
      phone: overrides.phone || `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
      displayName: overrides.displayName || 'Test Citizen',
      role: overrides.role || UserRole.CITIZEN,
      isNidVerified: overrides.isNidVerified ?? true,
      kycStatus: overrides.kycStatus || KycStatus.VERIFIED,
      deviceUUIDs: ['device-test-1'],
      activeDeviceCount: 1,
      isFrozen: overrides.isFrozen ?? false,
      isBanned: overrides.isBanned ?? false
    });

    const token = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      deviceId: 'device-test-1'
    });

    return { user, token };
  };

  const createSampleListing = async (sellerId: mongoose.Types.ObjectId, price = 50000) => {
    return await Listing.create({
      sellerId,
      title: 'Sony PlayStation 5 Disc Edition 825GB',
      description: 'Used for 4 months. Includes 1 original DualSense controller and HDMI cable.',
      price,
      condition: ListingCondition.LIKE_NEW,
      category: ListingCategory.ELECTRONICS,
      location: {
        type: 'Point',
        coordinates: [90.3742, 23.7461],
        division: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://cdn.becha-kena.com/listings/ps5_1.webp'],
      status: ListingStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  const setupThread = async () => {
    const { user: seller, token: sellerToken } = await createUserAndToken({ displayName: 'Seller Rahim' });
    const { user: buyer, token: buyerToken } = await createUserAndToken({ displayName: 'Buyer Karim' });
    const listing = await createSampleListing(seller._id, 50000);

    const conversation = await Conversation.create({
      listingId: listing._id,
      buyerId: buyer._id,
      sellerId: seller._id
    });

    return { seller, sellerToken, buyer, buyerToken, listing, conversation };
  };

  describe('8.1 — Submit Binding Formal Offer (POST /api/v1/chats/:conversationId/offers)', () => {
    it('should reject unverified citizen with 403 KYC_REQUIRED', async () => {
      const { seller, listing } = await setupThread();
      const { token: unverifiedToken, user: unverifiedBuyer } = await createUserAndToken({ isNidVerified: false });

      const conv = await Conversation.create({
        listingId: listing._id,
        buyerId: unverifiedBuyer._id,
        sellerId: seller._id
      });

      const res = await request(app)
        .post(`/api/v1/chats/${conv._id}/offers`)
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({ amount: 45000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_REQUIRED);
    });

    it('should reject seller submitting an initial offer on their own listing', async () => {
      const { sellerToken, conversation } = await setupThread();

      const res = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 45000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should reject stranger who is not a participant in the conversation', async () => {
      const { conversation } = await setupThread();
      const { token: strangerToken } = await createUserAndToken();

      const res = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ amount: 45000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_CHAT_ACTION);
    });

    it('should reject offer amount less than 50 BDT or exceeding listing price', async () => {
      const { buyerToken, conversation } = await setupThread();

      // < 50 BDT
      const resLow = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 40 });
      expect(resLow.status).toBe(400);

      // > 50,000 asking price
      const resHigh = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 55000 });
      expect(resHigh.status).toBe(400);
      expect(resHigh.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should successfully submit Round 1 offer with 24-hr expiry, delayed BullMQ job, and chat event', async () => {
      const { buyer, seller, listing, conversation, buyerToken } = await setupThread();

      const res = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 46000 });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(46000);
      expect(res.body.data.round).toBe(1);
      expect(res.body.data.status).toBe(OfferStatus.PENDING);
      expect(res.body.data.conversationId).toBe(conversation._id.toString());
      expect(res.body.data.listingId).toBe(listing._id.toString());
      expect(res.body.data.buyerId).toBe(buyer._id.toString());
      expect(res.body.data.sellerId).toBe(seller._id.toString());

      // Verify Offer in DB
      const offer = await Offer.findById(res.body.data.offerId);
      expect(offer).not.toBeNull();
      expect(offer?.amount).toBe(46000);
      expect(offer?.round).toBe(1);

      // Verify BullMQ schedule call
      expect(offerExpirationQueue.add).toHaveBeenCalledWith(
        'expire-offer',
        { offerId: offer!._id.toString() },
        expect.objectContaining({ delay: 24 * 60 * 60 * 1000 })
      );

      // Verify chat event message
      const messages = await Message.find({ conversationId: conversation._id });
      expect(messages).toHaveLength(1);
      expect(messages[0].messageType).toBe(MessageType.OFFER_EVENT);
      expect(messages[0].text).toContain('46,000');

      // Verify conversation lastMessage preview
      const updatedConv = await Conversation.findById(conversation._id);
      expect(updatedConv?.lastMessage?.text).toContain('46,000');
    });

    it('should reject concurrent pending offer from same buyer on the listing', async () => {
      const { buyerToken, conversation } = await setupThread();

      // First offer
      await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 46000 });

      // Second offer while first is still pending
      const res = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 47000 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.CONFLICT);
    });

    it('should enforce anti-spam quota: max 3 offers per buyer per listing', async () => {
      const { buyer, seller, listing, conversation, buyerToken } = await setupThread();

      // Create 3 already declined/countered offers for this buyer & listing
      await Offer.create([
        {
          conversationId: conversation._id,
          listingId: listing._id,
          buyerId: buyer._id,
          sellerId: seller._id,
          amount: 42000,
          round: 1,
          status: OfferStatus.DECLINED
        },
        {
          conversationId: conversation._id,
          listingId: listing._id,
          buyerId: buyer._id,
          sellerId: seller._id,
          amount: 43000,
          round: 2,
          status: OfferStatus.DECLINED
        },
        {
          conversationId: conversation._id,
          listingId: listing._id,
          buyerId: buyer._id,
          sellerId: seller._id,
          amount: 44000,
          round: 3,
          status: OfferStatus.DECLINED
        }
      ]);

      // Attempt 4th offer
      const res = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 45000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.OFFER_LIMIT_EXCEEDED);
    });
  });

  describe('8.2 — Submit Counter-Offer (POST /api/v1/chats/:conversationId/offers/:offerId/counter)', () => {
    it('should allow seller to counter buyer offer, transitioning previous offer to countered and advancing round', async () => {
      const { buyer, seller, listing, conversation, buyerToken, sellerToken } = await setupThread();

      // Buyer sends initial offer (Round 1)
      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 45000 });
      const round1OfferId = res1.body.data.offerId;

      // Seller counters with 48,000 (Round 2)
      const res2 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${round1OfferId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 48000 });

      expect(res2.status).toBe(201);
      expect(res2.body.data.amount).toBe(48000);
      expect(res2.body.data.round).toBe(2);
      expect(res2.body.data.parentOfferId).toBe(round1OfferId);
      expect(res2.body.data.status).toBe(OfferStatus.PENDING);

      // Verify previous offer is now COUNTERED
      const prevOffer = await Offer.findById(round1OfferId);
      expect(prevOffer?.status).toBe(OfferStatus.COUNTERED);

      // Buyer counters with 47,000 (Round 3)
      const round2OfferId = res2.body.data.newOfferId;
      const res3 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${round2OfferId}/counter`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 47000 });

      expect(res3.status).toBe(201);
      expect(res3.body.data.round).toBe(3);

      // Attempting Round 4 counter should be rejected (max 3 rounds)
      const round3OfferId = res3.body.data.newOfferId;
      const res4 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${round3OfferId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 47500 });

      expect(res4.status).toBe(403);
      expect(res4.body.error.code).toBe(ErrorCodes.OFFER_LIMIT_EXCEEDED);
    });

    it('should reject countering an already countered or non-pending offer', async () => {
      const { buyerToken, sellerToken, conversation } = await setupThread();

      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 45000 });
      const offerId = res1.body.data.offerId;

      // Counter once
      await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 48000 });

      // Countering the same original offer again should fail
      const resDuplicate = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${offerId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 49000 });

      expect(resDuplicate.status).toBe(409);
      expect(resDuplicate.body.error.code).toBe(ErrorCodes.OFFER_ALREADY_RESOLVED);
    });
  });

  describe('8.3 — Accept Offer & Listing Under Offer (POST /accept & PATCH)', () => {
    it('should reject buyer from accepting their own offer', async () => {
      const { buyerToken, conversation } = await setupThread();

      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 46000 });

      const resAccept = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${res1.body.data.offerId}/accept`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(resAccept.status).toBe(403);
      expect(resAccept.body.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should allow seller to accept offer via POST /accept, updating listing to under_offer', async () => {
      const { listing, buyerToken, sellerToken, conversation } = await setupThread();

      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 47000 });

      const offerId = res1.body.data.offerId;

      const resAccept = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${offerId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(resAccept.status).toBe(200);
      expect(resAccept.body.data.status).toBe(OfferStatus.ACCEPTED);
      expect(resAccept.body.data.finalPrice).toBe(47000);
      expect(resAccept.body.data.listingStatus).toBe(ListingStatus.UNDER_OFFER);

      // Verify in DB
      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing?.status).toBe(ListingStatus.UNDER_OFFER);

      const updatedOffer = await Offer.findById(offerId);
      expect(updatedOffer?.status).toBe(OfferStatus.ACCEPTED);
    });

    it('should support PATCH /:offerId with { action: "accept" }', async () => {
      const { buyerToken, sellerToken, conversation } = await setupThread();

      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 47500 });

      const offerId = res1.body.data.offerId;

      const resPatch = await request(app)
        .patch(`/api/v1/chats/${conversation._id}/offers/${offerId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'accept' });

      expect(resPatch.status).toBe(200);
      expect(resPatch.body.data.status).toBe(OfferStatus.ACCEPTED);
    });
  });

  describe('8.4 — Decline Offer & Listing Reversion (POST /decline & PATCH)', () => {
    it('should allow seller to decline offer, cancelling expiry and recording chat event', async () => {
      const { buyerToken, sellerToken, conversation } = await setupThread();

      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 45000 });

      const offerId = res1.body.data.offerId;

      const resDecline = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${offerId}/decline`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(resDecline.status).toBe(200);
      expect(resDecline.body.data.status).toBe(OfferStatus.DECLINED);

      const offer = await Offer.findById(offerId);
      expect(offer?.status).toBe(OfferStatus.DECLINED);
    });

    it('should support PATCH /:offerId with { action: "decline" }', async () => {
      const { buyerToken, sellerToken, conversation } = await setupThread();

      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 44000 });

      const offerId = res1.body.data.offerId;

      const resPatch = await request(app)
        .patch(`/api/v1/chats/${conversation._id}/offers/${offerId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ action: 'decline' });

      expect(resPatch.status).toBe(200);
      expect(resPatch.body.data.status).toBe(OfferStatus.DECLINED);
    });

    it('should revert listing status from under_offer to active when accepted offer is declined', async () => {
      const { listing, buyerToken, sellerToken, conversation } = await setupThread();

      // Accept an offer first
      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 47000 });
      const offerId = res1.body.data.offerId;

      await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${offerId}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      let checkListing = await Listing.findById(listing._id);
      expect(checkListing?.status).toBe(ListingStatus.UNDER_OFFER);

      // Now create a counter or subsequent pending offer and decline it
      const offer2 = await Offer.create({
        conversationId: conversation._id,
        listingId: listing._id,
        buyerId: conversation.buyerId,
        sellerId: conversation.sellerId,
        amount: 48000,
        round: 2,
        status: OfferStatus.PENDING
      });

      // Mark the first one as declined too
      await Offer.findByIdAndUpdate(offerId, { status: OfferStatus.DECLINED });

      // Decline offer2
      const resDecline = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${offer2._id}/decline`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(resDecline.status).toBe(200);
      checkListing = await Listing.findById(listing._id);
      expect(checkListing?.status).toBe(ListingStatus.ACTIVE);
    });
  });

  describe('8.5 — Get Conversation Offers (GET /api/v1/chats/:conversationId/offers)', () => {
    it('should return all negotiation offers in thread in chronological order', async () => {
      const { buyerToken, sellerToken, conversation } = await setupThread();

      // Round 1 (Buyer: 44,000)
      const res1 = await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ amount: 44000 });

      // Round 2 (Seller counters: 48,000)
      await request(app)
        .post(`/api/v1/chats/${conversation._id}/offers/${res1.body.data.offerId}/counter`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ amount: 48000 });

      const resList = await request(app)
        .get(`/api/v1/chats/${conversation._id}/offers`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(resList.status).toBe(200);
      expect(resList.body.data).toHaveLength(2);
      expect(resList.body.data[0].amount).toBe(44000);
      expect(resList.body.data[0].status).toBe(OfferStatus.COUNTERED);
      expect(resList.body.data[1].amount).toBe(48000);
      expect(resList.body.data[1].status).toBe(OfferStatus.PENDING);
    });
  });

  describe('8.6 — BullMQ Offer Expiration Worker (processOfferExpiration)', () => {
    it('should atomically transition pending offer to expired and create chat event message', async () => {
      const { buyer, seller, listing, conversation } = await setupThread();

      const offer = await Offer.create({
        conversationId: conversation._id,
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        amount: 45000,
        round: 1,
        status: OfferStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000) // already past 24 hrs
      });

      const mockJob = {
        data: { offerId: offer._id.toString() }
      } as any;

      const result = await processOfferExpiration(mockJob);
      expect(result.expired).toBe(true);
      expect(result.status).toBe(OfferStatus.EXPIRED);

      const refreshedOffer = await Offer.findById(offer._id);
      expect(refreshedOffer?.status).toBe(OfferStatus.EXPIRED);

      // Verify chat message created
      const messages = await Message.find({ conversationId: conversation._id });
      expect(messages.some((m) => m.text.includes('expired'))).toBe(true);
    });

    it('should ignore offer that was already resolved (not pending)', async () => {
      const { buyer, seller, listing, conversation } = await setupThread();

      const offer = await Offer.create({
        conversationId: conversation._id,
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        amount: 45000,
        round: 1,
        status: OfferStatus.ACCEPTED
      });

      const mockJob = {
        data: { offerId: offer._id.toString() }
      } as any;

      const result = await processOfferExpiration(mockJob);
      expect(result.expired).toBe(false);
      expect(result.status).toBe('already_resolved_or_not_found');
    });
  });
});
