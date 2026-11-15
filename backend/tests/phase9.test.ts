import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { User, Listing, Conversation, Offer, Deal, Review } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  OfferStatus
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';
import { offerExpirationQueue } from '../src/queues/offerExpiration.queue.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randomPhone = () => `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;

describe('Phase 9: ACID Deal Closure & Bilateral Reviews', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Express;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
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
    await Offer.deleteMany({});
    await Deal.deleteMany({});
    await Review.deleteMany({});

    // Mock BullMQ queues so tests don't require a real Redis instance
    jest.spyOn(offerExpirationQueue, 'add').mockImplementation(async (name: any, data: any, opts: any) => ({
      id: opts?.jobId || 'mock-job',
      name,
      data
    } as any));
    jest.spyOn(offerExpirationQueue, 'getJob').mockImplementation(async (_id: string) => ({
      id: 'mock-job',
      remove: jest.fn().mockResolvedValue(true)
    } as any));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Fixture helpers ───────────────────────────────────────────────────────

  const createUser = async (overrides: Partial<any> = {}) => {
    const user = await User.create({
      phone: overrides.phone ?? randomPhone(),
      displayName: overrides.displayName ?? 'Test Citizen',
      role: overrides.role ?? UserRole.CITIZEN,
      isNidVerified: overrides.isNidVerified ?? true,
      kycStatus: overrides.kycStatus ?? KycStatus.VERIFIED,
      deviceUUIDs: ['device-1'],
      activeDeviceCount: 1,
      isBanned: overrides.isBanned ?? false,
      isFrozen: overrides.isFrozen ?? false,
      totalDealsCompleted: overrides.totalDealsCompleted ?? 0,
      averageRating: overrides.averageRating ?? 0
    });
    const token = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      deviceId: 'device-1'
    });
    return { user, token };
  };

  const createListing = async (
    sellerId: mongoose.Types.ObjectId,
    price = 50000,
    status: ListingStatus = ListingStatus.ACTIVE
  ) => {
    return Listing.create({
      sellerId,
      title: 'Samsung Galaxy S24 Ultra 256GB',
      description: 'Like-new condition. Used for 2 months.',
      price,
      condition: ListingCondition.LIKE_NEW,
      category: ListingCategory.ELECTRONICS,
      location: {
        type: 'Point',
        coordinates: [90.3742, 23.7461],
        division: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://cdn.becha-kena.com/listings/s24u_1.webp'],
      status,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  const createAcceptedOffer = async (
    listingId: mongoose.Types.ObjectId,
    sellerId: mongoose.Types.ObjectId,
    buyerId: mongoose.Types.ObjectId,
    amount = 45000
  ) => {
    const conversation = await Conversation.create({ listingId, buyerId, sellerId });
    const offer = await Offer.create({
      conversationId: conversation._id,
      listingId,
      buyerId,
      sellerId,
      amount,
      status: OfferStatus.ACCEPTED,
      round: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    return { conversation, offer };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 9.1 — Atomic Deal Closure from Accepted Offer (POST /api/v1/deals)
  // ─────────────────────────────────────────────────────────────────────────

  describe('9.1 — Atomic Deal Closure from Accepted Offer (POST /api/v1/deals)', () => {
    it('should reject if offer is not in accepted status', async () => {
      const { user: seller, token: sellerToken } = await createUser({ displayName: 'Seller' });
      const { user: buyer } = await createUser({ displayName: 'Buyer' });
      const listing = await createListing(seller._id);
      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id
      });
      const offer = await Offer.create({
        conversationId: conversation._id,
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        amount: 45000,
        status: OfferStatus.PENDING,
        round: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ offerId: offer._id.toString() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.OFFER_ALREADY_RESOLVED);
    });

    it('should reject if caller is not the offer seller', async () => {
      const { user: seller } = await createUser({ displayName: 'Seller' });
      const { user: buyer, token: buyerToken } = await createUser({ displayName: 'Buyer' });
      const listing = await createListing(seller._id);
      const { offer } = await createAcceptedOffer(listing._id, seller._id, buyer._id);

      const res = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ offerId: offer._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_DEAL_ACTION);
    });

    it('should atomically close deal: listing→sold, deal created, totalDealsCompleted incremented, competing offers declined', async () => {
      const { user: seller, token: sellerToken } = await createUser({ displayName: 'Seller Rahim' });
      const { user: buyer } = await createUser({ displayName: 'Buyer Karim' });
      const { user: otherBuyer } = await createUser({ displayName: 'Other Buyer Jamal' });
      const listing = await createListing(seller._id);

      // Accepted offer from main buyer
      const { offer: acceptedOffer } = await createAcceptedOffer(
        listing._id, seller._id, buyer._id, 45000
      );

      // Competing pending offer from another buyer
      const conv2 = await Conversation.create({
        listingId: listing._id,
        buyerId: otherBuyer._id,
        sellerId: seller._id
      });
      const competingOffer = await Offer.create({
        conversationId: conv2._id,
        listingId: listing._id,
        buyerId: otherBuyer._id,
        sellerId: seller._id,
        amount: 42000,
        status: OfferStatus.PENDING,
        round: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ offerId: acceptedOffer._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        finalPrice: 45000,
        sellerId: seller._id.toString(),
        buyerId: buyer._id.toString()
      });

      // Listing must now be SOLD
      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing!.status).toBe(ListingStatus.SOLD);

      // Deal document exists
      const deal = await Deal.findOne({ listingId: listing._id });
      expect(deal).toBeTruthy();
      expect(deal!.finalPrice).toBe(45000);

      // Both users' totalDealsCompleted incremented
      const updatedSeller = await User.findById(seller._id);
      const updatedBuyer = await User.findById(buyer._id);
      expect(updatedSeller!.totalDealsCompleted).toBe(1);
      expect(updatedBuyer!.totalDealsCompleted).toBe(1);

      // Competing pending offer declined
      const declinedOffer = await Offer.findById(competingOffer._id);
      expect(declinedOffer!.status).toBe(OfferStatus.DECLINED);
    });

    it('should reject with 409 DEAL_ALREADY_CLOSED if listing already sold', async () => {
      const { user: seller, token: sellerToken } = await createUser({ displayName: 'Seller' });
      const { user: buyer } = await createUser({ displayName: 'Buyer' });
      // Listing already in SOLD status
      const listing = await createListing(seller._id, 50000, ListingStatus.SOLD);
      const { offer } = await createAcceptedOffer(listing._id, seller._id, buyer._id);

      const res = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ offerId: offer._id.toString() });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.DEAL_ALREADY_CLOSED);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9.2 — Direct Sale Deal Closure (POST /api/v1/deals/direct-sale)
  // ─────────────────────────────────────────────────────────────────────────

  describe('9.2 — Direct Sale Deal Closure (POST /api/v1/deals/direct-sale)', () => {
    it('should reject if no active conversation exists between seller and buyer', async () => {
      const { user: seller, token: sellerToken } = await createUser({ displayName: 'Seller' });
      const { user: buyer } = await createUser({ displayName: 'Buyer' });
      const listing = await createListing(seller._id);
      // No conversation created

      const res = await request(app)
        .post('/api/v1/deals/direct-sale')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          listingId: listing._id.toString(),
          buyerId: buyer._id.toString(),
          finalPrice: 45000
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.CONVERSATION_NOT_FOUND);
    });

    it('should reject if caller is not the listing owner', async () => {
      const { user: seller } = await createUser({ displayName: 'Real Seller' });
      const { user: buyer } = await createUser({ displayName: 'Buyer' });
      const { user: stranger, token: strangerToken } = await createUser({ displayName: 'Stranger' });
      const listing = await createListing(seller._id);
      await Conversation.create({ listingId: listing._id, buyerId: buyer._id, sellerId: seller._id });

      const res = await request(app)
        .post('/api/v1/deals/direct-sale')
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({
          listingId: listing._id.toString(),
          buyerId: buyer._id.toString(),
          finalPrice: 45000
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_DEAL_ACTION);
    });

    it('should reject if finalPrice is below minimum (50 BDT)', async () => {
      const { user: seller, token: sellerToken } = await createUser({ displayName: 'Seller' });
      const { user: buyer } = await createUser({ displayName: 'Buyer' });
      const listing = await createListing(seller._id);
      await Conversation.create({ listingId: listing._id, buyerId: buyer._id, sellerId: seller._id });

      const res = await request(app)
        .post('/api/v1/deals/direct-sale')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          listingId: listing._id.toString(),
          buyerId: buyer._id.toString(),
          finalPrice: 10 // below 50 BDT minimum
        });

      expect(res.status).toBe(400);
    });

    it('should successfully create a direct-sale deal with offerId null', async () => {
      const { user: seller, token: sellerToken } = await createUser({ displayName: 'Seller Rahim' });
      const { user: buyer } = await createUser({ displayName: 'Buyer Karim' });
      const listing = await createListing(seller._id);
      await Conversation.create({ listingId: listing._id, buyerId: buyer._id, sellerId: seller._id });

      const res = await request(app)
        .post('/api/v1/deals/direct-sale')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          listingId: listing._id.toString(),
          buyerId: buyer._id.toString(),
          finalPrice: 48000
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.finalPrice).toBe(48000);

      // Deal should have offerId as null
      const deal = await Deal.findOne({ listingId: listing._id });
      expect(deal).toBeTruthy();
      expect(deal!.offerId).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9.3 — Get Deal Receipt (GET /api/v1/deals/:dealId)
  // ─────────────────────────────────────────────────────────────────────────

  describe('9.3 — Get Deal Receipt (GET /api/v1/deals/:dealId)', () => {
    const setupDeal = async () => {
      const { user: seller, token: sellerToken } = await createUser({ displayName: 'Seller Rahim' });
      const { user: buyer, token: buyerToken } = await createUser({ displayName: 'Buyer Karim' });
      const listing = await createListing(seller._id);

      const [deal] = await Deal.create([{
        listingId: listing._id,
        offerId: null,
        sellerId: seller._id,
        buyerId: buyer._id,
        finalPrice: 46000
      }]);

      return { seller, sellerToken, buyer, buyerToken, listing, deal };
    };

    it('should return 403 for a user who is not a deal participant', async () => {
      const { deal } = await setupDeal();
      const { token: strangerToken } = await createUser({ displayName: 'Stranger' });

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_DEAL_ACTION);
    });

    it('should return populated deal receipt for the seller', async () => {
      const { sellerToken, seller, buyer, listing, deal } = await setupDeal();

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.dealId).toBe(deal._id.toString());
      expect(data.finalPrice).toBe(46000);
      expect(data.listing.title).toBe('Samsung Galaxy S24 Ultra 256GB');
      expect(data.seller.userId).toBe(seller._id.toString());
      expect(data.seller.displayName).toBe('Seller Rahim');
      expect(data.buyer.userId).toBe(buyer._id.toString());
      expect(data.buyer.displayName).toBe('Buyer Karim');
      expect(data.isReviewedBySeller).toBe(false);
      expect(data.isReviewedByBuyer).toBe(false);
    });

    it('should return populated deal receipt for the buyer', async () => {
      const { buyerToken, deal } = await setupDeal();

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.dealId).toBe(deal._id.toString());
    });

    it('should return 404 for invalid/unknown dealId', async () => {
      const { sellerToken } = await setupDeal();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/v1/deals/${fakeId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.DEAL_NOT_FOUND);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9.4 — Submit Review (POST /api/v1/deals/:dealId/reviews)
  // ─────────────────────────────────────────────────────────────────────────

  describe('9.4 — Submit Review (POST /api/v1/deals/:dealId/reviews)', () => {
    const setupReviewDeal = async (completedAtOffset = 0) => {
      const { user: seller, token: sellerToken } = await createUser({
        displayName: 'Seller Rahim',
        totalDealsCompleted: 1
      });
      const { user: buyer, token: buyerToken } = await createUser({
        displayName: 'Buyer Karim',
        totalDealsCompleted: 1
      });
      const listing = await createListing(seller._id);

      const completedAt = new Date(Date.now() + completedAtOffset);
      const [deal] = await Deal.create([{
        listingId: listing._id,
        offerId: null,
        sellerId: seller._id,
        buyerId: buyer._id,
        finalPrice: 46000,
        completedAt
      }]);

      return { seller, sellerToken, buyer, buyerToken, listing, deal };
    };

    it('should reject non-participant (stranger) with 403', async () => {
      const { deal } = await setupReviewDeal();
      const { token: strangerToken } = await createUser({ displayName: 'Stranger' });

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/reviews`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ rating: 4, tags: [], comment: 'Good.' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_DEAL_ACTION);
    });

    it('should reject duplicate review with 409 ALREADY_REVIEWED', async () => {
      const { seller, buyerToken, deal } = await setupReviewDeal();

      // Mark deal as already reviewed by buyer
      await Deal.findByIdAndUpdate(deal._id, { $set: { isReviewedByBuyer: true } });

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 5, tags: [], comment: 'Great seller!' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.ALREADY_REVIEWED);
    });

    it('should reject if 48-hour review window has expired', async () => {
      // completedAt is 49 hours in the past
      const { buyerToken, deal } = await setupReviewDeal(-49 * 60 * 60 * 1000);

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 3, tags: [], comment: 'Expired window.' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.REVIEW_WINDOW_EXPIRED);
    });

    it('buyer reviews seller: creates review, sets isReviewedByBuyer=true, updates seller averageRating', async () => {
      const { seller, buyerToken, deal } = await setupReviewDeal();

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 5, tags: ['punctual', 'friendly_communication'], comment: 'Excellent seller!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.tags).toContain('punctual');

      // Deal flag updated
      const updatedDeal = await Deal.findById(deal._id);
      expect(updatedDeal!.isReviewedByBuyer).toBe(true);
      expect(updatedDeal!.isReviewedBySeller).toBe(false);

      // Review document exists
      const review = await Review.findOne({ dealId: deal._id });
      expect(review).toBeTruthy();
      expect(review!.revieweeId.toString()).toBe(seller._id.toString());

      // Seller's averageRating updated
      const updatedSeller = await User.findById(seller._id);
      expect(updatedSeller!.averageRating).toBeGreaterThan(0);
    });

    it('seller reviews buyer: creates review, sets isReviewedBySeller=true', async () => {
      const { buyer, sellerToken, deal } = await setupReviewDeal();

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/reviews`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ rating: 4, tags: ['quick_payment'], comment: 'Paid promptly!' });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(4);

      const updatedDeal = await Deal.findById(deal._id);
      expect(updatedDeal!.isReviewedBySeller).toBe(true);
      expect(updatedDeal!.isReviewedByBuyer).toBe(false);

      const review = await Review.findOne({ dealId: deal._id });
      expect(review!.revieweeId.toString()).toBe(buyer._id.toString());
    });

    it('should reject invalid rating (out of 1-5 range)', async () => {
      const { buyerToken, deal } = await setupReviewDeal();

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ rating: 6, tags: [], comment: 'Invalid.' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9.5 — Get User Reviews (GET /api/v1/users/:userId/reviews)
  // ─────────────────────────────────────────────────────────────────────────

  describe('9.5 — Get User Reviews (GET /api/v1/users/:userId/reviews)', () => {
    it('should be publicly accessible without authentication', async () => {
      const { user: reviewee } = await createUser({ displayName: 'Reviewed User' });

      const res = await request(app)
        .get(`/api/v1/users/${reviewee._id}/reviews`);
      // No auth header at all — should not get 401

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return reviews with reviewer display name and listing title', async () => {
      const { user: reviewer } = await createUser({ displayName: 'Reviewer Rahim', totalDealsCompleted: 1 });
      const { user: reviewee } = await createUser({ displayName: 'Reviewee Karim', totalDealsCompleted: 1 });
      const listing = await createListing(reviewee._id, 40000);

      const [deal] = await Deal.create([{
        listingId: listing._id,
        offerId: null,
        sellerId: reviewee._id,
        buyerId: reviewer._id,
        finalPrice: 40000
      }]);

      await Review.create({
        dealId: deal._id,
        listingId: listing._id,
        reviewerId: reviewer._id,
        revieweeId: reviewee._id,
        rating: 5,
        tags: ['item_as_described'],
        comment: 'Perfect condition!'
      });

      const res = await request(app)
        .get(`/api/v1/users/${reviewee._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      const r = res.body.data[0];
      expect(r.reviewer.displayName).toBe('Reviewer Rahim');
      expect(r.listing.title).toBe('Samsung Galaxy S24 Ultra 256GB');
      expect(r.rating).toBe(5);
    });

    it('should return meta with averageRating and totalReviews', async () => {
      const { user: reviewer1 } = await createUser({ displayName: 'Reviewer 1', totalDealsCompleted: 1 });
      const { user: reviewer2 } = await createUser({ displayName: 'Reviewer 2', totalDealsCompleted: 1 });
      const { user: reviewee } = await createUser({
        displayName: 'Reviewee',
        averageRating: 4.5,
        totalDealsCompleted: 2
      });
      const listing = await createListing(reviewee._id, 30000);

      const [deal1] = await Deal.create([{
        listingId: listing._id,
        offerId: null,
        sellerId: reviewee._id,
        buyerId: reviewer1._id,
        finalPrice: 30000
      }]);
      const [deal2] = await Deal.create([{
        listingId: new mongoose.Types.ObjectId(), // second listing ref (stub)
        offerId: null,
        sellerId: reviewee._id,
        buyerId: reviewer2._id,
        finalPrice: 28000
      }]);

      await Review.create([
        {
          dealId: deal1._id,
          listingId: listing._id,
          reviewerId: reviewer1._id,
          revieweeId: reviewee._id,
          rating: 4,
          tags: [],
          comment: null
        },
        {
          dealId: deal2._id,
          listingId: new mongoose.Types.ObjectId(),
          reviewerId: reviewer2._id,
          revieweeId: reviewee._id,
          rating: 5,
          tags: [],
          comment: null
        }
      ]);

      const res = await request(app)
        .get(`/api/v1/users/${reviewee._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({
        totalReviews: 2,
        averageRating: 4.5
      });
      expect(res.body.data).toHaveLength(2);
    });

    it('should paginate results correctly', async () => {
      const { user: reviewer } = await createUser({ displayName: 'Reviewer', totalDealsCompleted: 5 });
      const { user: reviewee } = await createUser({ displayName: 'Reviewee', totalDealsCompleted: 5 });

      // Create 5 reviews
      const reviewDocs = [];
      for (let i = 0; i < 5; i++) {
        const fakeListingId = new mongoose.Types.ObjectId();
        const fakeDealId = new mongoose.Types.ObjectId();
        reviewDocs.push({
          dealId: fakeDealId,
          listingId: fakeListingId,
          reviewerId: reviewer._id,
          revieweeId: reviewee._id,
          rating: (i % 5) + 1,
          tags: [],
          comment: `Review ${i + 1}`
        });
      }
      await Review.create(reviewDocs);

      const res = await request(app)
        .get(`/api/v1/users/${reviewee._id}/reviews?page=1&limit=3`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta.total).toBe(5);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should return empty array for user with no reviews', async () => {
      const { user: reviewee } = await createUser({ displayName: 'New User' });

      const res = await request(app)
        .get(`/api/v1/users/${reviewee._id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.totalReviews).toBe(0);
      expect(res.body.meta.averageRating).toBe(0);
    });
  });
});
