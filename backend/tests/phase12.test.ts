import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import {
  User,
  Listing,
  Report,
  Dispute,
  Deal,
  NidBlacklist,
  PhoneRevealAudit
} from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  ModerationStatus,
  ReportEntityType,
  ReportReason,
  ReportStatus,
  DisputeStatus,
  DisputeResolution
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';

const randomPhone = () => `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;

describe('Phase 12: Admin Moderation & Dual-Approval Ban System', () => {
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
    await Report.deleteMany({});
    await Dispute.deleteMany({});
    await Deal.deleteMany({});
    await NidBlacklist.deleteMany({});
    await PhoneRevealAudit.deleteMany({});
  });

  const createUser = async (overrides: Partial<any> = {}) => {
    const user = await User.create({
      phone: overrides.phone ?? randomPhone(),
      displayName: overrides.displayName ?? 'Test User',
      role: overrides.role ?? UserRole.CITIZEN,
      isNidVerified: overrides.isNidVerified ?? true,
      kycStatus: overrides.kycStatus ?? KycStatus.VERIFIED,
      deviceUUIDs: overrides.deviceUUIDs ?? ['device-uuid-1'],
      activeDeviceCount: 1,
      isBanned: overrides.isBanned ?? false,
      isFrozen: overrides.isFrozen ?? false,
      banProposedBy: overrides.banProposedBy ?? null,
      banReason: overrides.banReason ?? null,
      ...(overrides.nidHash ? { nidHash: overrides.nidHash } : {})
    });
    const token = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      deviceId: 'device-uuid-1'
    });
    return { user, token };
  };

  const createListing = async (sellerId: mongoose.Types.ObjectId, overrides: Partial<any> = {}) => {
    return Listing.create({
      sellerId,
      title: overrides.title ?? 'MacBook Pro M3 Max 36GB RAM',
      description: 'Used laptop in excellent shape.',
      price: overrides.price ?? 280000,
      condition: ListingCondition.LIKE_NEW,
      category: ListingCategory.ELECTRONICS,
      location: {
        type: 'Point',
        coordinates: [90.3742, 23.7461],
        division: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://cdn.becha-kena.com/listings/macbook.webp'],
      status: overrides.status ?? ListingStatus.ACTIVE,
      moderationStatus: overrides.moderationStatus ?? ModerationStatus.APPROVED,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  // ---------------------------------------------------------------------------
  // 12.1 — RBAC Enforcement on Admin Routes
  // ---------------------------------------------------------------------------

  describe('12.1 — RBAC Enforcement on Admin Routes', () => {
    it('should reject unauthenticated caller with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/kyc/queue');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should reject standard citizen with 403 FORBIDDEN', async () => {
      const { token: citizenToken } = await createUser({ role: UserRole.CITIZEN });

      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should reject Moderator from Super Admin only routes with 403 FORBIDDEN', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/v1/admin/users/${fakeId}/confirm-ban`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should allow Moderator on moderator routes', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });

      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow Super Admin on all routes', async () => {
      const { token: adminToken } = await createUser({ role: UserRole.SUPER_ADMIN });

      const res = await request(app)
        .get('/api/v1/admin/audits/phone-reveals')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 12.2 — Manual KYC Review Queue & Decisions
  // ---------------------------------------------------------------------------

  describe('12.2 — Manual KYC Review Queue & Decisions', () => {
    it('should retrieve pending manual_review queue with SLA aging calculations', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });

      // Create users with manual_review status and different submission timestamps
      const twoHoursAgo = new Date(Date.now() - 2.5 * 3600 * 1000);
      const fiveHoursAgo = new Date(Date.now() - 5.1 * 3600 * 1000);

      const u1 = await User.create({
        phone: '+8801711112233',
        displayName: 'Citizen Two Hours',
        kycStatus: KycStatus.MANUAL_REVIEW,
        kycAttempts: 3,
        deviceUUIDs: ['dev-1']
      });
      const u2 = await User.create({
        phone: '+8801744445566',
        displayName: 'Citizen Five Hours Breached',
        kycStatus: KycStatus.MANUAL_REVIEW,
        kycAttempts: 3,
        deviceUUIDs: ['dev-2']
      });

      await User.collection.updateOne(
        { _id: u1._id },
        { $set: { updatedAt: twoHoursAgo, createdAt: twoHoursAgo } }
      );
      await User.collection.updateOne(
        { _id: u2._id },
        { $set: { updatedAt: fiveHoursAgo, createdAt: fiveHoursAgo } }
      );

      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);

      const breachedUser = res.body.data.find((u: any) => u.phone === '+8801744445566');
      expect(breachedUser).toBeDefined();
      expect(breachedUser.slaStatus).toBe('breached');
      expect(breachedUser.slaAgingHours).toBeGreaterThanOrEqual(4);

      const warningUser = res.body.data.find((u: any) => u.phone === '+8801711112233');
      expect(warningUser).toBeDefined();
      expect(warningUser.slaStatus).toBe('warning');
    });

    it('should allow moderator to approve manual KYC review (PATCH /approve)', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const { user: unverifiedUser } = await createUser({
        isNidVerified: false,
        kycStatus: KycStatus.MANUAL_REVIEW
      });

      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${unverifiedUser._id}/approve`)
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isNidVerified).toBe(true);
      expect(res.body.data.kycStatus).toBe(KycStatus.VERIFIED);

      const updated = await User.findById(unverifiedUser._id);
      expect(updated!.isNidVerified).toBe(true);
      expect(updated!.kycStatus).toBe(KycStatus.VERIFIED);
    });

    it('should allow moderator to reject manual KYC review (PATCH /reject)', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const { user: unverifiedUser } = await createUser({
        isNidVerified: false,
        kycStatus: KycStatus.MANUAL_REVIEW
      });

      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${unverifiedUser._id}/reject`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ reason: 'Selfie is blurry' });

      expect(res.status).toBe(200);
      expect(res.body.data.kycStatus).toBe(KycStatus.RETAKE_REQUIRED);

      const updated = await User.findById(unverifiedUser._id);
      expect(updated!.kycStatus).toBe(KycStatus.RETAKE_REQUIRED);
    });
  });

  // ---------------------------------------------------------------------------
  // 12.3 — Community Reports Triage
  // ---------------------------------------------------------------------------

  describe('12.3 — Community Reports Triage', () => {
    it('should list all reports with reporter info (GET /reports)', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const { user: reporter } = await createUser({ displayName: 'Reporter Citizen' });
      const { user: seller } = await createUser();
      const listing = await createListing(seller._id);

      await Report.create({
        reporterId: reporter._id,
        entityType: ReportEntityType.LISTING,
        entityId: listing._id,
        reason: ReportReason.SCAM_ADVANCE_DEMANDED,
        details: 'Demanded courier advance payment',
        status: ReportStatus.PENDING
      });

      const res = await request(app)
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].reporterName).toBe('Reporter Citizen');
      expect(res.body.data[0].status).toBe(ReportStatus.PENDING);
    });

    it('should quarantine listing when action="quarantine" is applied', async () => {
      const { user: mod, token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const { user: reporter } = await createUser();
      const { user: seller } = await createUser();
      const listing = await createListing(seller._id);

      const report = await Report.create({
        reporterId: reporter._id,
        entityType: ReportEntityType.LISTING,
        entityId: listing._id,
        reason: ReportReason.SCAM_ADVANCE_DEMANDED,
        details: 'Scam listing evidence confirmed',
        status: ReportStatus.PENDING
      });

      const res = await request(app)
        .patch(`/api/v1/admin/reports/${report._id}/action`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ action: 'quarantine', notes: 'Quarantining fraudulent ad' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ReportStatus.ACTIONED);

      // Verify listing is quarantined
      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing!.status).toBe(ListingStatus.UNDER_REVIEW);
      expect(updatedListing!.moderationStatus).toBe(ModerationStatus.FLAGGED);

      // Verify report is marked actioned and reviewedBy is set
      const updatedReport = await Report.findById(report._id);
      expect(updatedReport!.status).toBe(ReportStatus.ACTIONED);
      expect(updatedReport!.reviewedBy!.toString()).toBe(mod._id.toString());
      expect(updatedReport!.resolvedAt).toBeDefined();
    });

    it('should dismiss report when action="dismiss" is applied', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const { user: reporter } = await createUser();
      const { user: seller } = await createUser();
      const listing = await createListing(seller._id);

      const report = await Report.create({
        reporterId: reporter._id,
        entityType: ReportEntityType.LISTING,
        entityId: listing._id,
        reason: ReportReason.SPAM,
        details: 'False spam claim',
        status: ReportStatus.PENDING
      });

      const res = await request(app)
        .patch(`/api/v1/admin/reports/${report._id}/action`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ action: 'dismiss' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ReportStatus.DISMISSED);

      const updated = await Report.findById(report._id);
      expect(updated!.status).toBe(ReportStatus.DISMISSED);
    });
  });

  // ---------------------------------------------------------------------------
  // 12.4 — Dispute Resolution by Super Admin
  // ---------------------------------------------------------------------------

  describe('12.4 — Dispute Resolution by Super Admin', () => {
    const setupDisputeFixture = async () => {
      const { user: seller } = await createUser({ displayName: 'Seller' });
      const { user: buyer } = await createUser({ displayName: 'Buyer' });
      const listing = await createListing(seller._id);

      const [deal] = await Deal.create([{
        listingId: listing._id,
        sellerId: seller._id,
        buyerId: buyer._id,
        finalPrice: 125000,
        disputeStatus: DisputeStatus.FILED
      }]);

      const [dispute] = await Dispute.create([{
        dealId: deal._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        gdNumber: 'GD-2026-9812',
        thanaName: 'Dhanmondi Model Thana',
        gdFilingDate: new Date('2026-10-23'),
        gdDocumentUrl: 'https://cdn.becha-kena.com/disputes/gd_doc_9812.webp',
        status: 'pending'
      }]);

      return { seller, buyer, listing, deal, dispute };
    };

    it('should list all active disputes (GET /admin/disputes)', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });
      await setupDisputeFixture();

      const res = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${modToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].gdNumber).toBe('GD-2026-9812');
    });

    it('should resolve dispute with seller_banned: ban seller, archive listings, blacklist NID', async () => {
      const { token: adminToken } = await createUser({ role: UserRole.SUPER_ADMIN });
      const { seller, deal, dispute } = await setupDisputeFixture();

      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${dispute._id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolutionAction: DisputeResolution.SELLER_BANNED });

      expect(res.status).toBe(200);
      expect(res.body.data.resolutionAction).toBe(DisputeResolution.SELLER_BANNED);
      expect(res.body.data.status).toBe('verified');

      // Verify seller is banned
      const bannedSeller = await User.findById(seller._id);
      expect(bannedSeller!.isBanned).toBe(true);
      expect(bannedSeller!.bannedAt).toBeDefined();

      // Verify blacklisted in NidBlacklist
      const blacklistEntry = await NidBlacklist.findOne({ phone: seller.phone });
      expect(blacklistEntry).toBeTruthy();

      // Verify listings archived
      const listings = await Listing.find({ sellerId: seller._id });
      expect(listings.every((l) => l.status === ListingStatus.ARCHIVED)).toBe(true);

      // Verify deal is marked resolved
      const updatedDeal = await Deal.findById(deal._id);
      expect(updatedDeal!.disputeStatus).toBe(DisputeStatus.RESOLVED);
    });

    it('should resolve dispute with claim_dismissed: unfreeze seller', async () => {
      const { token: adminToken } = await createUser({ role: UserRole.SUPER_ADMIN });
      const { seller, dispute } = await setupDisputeFixture();

      // Initially frozen due to dispute
      await User.findByIdAndUpdate(seller._id, { isFrozen: true });

      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${dispute._id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolutionAction: DisputeResolution.CLAIM_DISMISSED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');

      // Seller should be unfrozen
      const unfrozenSeller = await User.findById(seller._id);
      expect(unfrozenSeller!.isFrozen).toBe(false);
    });

    it('should resolve dispute with legal_hold: maintain frozen status', async () => {
      const { token: adminToken } = await createUser({ role: UserRole.SUPER_ADMIN });
      const { seller, dispute } = await setupDisputeFixture();

      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${dispute._id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolutionAction: DisputeResolution.LEGAL_HOLD });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('escalated_to_police');

      const heldSeller = await User.findById(seller._id);
      expect(heldSeller!.isFrozen).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 12.5 — Dual-Approval Citizen Ban System
  // ---------------------------------------------------------------------------

  describe('12.5 — Dual-Approval Citizen Ban System', () => {
    it('Step 1: Moderator proposes ban, setting banProposedBy without finalizing ban', async () => {
      const { user: mod, token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const { user: targetCitizen } = await createUser({ displayName: 'Target Scammer' });

      const res = await request(app)
        .post(`/api/v1/admin/users/${targetCitizen._id}/propose-ban`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ reason: 'Confirmed serial scammer in chat logs' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        userId: targetCitizen._id.toString(),
        banProposedBy: mod._id.toString(),
        status: 'BAN_PROPOSED'
      });

      const updated = await User.findById(targetCitizen._id);
      expect(updated!.isBanned).toBe(false); // Crucial: Not yet banned!
      expect(updated!.banProposedBy!.toString()).toBe(mod._id.toString());
      expect(updated!.banReason).toBe('Confirmed serial scammer in chat logs');
    });

    it('Step 2 rejection: Super Admin cannot confirm ban if ban was not proposed first', async () => {
      const { token: adminToken } = await createUser({ role: UserRole.SUPER_ADMIN });
      const { user: unproposedUser } = await createUser({ displayName: 'Clean Citizen' });

      const res = await request(app)
        .post(`/api/v1/admin/users/${unproposedUser._id}/confirm-ban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.BAN_PROPOSAL_REQUIRED);
    });

    it('Step 2 success: Super Admin confirms proposed ban: finalizes ban, archives ads, commits blacklist', async () => {
      const { user: mod } = await createUser({ role: UserRole.MODERATOR });
      const { token: adminToken } = await createUser({ role: UserRole.SUPER_ADMIN });
      const { user: scammer } = await createUser({
        displayName: 'Scammer Target',
        banProposedBy: mod._id,
        banReason: 'Scam confirmed by moderator',
        nidHash: 'hash-scammer-nid-12345678',
        deviceUUIDs: ['scammer-device-uuid']
      });

      // Active listing owned by scammer
      await createListing(scammer._id);

      const res = await request(app)
        .post(`/api/v1/admin/users/${scammer._id}/confirm-ban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isBanned).toBe(true);
      expect(res.body.data.blacklistedNidHash).toBe('hash-scammer-nid-12345678');
      expect(res.body.data.blacklistedPhone).toBe(scammer.phone);

      // Verify user is banned in DB
      const bannedUser = await User.findById(scammer._id);
      expect(bannedUser!.isBanned).toBe(true);
      expect(bannedUser!.bannedAt).toBeDefined();

      // Verify cryptographic blacklist
      const blacklist = await NidBlacklist.findOne({ phone: scammer.phone });
      expect(blacklist).toBeTruthy();
      expect(blacklist!.nidHash).toBe('hash-scammer-nid-12345678');

      // Verify listings archived
      const listings = await Listing.find({ sellerId: scammer._id });
      expect(listings.every((l) => l.status === ListingStatus.ARCHIVED)).toBe(true);
    });

    it('should reject proposing a ban on a Super Admin', async () => {
      const { token: modToken } = await createUser({ role: UserRole.MODERATOR });
      const { user: superAdmin } = await createUser({ role: UserRole.SUPER_ADMIN });

      const res = await request(app)
        .post(`/api/v1/admin/users/${superAdmin._id}/propose-ban`)
        .set('Authorization', `Bearer ${modToken}`)
        .send({ reason: 'Attempt to ban admin' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.CANNOT_BAN_ADMIN);
    });
  });

  // ---------------------------------------------------------------------------
  // 12.6 — Phone Reveal Scraping Bot Audits
  // ---------------------------------------------------------------------------

  describe('12.6 — Phone Reveal Scraping Bot Audits', () => {
    it('should aggregate reveal audit logs and flag scraping bots (> 8 reveals/day)', async () => {
      const { token: adminToken } = await createUser({ role: UserRole.SUPER_ADMIN });
      const { user: normalBuyer } = await createUser({ displayName: 'Normal Buyer' });
      const { user: botBuyer } = await createUser({ displayName: 'Bot Scraper' });
      const { user: seller } = await createUser();
      const listing = await createListing(seller._id);

      // Normal buyer: 2 reveals
      for (let i = 0; i < 2; i++) {
        await PhoneRevealAudit.create({
          buyerId: normalBuyer._id,
          listingId: listing._id,
          sellerId: seller._id,
          ipAddress: '103.14.24.5',
          createdAt: new Date()
        });
      }

      // Bot buyer: 9 reveals (> 8 threshold)
      for (let i = 0; i < 9; i++) {
        await PhoneRevealAudit.create({
          buyerId: botBuyer._id,
          listingId: listing._id,
          sellerId: seller._id,
          ipAddress: '103.14.24.99',
          createdAt: new Date()
        });
      }

      const res = await request(app)
        .get('/api/v1/admin/audits/phone-reveals')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const botEntry = res.body.data.find((e: any) => e.buyerId === botBuyer._id.toString());
      expect(botEntry).toBeDefined();
      expect(botEntry.revealCount).toBe(9);
      expect(botEntry.isAnomaly).toBe(true); // Flagged as anomaly

      const normalEntry = res.body.data.find((e: any) => e.buyerId === normalBuyer._id.toString());
      expect(normalEntry).toBeDefined();
      expect(normalEntry.revealCount).toBe(2);
      expect(normalEntry.isAnomaly).toBe(false);
    });
  });
});
