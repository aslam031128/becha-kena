import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { User, Listing, Conversation, Report } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  ModerationStatus,
  ReportEntityType,
  ReportReason,
  ReportStatus
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';

const randomPhone = () => `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;

describe('Phase 10: Community Reporting & Auto-Quarantine', () => {
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
    await Report.deleteMany({});
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
      title: 'Sony Alpha A7 IV Camera Body',
      description: 'Used camera body, pristine shutter count.',
      price: 180000,
      condition: ListingCondition.LIKE_NEW,
      category: ListingCategory.ELECTRONICS,
      location: {
        type: 'Point',
        coordinates: [90.3742, 23.7461],
        division: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://cdn.becha-kena.com/listings/sony_a7iv.webp'],
      status: ListingStatus.ACTIVE,
      moderationStatus: ModerationStatus.APPROVED,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  // ---------------------------------------------------------------------------
  // 10.1 — Submit Community Safety Report (POST /api/v1/reports)
  // ---------------------------------------------------------------------------

  describe('10.1 — Submit Community Safety Report (POST /api/v1/reports)', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: new mongoose.Types.ObjectId().toString(),
          reason: ReportReason.SCAM_ADVANCE_DEMANDED,
          details: 'Demanded advance via bKash'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should reject unverified citizen with 403 KYC_REQUIRED', async () => {
      const { token: unverifiedToken } = await createUser({ isNidVerified: false });
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: fakeId,
          reason: ReportReason.SCAM_ADVANCE_DEMANDED,
          details: 'Demanded courier fee advance'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_REQUIRED);
    });

    it('should reject frozen account with 403 ACCOUNT_FROZEN', async () => {
      const { token: frozenToken } = await createUser({ isFrozen: true });
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${frozenToken}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: fakeId,
          reason: ReportReason.SPAM,
          details: 'Spam listing content'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.ACCOUNT_FROZEN);
    });

    it('should reject invalid entityType with 400 VALIDATION_ERROR', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          entityType: 'invalid_type',
          entityId: new mongoose.Types.ObjectId().toString(),
          reason: ReportReason.SPAM,
          details: 'Spam content'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should reject self-reporting own user profile with 400 CANNOT_REPORT_SELF', async () => {
      const { user, token } = await createUser();

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          entityType: ReportEntityType.USER,
          entityId: user._id.toString(),
          reason: ReportReason.HARASSMENT,
          details: 'Trying to report myself'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.CANNOT_REPORT_SELF);
    });

    it('should reject self-reporting own listing with 400 CANNOT_REPORT_SELF', async () => {
      const { user, token } = await createUser();
      const listing = await createListing(user._id);

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.COUNTERFEIT,
          details: 'Reporting my own product'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.CANNOT_REPORT_SELF);
    });

    it('should reject reporting non-existent listing with 404', async () => {
      const { token } = await createUser();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: fakeId,
          reason: ReportReason.STOLEN_GOODS_SUSPECTED,
          details: 'Stolen gadget without IMEI'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.LISTING_NOT_FOUND);
    });

    it('should successfully submit a valid report for a listing', async () => {
      const { user: seller } = await createUser({ displayName: 'Seller Rahim' });
      const { token: reporterToken } = await createUser({ displayName: 'Citizen Karim' });
      const listing = await createListing(seller._id);

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.SCAM_ADVANCE_DEMANDED,
          details: 'Seller asked for 2,000 BDT advance via bKash.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        status: ReportStatus.PENDING
      });
      expect(res.body.data.reportId).toBeDefined();

      const savedReport = await Report.findById(res.body.data.reportId);
      expect(savedReport).toBeTruthy();
      expect(savedReport!.reason).toBe(ReportReason.SCAM_ADVANCE_DEMANDED);
    });

    it('should successfully submit a report for a user', async () => {
      const { user: targetUser } = await createUser({ displayName: 'Bad Actor' });
      const { token: reporterToken } = await createUser({ displayName: 'Citizen Karim' });

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          entityType: ReportEntityType.USER,
          entityId: targetUser._id.toString(),
          reason: ReportReason.HARASSMENT,
          details: 'User repeatedly sending abusive language in chat.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ReportStatus.PENDING);
    });

    it('should successfully submit a report for a conversation', async () => {
      const { user: seller } = await createUser({ displayName: 'Seller' });
      const { user: buyer, token: buyerToken } = await createUser({ displayName: 'Buyer' });
      const listing = await createListing(seller._id);
      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id
      });

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          entityType: ReportEntityType.CHAT,
          entityId: conversation._id.toString(),
          reason: ReportReason.SCAM_ADVANCE_DEMANDED,
          details: 'Demanded off-platform advance fee'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(ReportStatus.PENDING);
    });

    it('should reject duplicate pending report from the same citizen with 409 ALREADY_REPORTED', async () => {
      const { user: seller } = await createUser();
      const { token: reporterToken } = await createUser();
      const listing = await createListing(seller._id);

      // First report
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.COUNTERFEIT,
          details: 'Counterfeit camera lens'
        });

      // Second identical report while previous is pending
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.COUNTERFEIT,
          details: 'Counterfeit camera lens retry'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.ALREADY_REPORTED);
    });
  });

  // ---------------------------------------------------------------------------
  // 10.2 — Automated Listing Quarantine (Threshold >= 3 Reports)
  // ---------------------------------------------------------------------------

  describe('10.2 — Automated Listing Quarantine (Threshold >= 3 Reports)', () => {
    it('should not quarantine listing when pending reports < 3', async () => {
      const { user: seller } = await createUser({ displayName: 'Seller' });
      const { token: reporter1 } = await createUser({ displayName: 'Reporter 1' });
      const { token: reporter2 } = await createUser({ displayName: 'Reporter 2' });
      const listing = await createListing(seller._id);

      // Report 1
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporter1}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.SCAM_ADVANCE_DEMANDED,
          details: 'Scam report 1'
        });

      let updatedListing = await Listing.findById(listing._id);
      expect(updatedListing!.status).toBe(ListingStatus.ACTIVE);
      expect(updatedListing!.moderationStatus).toBe(ModerationStatus.APPROVED);

      // Report 2
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporter2}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.SCAM_ADVANCE_DEMANDED,
          details: 'Scam report 2'
        });

      updatedListing = await Listing.findById(listing._id);
      expect(updatedListing!.status).toBe(ListingStatus.ACTIVE);
      expect(updatedListing!.moderationStatus).toBe(ModerationStatus.APPROVED);
    });

    it('should automatically quarantine listing (status=under_review, moderationStatus=flagged) when 3rd report is submitted', async () => {
      const { user: seller } = await createUser({ displayName: 'Seller' });
      const { token: reporter1 } = await createUser({ displayName: 'Reporter 1' });
      const { token: reporter2 } = await createUser({ displayName: 'Reporter 2' });
      const { token: reporter3 } = await createUser({ displayName: 'Reporter 3' });
      const listing = await createListing(seller._id);

      // Report 1
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporter1}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.SCAM_ADVANCE_DEMANDED,
          details: 'First scam warning'
        });

      // Report 2
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporter2}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.STOLEN_GOODS_SUSPECTED,
          details: 'Serial number removed'
        });

      // Report 3 — triggers quarantine threshold
      const res3 = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporter3}`)
        .send({
          entityType: ReportEntityType.LISTING,
          entityId: listing._id.toString(),
          reason: ReportReason.COUNTERFEIT,
          details: 'Fake brand clone item'
        });

      expect(res3.status).toBe(201);

      // Listing must now be under_review and flagged
      const quarantinedListing = await Listing.findById(listing._id);
      expect(quarantinedListing!.status).toBe(ListingStatus.UNDER_REVIEW);
      expect(quarantinedListing!.moderationStatus).toBe(ModerationStatus.FLAGGED);
    });
  });

  // ---------------------------------------------------------------------------
  // 10.3 — View My Submitted Reports (GET /api/v1/reports/me)
  // ---------------------------------------------------------------------------

  describe('10.3 — View My Submitted Reports (GET /api/v1/reports/me)', () => {
    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/reports/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should return empty array when citizen has submitted no reports', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .get('/api/v1/reports/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return reports submitted by current user with resolution status', async () => {
      const { user: seller } = await createUser();
      const { user: reporter, token: reporterToken } = await createUser();
      const listing = await createListing(seller._id);

      const report1 = await Report.create({
        reporterId: reporter._id,
        entityType: ReportEntityType.LISTING,
        entityId: listing._id,
        reason: ReportReason.SCAM_ADVANCE_DEMANDED,
        details: 'Demanded advance payment via bKash.',
        status: ReportStatus.ACTIONED,
        resolvedAt: new Date()
      });

      const report2 = await Report.create({
        reporterId: reporter._id,
        entityType: ReportEntityType.USER,
        entityId: seller._id,
        reason: ReportReason.SPAM,
        details: 'Spamming inbox.',
        status: ReportStatus.PENDING
      });

      const res = await request(app)
        .get('/api/v1/reports/me')
        .set('Authorization', `Bearer ${reporterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);

      const foundReport1 = res.body.data.find((r: any) => r.reportId === report1._id.toString());
      expect(foundReport1).toBeDefined();
      expect(foundReport1.entityType).toBe(ReportEntityType.LISTING);
      expect(foundReport1.status).toBe(ReportStatus.ACTIONED);
      expect(foundReport1.resolvedAt).toBeDefined();

      const foundReport2 = res.body.data.find((r: any) => r.reportId === report2._id.toString());
      expect(foundReport2).toBeDefined();
      expect(foundReport2.status).toBe(ReportStatus.PENDING);
      expect(foundReport2.resolvedAt).toBeNull();
    });

    it('should only return reports submitted by the caller and not others', async () => {
      const { user: seller } = await createUser();
      const { user: citizen1, token: token1 } = await createUser();
      const { user: citizen2 } = await createUser();
      const listing = await createListing(seller._id);

      // Report by citizen 1
      await Report.create({
        reporterId: citizen1._id,
        entityType: ReportEntityType.LISTING,
        entityId: listing._id,
        reason: ReportReason.SPAM,
        details: 'Citizen 1 report',
        status: ReportStatus.PENDING
      });

      // Report by citizen 2
      await Report.create({
        reporterId: citizen2._id,
        entityType: ReportEntityType.LISTING,
        entityId: listing._id,
        reason: ReportReason.COUNTERFEIT,
        details: 'Citizen 2 report',
        status: ReportStatus.PENDING
      });

      const res = await request(app)
        .get('/api/v1/reports/me')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].details).toBe('Citizen 1 report');
    });
  });
});

