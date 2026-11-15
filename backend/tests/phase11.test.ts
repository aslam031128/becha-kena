import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { User, Listing, Deal, Dispute } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  DisputeStatus
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';

const randomPhone = () => `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;

describe('Phase 11: Post-Deal Legal Disputes (Bangladesh Police GD)', () => {
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
    await Deal.deleteMany({});
    await Dispute.deleteMany({});
  });

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
      isFrozen: overrides.isFrozen ?? false
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

  const createListing = async (sellerId: mongoose.Types.ObjectId) => {
    return Listing.create({
      sellerId,
      title: 'Apple iPhone 15 Pro 256GB Natural Titanium',
      description: 'Used for 2 months, boxed.',
      price: 125000,
      condition: ListingCondition.LIKE_NEW,
      category: ListingCategory.ELECTRONICS,
      location: {
        type: 'Point',
        coordinates: [90.3742, 23.7461],
        division: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://cdn.becha-kena.com/listings/iphone15pro.webp'],
      status: ListingStatus.SOLD,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  const setupCompletedDeal = async () => {
    const { user: seller, token: sellerToken } = await createUser({ displayName: 'Accused Seller' });
    const { user: buyer, token: buyerToken } = await createUser({ displayName: 'Victim Buyer' });
    const listing = await createListing(seller._id);

    const [deal] = await Deal.create([{
      listingId: listing._id,
      sellerId: seller._id,
      buyerId: buyer._id,
      finalPrice: 125000,
      disputeStatus: DisputeStatus.NONE
    }]);

    return { seller, sellerToken, buyer, buyerToken, listing, deal };
  };

  // ---------------------------------------------------------------------------
  // 11.1 — File Police GD Dispute (POST /api/v1/deals/:dealId/disputes)
  // ---------------------------------------------------------------------------

  describe('11.1 — File Police GD Dispute (POST /api/v1/deals/:dealId/disputes)', () => {
    const validGdPayload = {
      gdNumber: 'GD-2026-9812',
      thanaName: 'Dhanmondi Model Thana',
      gdFilingDate: '2026-10-23',
      gdDocumentUrl: 'https://cdn.becha-kena.com/disputes/gd_doc_stamped_9812.webp'
    };

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const { deal } = await setupCompletedDeal();

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .send(validGdPayload);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should reject unverified citizen with 403 KYC_REQUIRED', async () => {
      const { deal } = await setupCompletedDeal();
      const { token: unverifiedToken } = await createUser({ isNidVerified: false });

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send(validGdPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_REQUIRED);
    });

    it('should reject frozen account with 403 ACCOUNT_FROZEN', async () => {
      const { deal } = await setupCompletedDeal();
      const { token: frozenToken } = await createUser({ isFrozen: true });

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${frozenToken}`)
        .send(validGdPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.ACCOUNT_FROZEN);
    });

    it('should reject non-existent deal with 404 DEAL_NOT_FOUND', async () => {
      const { buyerToken } = await setupCompletedDeal();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/deals/${fakeId}/disputes`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validGdPayload);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.DEAL_NOT_FOUND);
    });

    it('should reject if caller is the seller with 403 UNAUTHORIZED_DISPUTE_ACTION', async () => {
      const { deal, sellerToken } = await setupCompletedDeal();

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(validGdPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_DISPUTE_ACTION);
    });

    it('should reject if caller is a stranger (not deal buyer) with 403', async () => {
      const { deal } = await setupCompletedDeal();
      const { token: strangerToken } = await createUser({ displayName: 'Stranger' });

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send(validGdPayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_DISPUTE_ACTION);
    });

    it('should reject invalid or future GD filing date with 400', async () => {
      const { deal, buyerToken } = await setupCompletedDeal();

      // Future date
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          ...validGdPayload,
          gdFilingDate: futureDate
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should successfully file GD dispute: freeze seller, update deal disputeStatus to filed, create Dispute', async () => {
      const { deal, buyer, seller, buyerToken } = await setupCompletedDeal();

      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validGdPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        dealId: deal._id.toString(),
        status: 'pending',
        sellerFrozen: true
      });
      expect(res.body.data.disputeId).toBeDefined();

      // 1. Check seller is now frozen
      const updatedSeller = await User.findById(seller._id);
      expect(updatedSeller!.isFrozen).toBe(true);

      // 2. Check deal is updated
      const updatedDeal = await Deal.findById(deal._id);
      expect(updatedDeal!.disputeStatus).toBe(DisputeStatus.FILED);
      expect(updatedDeal!.disputeId!.toString()).toBe(res.body.data.disputeId);

      // 3. Check dispute record in DB
      const dispute = await Dispute.findById(res.body.data.disputeId);
      expect(dispute).toBeTruthy();
      expect(dispute!.buyerId.toString()).toBe(buyer._id.toString());
      expect(dispute!.sellerId.toString()).toBe(seller._id.toString());
      expect(dispute!.gdNumber).toBe('GD-2026-9812');
      expect(dispute!.thanaName).toBe('Dhanmondi Model Thana');
    });

    it('should reject filing a second dispute on the same deal with 409 DISPUTE_ALREADY_EXISTS', async () => {
      const { deal, buyerToken } = await setupCompletedDeal();

      // First dispute
      await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validGdPayload);

      // Second attempt on same deal
      const res = await request(app)
        .post(`/api/v1/deals/${deal._id}/disputes`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          ...validGdPayload,
          gdNumber: 'GD-2026-9999'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.DISPUTE_ALREADY_EXISTS);
    });
  });

  // ---------------------------------------------------------------------------
  // 11.2 — Get Active Dispute Status (GET /api/v1/deals/:dealId/dispute)
  // ---------------------------------------------------------------------------

  describe('11.2 — Get Active Dispute Status (GET /api/v1/deals/:dealId/dispute)', () => {
    const setupDisputedDeal = async () => {
      const { seller, sellerToken, buyer, buyerToken, listing, deal } = await setupCompletedDeal();

      const [dispute] = await Dispute.create([{
        dealId: deal._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        gdNumber: 'GD-2026-9812',
        thanaName: 'Dhanmondi Model Thana',
        gdFilingDate: new Date('2026-10-23'),
        gdDocumentUrl: 'https://cdn.becha-kena.com/disputes/gd_doc_stamped_9812.webp',
        status: 'pending'
      }]);

      await Deal.findByIdAndUpdate(deal._id, {
        $set: { disputeStatus: DisputeStatus.FILED, disputeId: dispute._id }
      });

      return { seller, sellerToken, buyer, buyerToken, listing, deal, dispute };
    };

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const { deal } = await setupDisputedDeal();

      const res = await request(app).get(`/api/v1/deals/${deal._id}/dispute`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should reject stranger with 403 UNAUTHORIZED_DISPUTE_ACTION', async () => {
      const { deal } = await setupDisputedDeal();
      const { token: strangerToken } = await createUser({ displayName: 'Stranger' });

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}/dispute`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_DISPUTE_ACTION);
    });

    it('should allow buyer to retrieve active dispute details with 200 OK', async () => {
      const { deal, buyerToken, dispute } = await setupDisputedDeal();

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}/dispute`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        disputeId: dispute._id.toString(),
        dealId: deal._id.toString(),
        gdNumber: 'GD-2026-9812',
        thanaName: 'Dhanmondi Model Thana',
        status: 'pending'
      });
    });

    it('should allow seller to retrieve active dispute details with 200 OK', async () => {
      const { deal, sellerToken, dispute } = await setupDisputedDeal();

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}/dispute`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.disputeId).toBe(dispute._id.toString());
    });

    it('should allow moderator to retrieve dispute details with 200 OK', async () => {
      const { deal, dispute } = await setupDisputedDeal();
      const { token: modToken } = await createUser({
        displayName: 'Trust Moderator',
        role: UserRole.MODERATOR
      });

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}/dispute`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.disputeId).toBe(dispute._id.toString());
    });

    it('should return 404 DISPUTE_NOT_FOUND if deal has no dispute filed', async () => {
      const { deal, buyerToken } = await setupCompletedDeal(); // no dispute created

      const res = await request(app)
        .get(`/api/v1/deals/${deal._id}/dispute`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.DISPUTE_NOT_FOUND);
    });
  });
});

