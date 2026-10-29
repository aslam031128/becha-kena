import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import argon2 from 'argon2';
import { createApp } from '../src/app.js';
import { getRedisClient } from '../src/config/redis.js';
import { User, NidBlacklist } from '../src/models/index.js';
import { UserRole, KycStatus } from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { computeNidHash } from '../src/utils/hmac.js';
import { decryptData } from '../src/utils/kms.js';
import { signAccessToken } from '../src/utils/token.js';
import { MockProvider } from '../src/services/kyc/MockProvider.js';
import { PorichoyProvider } from '../src/services/kyc/PorichoyProvider.js';
import { KYCProviderFactory, kycService } from '../src/services/kyc/KYCProviderFactory.js';
import { maskLegalName, maskPhone } from '../src/utils/mask.js';

describe('Phase 4: E-KYC Zero-Knowledge Identity Engine Specification', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Express;
  const redis = getRedisClient();

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
    await NidBlacklist.deleteMany({});
    kycService.reset();
  });

  // Helper to create a user and token
  const createUserAndToken = async (overrides: Partial<any> = {}) => {
    const user = await User.create({
      phone: overrides.phone || '+8801712345678',
      displayName: overrides.displayName || 'Test Citizen',
      role: overrides.role || UserRole.CITIZEN,
      isNidVerified: overrides.isNidVerified ?? false,
      kycStatus: overrides.kycStatus || KycStatus.UNVERIFIED,
      kycAttempts: overrides.kycAttempts || 0,
      deviceUUIDs: overrides.deviceUUIDs || ['device-initial-1'],
      activeDeviceCount: overrides.activeDeviceCount || 1,
      nidHash: overrides.nidHash,
      isFrozen: overrides.isFrozen ?? false,
      isBanned: overrides.isBanned ?? false
    });

    const token = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
      isNidVerified: user.isNidVerified,
      isFrozen: user.isFrozen,
      deviceId: user.deviceUUIDs[0] || 'device-initial-1'
    });

    return { user, token };
  };

  describe('4.1 & 4.2 — IKYCProvider Adapter Implementations', () => {
    it('MockProvider should extract OCR details successfully', async () => {
      const mock = new MockProvider();
      const res = await mock.extractOcr(Buffer.from('front'), Buffer.from('back'));
      expect(res.nidNumber).toBe('19942691234567890');
      expect(res.dob).toBe('1994-05-18');
      expect(res.extractedName).toBe('FARHANA RAHMAN');
    });

    it('MockProvider should verify demographics successfully', async () => {
      const mock = new MockProvider();
      const demo = await mock.verifyDemographics('19942691234567890', '1994-05-18');
      expect(demo.fullNameEnglish).toBe('FARHANA RAHMAN');
      expect(demo.fullNameBangla).toBe('ফারহানা রহমান');
      expect(demo.ecPhotoBase64).toBeDefined();
    });

    it('MockProvider should support dynamic face match confidence triggers', async () => {
      const mock = new MockProvider();

      const successMatch = await mock.matchFace('ec_photo', 'normal_live_selfie');
      expect(successMatch.isMatch).toBe(true);
      expect(successMatch.confidenceScore).toBeGreaterThanOrEqual(85);

      const failedMatch = await mock.matchFace('ec_photo', 'mismatch_selfie');
      expect(failedMatch.isMatch).toBe(false);
      expect(failedMatch.confidenceScore).toBeLessThan(85);

      const intermediateMatch = await mock.matchFace('ec_photo', 'low_rebind_selfie');
      expect(intermediateMatch.isMatch).toBe(true);
      expect(intermediateMatch.confidenceScore).toBeGreaterThanOrEqual(85);
      expect(intermediateMatch.confidenceScore).toBeLessThan(95);
    });

    it('PorichoyProvider tracks consecutive failure count upon network errors', async () => {
      const porichoy = new PorichoyProvider('http://127.0.0.1:54321', 'test_key');
      expect(porichoy.getConsecutiveFailures()).toBe(0);

      await expect(
        porichoy.extractOcr(Buffer.from('front'), Buffer.from('back'))
      ).rejects.toThrow();

      expect(porichoy.getConsecutiveFailures()).toBe(1);
    });

    it('maskLegalName utility correctly masks citizen name for privacy', () => {
      expect(maskLegalName('FARHANA RAHMAN')).toBe('F****** R*****');
      expect(maskLegalName('ABUL KASHEM')).toBe('A*** K*****');
      expect(maskPhone('+8801712345678')).toBe('+88017****5678');
    });
  });

  describe('4.3 Endpoint 1: POST /api/v1/kyc/ocr', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/v1/kyc/ocr');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject if frontImage or backImage files are missing', async () => {
      const { token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/kyc/ocr')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully extract OCR data from multipart card uploads', async () => {
      const { token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/kyc/ocr')
        .set('Authorization', `Bearer ${token}`)
        .attach('frontImage', Buffer.from('mock-front-card-image-bytes'), 'front.jpg')
        .attach('backImage', Buffer.from('mock-back-card-image-bytes'), 'back.jpg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nidNumber).toBe('19942691234567890');
      expect(res.body.data.dob).toBe('1994-05-18');
      expect(res.body.data.extractedName).toBe('FARHANA RAHMAN');
    });
  });

  describe('4.3 Endpoint 2: POST /api/v1/kyc/verify-nid (Primary Fast KYC Pipeline)', () => {
    it('should reject invalid NID format or missing fields with 400', async () => {
      const { token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/kyc/verify-nid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nidNumber: '12345', // invalid length
          dob: '1994/05/18'   // invalid format
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should reject if citizen profile is already NID verified', async () => {
      const { token } = await createUserAndToken({ isNidVerified: true, kycStatus: KycStatus.VERIFIED });

      const res = await request(app)
        .post('/api/v1/kyc/verify-nid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nidNumber: '19942691234567890',
          dob: '1994-05-18'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_ALREADY_VERIFIED);
    });

    it('should reject if NID is blacklisted with 403 Forbidden', async () => {
      const { token } = await createUserAndToken();
      const nid = '19942691234567890';
      const nidHash = computeNidHash(nid);

      await NidBlacklist.create({
        nidHash,
        phone: '+8801999999999',
        reason: 'Confirmed fraudulent seller',
        bannedBy: new mongoose.Types.ObjectId()
      });

      const res = await request(app)
        .post('/api/v1/kyc/verify-nid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nidNumber: nid,
          dob: '1994-05-18'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.NID_BLACKLISTED);
    });

    it('should reject if NID is already registered to another citizen with 409 Conflict', async () => {
      const nid = '19942691234567890';
      const nidHash = computeNidHash(nid);

      // Existing citizen with this NID
      await createUserAndToken({
        phone: '+8801811111111',
        isNidVerified: true,
        nidHash
      });

      // New citizen attempting duplicate verification
      const { token } = await createUserAndToken({
        phone: '+8801722222222'
      });

      const res = await request(app)
        .post('/api/v1/kyc/verify-nid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nidNumber: nid,
          dob: '1994-05-18'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCodes.NID_ALREADY_REGISTERED);
    });

    it('should reject biometric facial mismatch (<85%) with 422 and decrement attempts', async () => {
      const { user, token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/kyc/verify-nid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nidNumber: '19942691234567890',
          dob: '1994-05-18',
          liveSelfieBase64: 'mismatch_selfie_data'
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe(ErrorCodes.BIOMETRIC_FACE_MISMATCH);
      expect(res.body.error.remainingAttempts).toBe(2);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.kycAttempts).toBe(1);
      expect(updatedUser?.kycStatus).toBe(KycStatus.RETAKE_REQUIRED);
    });

    it('should route to manual review and return 429 when 3 attempts fail', async () => {
      const { user, token } = await createUserAndToken({ kycAttempts: 2 });

      const res = await request(app)
        .post('/api/v1/kyc/verify-nid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nidNumber: '19942691234567890',
          dob: '1994-05-18',
          liveSelfieBase64: 'mismatch_selfie_data'
        });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_ATTEMPTS_EXHAUSTED);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.kycAttempts).toBe(3);
      expect(updatedUser?.kycStatus).toBe(KycStatus.MANUAL_REVIEW);
    });

    it('should successfully complete E-KYC: encrypt legal data, set verified status, and mask name', async () => {
      const { user, token } = await createUserAndToken();
      const nid = '19942691234567890';
      const dob = '1994-05-18';

      const res = await request(app)
        .post('/api/v1/kyc/verify-nid')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nidNumber: nid,
          dob,
          liveSelfieBase64: 'valid_match_selfie'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isNidVerified).toBe(true);
      expect(res.body.data.kycStatus).toBe('verified');
      expect(res.body.data.maskedLegalName).toBe('F****** R*****');

      const updatedUser = await User.findById(user._id).select('+encryptedNidData');
      expect(updatedUser?.isNidVerified).toBe(true);
      expect(updatedUser?.kycStatus).toBe(KycStatus.VERIFIED);
      expect(updatedUser?.nidHash).toBe(computeNidHash(nid));
      expect(updatedUser?.encryptedNidData).toBeDefined();

      // Test decrypting legal data
      const decrypted: any = decryptData(
        updatedUser!.encryptedNidData!.ciphertext,
        updatedUser!.encryptedNidData!.iv,
        updatedUser!.encryptedNidData!.authTag
      );
      expect(decrypted.nidNumber).toBe(nid);
      expect(decrypted.fullNameEnglish).toBe('FARHANA RAHMAN');
    });
  });

  describe('4.3 Endpoint 3: GET /api/v1/kyc/status', () => {
    it('should return unverified citizen status', async () => {
      const { token } = await createUserAndToken();

      const res = await request(app)
        .get('/api/v1/kyc/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isNidVerified).toBe(false);
      expect(res.body.data.kycStatus).toBe(KycStatus.UNVERIFIED);
    });

    it('should return SLA remaining minutes when user is in manual review', async () => {
      const { token } = await createUserAndToken({
        kycStatus: KycStatus.MANUAL_REVIEW,
        kycAttempts: 3
      });

      const res = await request(app)
        .get('/api/v1/kyc/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kycStatus).toBe(KycStatus.MANUAL_REVIEW);
      expect(res.body.data.slaRemainingMinutes).toBe(120);
      expect(res.body.data.slaWorkingHours).toBe('9:00 AM - 9:00 PM BST');
    });
  });

  describe('4.3 Endpoint 4: POST /api/v1/kyc/rebind-phone (Lost SIM Recovery)', () => {
    const originalNid = '19942691234567890';
    const dob = '1994-05-18';
    const newPhone = '01811223344';
    const normalizedNewPhone = '+8801811223344';
    const rawOtp = '123456';

    it('should reject if OTP on new phone is invalid or expired', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/rebind-phone')
        .send({
          newPhone,
          phoneOtp: '999999',
          nidNumber: originalNid,
          dob
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.OTP_EXPIRED);
    });

    it('should reject if biometric confidence is below 95% threshold', async () => {
      const nidHash = computeNidHash(originalNid);
      await createUserAndToken({ phone: '+8801700000000', nidHash, isNidVerified: true });

      // Store valid OTP in Redis
      const hashedOtp = await argon2.hash(rawOtp);
      await redis.set(`otp:${normalizedNewPhone}`, hashedOtp, 'EX', 120);

      const res = await request(app)
        .post('/api/v1/kyc/rebind-phone')
        .send({
          newPhone,
          phoneOtp: rawOtp,
          nidNumber: originalNid,
          dob,
          liveSelfieBase64: 'low_rebind_selfie' // yields ~88.5% confidence
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe(ErrorCodes.BIOMETRIC_FACE_MISMATCH);
    });

    it('should successfully rebind phone when biometric confidence >= 95%', async () => {
      const nidHash = computeNidHash(originalNid);
      const { user } = await createUserAndToken({
        phone: '+8801700000000',
        nidHash,
        isNidVerified: true,
        deviceUUIDs: ['old-phone-uuid-1', 'old-phone-uuid-2'],
        activeDeviceCount: 2
      });

      // Store valid OTP in Redis
      const hashedOtp = await argon2.hash(rawOtp);
      await redis.set(`otp:${normalizedNewPhone}`, hashedOtp, 'EX', 120);

      const res = await request(app)
        .post('/api/v1/kyc/rebind-phone')
        .send({
          newPhone,
          phoneOtp: rawOtp,
          nidNumber: originalNid,
          dob,
          liveSelfieBase64: 'high_match_selfie' // yields >= 95%
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.newPhone).toBe(normalizedNewPhone);
      expect(res.body.data.accessToken).toBeDefined();

      const reboundUser = await User.findById(user._id);
      expect(reboundUser?.phone).toBe(normalizedNewPhone);
      expect(reboundUser?.deviceUUIDs).toHaveLength(0);
      expect(reboundUser?.activeDeviceCount).toBe(1);
    });
  });

  describe('4.3 Endpoint 5: POST /api/v1/kyc/verify-new-device ("New Phone, Same SIM")', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/kyc/verify-new-device')
        .send({
          deviceUUID: 'device-xyz-123'
        });

      expect(res.status).toBe(401);
    });

    it('should reject failed biometric selfie challenge', async () => {
      const { token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/kyc/verify-new-device')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deviceUUID: 'device-new-uuid',
          liveSelfieBase64: 'mismatch_selfie'
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe(ErrorCodes.BIOMETRIC_FACE_MISMATCH);
    });

    it('should authorize new device footprint and enforce max 2 devices', async () => {
      const { user, token } = await createUserAndToken({
        deviceUUIDs: ['device-1', 'device-2'],
        activeDeviceCount: 2
      });

      const res = await request(app)
        .post('/api/v1/kyc/verify-new-device')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deviceUUID: 'device-3-new',
          liveSelfieBase64: 'normal_live_selfie'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activeDeviceCount).toBe(2);
      expect(res.body.data.accessToken).toBeDefined();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.deviceUUIDs).toEqual(['device-2', 'device-3-new']);
    });
  });
});
