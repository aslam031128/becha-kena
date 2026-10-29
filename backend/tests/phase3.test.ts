import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import argon2 from 'argon2';
import { createApp } from '../src/app.js';
import { getRedisClient } from '../src/config/redis.js';
import { User, NidBlacklist, Listing } from '../src/models/index.js';
import { UserRole, KycStatus, ListingStatus, ListingCondition, ListingCategory, ModerationStatus } from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { computeNidHash } from '../src/utils/hmac.js';
import { encryptData, decryptData } from '../src/utils/kms.js';
import { normalizeBdPhone, isValidBdPhone } from '../src/utils/phone.js';
import { signAccessToken, REFRESH_COOKIE_NAME } from '../src/utils/token.js';
import { requireAuth } from '../src/middlewares/auth.js';
import { requireVerifiedCitizen, requireRole, requireListingOwner } from '../src/middlewares/rbac.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';

describe('Phase 3: Authentication & Device Security Specification', () => {
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
    await Listing.deleteMany({});
  });

  describe('3.1 — HMAC-SHA256 Salted NID Hashing (src/utils/hmac.ts)', () => {
    it('should compute a deterministic 64-character lowercase hex hash', () => {
      const nid = '19951234567890123';
      const hash1 = computeNidHash(nid);
      const hash2 = computeNidHash(nid);

      expect(typeof hash1).toBe('string');
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
      expect(hash1).toBe(hash2);
    });

    it('should trim surrounding whitespace before hashing', () => {
      const nid = '1234567890';
      const hashTrimmed = computeNidHash(nid);
      const hashWithSpaces = computeNidHash('  1234567890  ');

      expect(hashWithSpaces).toBe(hashTrimmed);
    });

    it('should produce distinct hashes for different NID numbers', () => {
      const hashA = computeNidHash('1000000001');
      const hashB = computeNidHash('1000000002');

      expect(hashA).not.toBe(hashB);
    });

    it('should throw an error for empty or invalid inputs', () => {
      expect(() => computeNidHash('')).toThrow('NID number must be a non-empty string');
      expect(() => computeNidHash('   ')).toThrow('NID number must be a non-empty string');
      expect(() => computeNidHash(null as any)).toThrow();
    });
  });

  describe('3.2 — AES-256-GCM Envelope Encryption & Decryption (src/utils/kms.ts)', () => {
    const legalDemographics = {
      fullName: 'Tahmidur Rahman',
      dob: '1995-10-14',
      fatherName: 'Mustafizur Rahman',
      motherName: 'Nasreen Begum',
      bloodGroup: 'B+',
      nidNumber: '19951234567890123'
    };

    it('should encrypt an object into hex ciphertext, 12-byte IV, and 16-byte authTag', () => {
      const result = encryptData(legalDemographics);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');

      expect(typeof result.ciphertext).toBe('string');
      expect(result.ciphertext.length).toBeGreaterThan(0);

      // 12 bytes = 24 hex characters
      expect(result.iv).toHaveLength(24);
      // 16 bytes = 32 hex characters
      expect(result.authTag).toHaveLength(32);
    });

    it('should accurately decrypt ciphertext back to original object', () => {
      const encrypted = encryptData(legalDemographics);
      const decrypted = decryptData(encrypted.ciphertext, encrypted.iv, encrypted.authTag);

      expect(decrypted).toEqual(legalDemographics);
    });

    it('should fail decryption if ciphertext has been tampered with', () => {
      const encrypted = encryptData(legalDemographics);
      // Corrupt the ciphertext
      const corruptedCiphertext =
        encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');

      expect(() => {
        decryptData(corruptedCiphertext, encrypted.iv, encrypted.authTag);
      }).toThrow();
    });

    it('should fail decryption if authTag has been tampered with', () => {
      const encrypted = encryptData(legalDemographics);
      const corruptedTag =
        encrypted.authTag.slice(0, -2) + (encrypted.authTag.slice(-2) === '11' ? '22' : '11');

      expect(() => {
        decryptData(encrypted.ciphertext, encrypted.iv, corruptedTag);
      }).toThrow();
    });

    it('should throw an error if missing decryption arguments', () => {
      expect(() => decryptData('', 'iv', 'tag')).toThrow();
    });
  });

  describe('3.3 — Phone Normalization & BD Regex Utility', () => {
    it('should normalize local and prefixed phone numbers to +8801XXXXXXXXX format', () => {
      expect(normalizeBdPhone('01712345678')).toBe('+8801712345678');
      expect(normalizeBdPhone('+8801712345678')).toBe('+8801712345678');
      expect(normalizeBdPhone('8801712345678')).toBe('+8801712345678');
      expect(normalizeBdPhone('01912-345678')).toBe('+8801912345678');
    });

    it('should validate legitimate Bangladeshi mobile prefixes (013 - 019)', () => {
      expect(isValidBdPhone('01712345678')).toBe(true);
      expect(isValidBdPhone('+8801812345678')).toBe(true);
      expect(isValidBdPhone('01312345678')).toBe(true);
      expect(isValidBdPhone('01212345678')).toBe(false); // Invalid prefix (012)
      expect(isValidBdPhone('123456')).toBe(false);
    });
  });

  describe('3.4 — Auth Endpoints: POST /api/v1/auth/request-otp', () => {
    const validPhone = '01712345678';
    const normalizedPhone = '+8801712345678';

    it('should reject invalid phone format with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: '1234567' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should reject blacklisted mobile numbers with 403 NID_BLACKLISTED', async () => {
      const superAdmin = await User.create({
        phone: '+8801900000001',
        displayName: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED
      });

      await NidBlacklist.create({
        nidHash: computeNidHash('banned_nid_1'),
        phone: normalizedPhone,
        reason: 'Serial stolen electronics reseller',
        bannedBy: superAdmin._id
      });

      const res = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: validPhone });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.NID_BLACKLISTED);
    });

    it('should generate 6-digit OTP, hash with Argon2, store in Redis (120s TTL), and return 200 OK', async () => {
      const freshPhone = '01712345099';
      const freshNormalized = '+8801712345099';
      const res = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: freshPhone });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe(freshNormalized);
      expect(res.body.data.expiresInSeconds).toBe(120);
      expect(res.body.data.resendCooldownSeconds).toBe(60);

      // Verify Redis entry
      const storedHashedOtp = await redis.get(`otp:${freshNormalized}`);
      expect(storedHashedOtp).toBeDefined();
      expect(typeof storedHashedOtp).toBe('string');
      expect(storedHashedOtp?.startsWith('$argon2')).toBe(true);

      const ttl = await redis.ttl(`otp:${freshNormalized}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(120);
    });
  });

  describe('3.5 — Auth Endpoints: POST /api/v1/auth/verify-otp', () => {
    const otp = '492810';
    const deviceUUID = 'a7b8c9d0-1234-4567-89ab-cdef01234567';

    const setupOtp = async (targetPhone: string, code = otp) => {
      const norm = normalizeBdPhone(targetPhone);
      const hashed = await argon2.hash(code);
      await redis.set(`otp:${norm}`, hashed, 'EX', 120);
    };

    it('should reject verification if OTP does not exist or expired with 400 OTP_EXPIRED', async () => {
      const phone = '01711000001';
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.OTP_EXPIRED);
    });

    it('should reject verification if OTP code is incorrect with 400 INVALID_OTP', async () => {
      const phone = '01711000002';
      await setupOtp(phone, otp);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: '999999', deviceUUID });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.INVALID_OTP);
    });

    it('should reject blacklisted device footprint with 403 NID_BLACKLISTED', async () => {
      const phone = '01711000003';
      await setupOtp(phone, otp);

      const superAdmin = await User.create({
        phone: '+8801900000002',
        displayName: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED
      });

      await NidBlacklist.create({
        nidHash: computeNidHash('banned_nid_dev'),
        phone: '+8801799999999',
        deviceUUID,
        reason: 'Hardware compromised',
        bannedBy: superAdmin._id
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.NID_BLACKLISTED);
    });

    it('should register a new citizen with initial defaults, 1 bound device, and isNewUser=true', async () => {
      const phone = '01711000004';
      const norm = normalizeBdPhone(phone);
      await setupOtp(phone, otp);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isNewUser).toBe(true);
      expect(res.body.data.isNewDeviceChallengeRequired).toBe(false);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.phone).toBe(norm);
      expect(res.body.data.user.role).toBe(UserRole.CITIZEN);
      expect(res.body.data.user.isNidVerified).toBe(false);

      // Verify OTP is deleted from Redis (single-use enforcement)
      const redisCheck = await redis.get(`otp:${norm}`);
      expect(redisCheck).toBeNull();

      // Verify HTTP-Only cookie was set
      const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
      expect(cookieStr).toContain(REFRESH_COOKIE_NAME);
      expect(cookieStr).toContain('HttpOnly');
    });

    it('should allow returning user with existing device and set isNewUser=false', async () => {
      const phone = '01711000005';
      const norm = normalizeBdPhone(phone);
      await setupOtp(phone, otp);

      await User.create({
        phone: norm,
        displayName: 'Farhana R.',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED,
        deviceUUIDs: [deviceUUID],
        activeDeviceCount: 1
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID });

      expect(res.status).toBe(200);
      expect(res.body.data.isNewUser).toBe(false);
      expect(res.body.data.user.displayName).toBe('Farhana R.');
      expect(res.body.data.user.isNidVerified).toBe(true);
    });

    it('should allow adding a 2nd recognized device for existing user', async () => {
      const phone = '01711000006';
      const norm = normalizeBdPhone(phone);
      await setupOtp(phone, otp);

      const user = await User.create({
        phone: norm,
        displayName: 'Farhana R.',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED,
        deviceUUIDs: [deviceUUID],
        activeDeviceCount: 1
      });

      const secondDevice = 'b8c9d0e1-2222-3333-4444-555566667777';
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID: secondDevice });

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.deviceUUIDs).toHaveLength(2);
      expect(updatedUser?.deviceUUIDs).toContain(secondDevice);
      expect(updatedUser?.activeDeviceCount).toBe(2);
    });

    it('should reject a 3rd device with 423 Locked (DEVICE_LIMIT_EXCEEDED)', async () => {
      const phone = '01711000007';
      const norm = normalizeBdPhone(phone);
      await setupOtp(phone, otp);

      await User.create({
        phone: norm,
        displayName: 'Farhana R.',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED,
        deviceUUIDs: ['dev-1', 'dev-2'],
        activeDeviceCount: 2
      });

      const thirdDevice = 'dev-3-unauthorized';
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID: thirdDevice });

      expect(res.status).toBe(423);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.DEVICE_LIMIT_EXCEEDED);
      expect(res.body.error.message).toContain('Maximum active devices');
    });

    it('should reject banned accounts on login with 403 ACCOUNT_BANNED', async () => {
      const phone = '01711000008';
      const norm = normalizeBdPhone(phone);
      await setupOtp(phone, otp);

      await User.create({
        phone: norm,
        displayName: 'Banned Citizen',
        role: UserRole.CITIZEN,
        isBanned: true,
        banReason: 'Fraudulent listings',
        deviceUUIDs: [deviceUUID],
        activeDeviceCount: 1
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.ACCOUNT_BANNED);
    });
  });

  describe('3.6 — Refresh Token Rotation & Token Family Reuse Detection', () => {
    let user: any;
    const phone = '+8801712345678';
    const deviceUUID = 'device-family-test';

    beforeEach(async () => {
      user = await User.create({
        phone,
        displayName: 'Token Family User',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED,
        deviceUUIDs: [deviceUUID],
        activeDeviceCount: 1
      });
    });

    it('should reject request without refresh cookie with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/v1/auth/refresh-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should rotate access & refresh tokens on legitimate refresh request', async () => {
      // First, login to obtain refresh cookie
      const otp = '123456';
      await redis.set(`otp:${phone}`, await argon2.hash(otp), 'EX', 120);

      const loginRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID });

      expect(loginRes.status).toBe(200);
      const cookies = loginRes.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Now call refresh endpoint with cookie
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.expiresIn).toBe(900);

      // Verify a new cookie was issued
      const newCookies = refreshRes.headers['set-cookie'];
      expect(newCookies).toBeDefined();
    });

    it('should detect token reuse attack, revoke entire token family, and return 403 FORBIDDEN', async () => {
      // 1. Login to get token T1
      const otp = '123456';
      await redis.set(`otp:${phone}`, await argon2.hash(otp), 'EX', 120);

      const loginRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp, deviceUUID });

      const cookieT1 = loginRes.headers['set-cookie'];

      // 2. Refresh with T1 -> Server issues T2 and tombstones T1
      const refreshRes1 = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', cookieT1);

      expect(refreshRes1.status).toBe(200);
      const cookieT2 = refreshRes1.headers['set-cookie'];

      // 3. Attacker (or replay) reuses old token T1
      const reuseAttackRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', cookieT1);

      expect(reuseAttackRes.status).toBe(403);
      expect(reuseAttackRes.body.success).toBe(false);
      expect(reuseAttackRes.body.error.code).toBe(ErrorCodes.FORBIDDEN);
      expect(reuseAttackRes.body.error.message).toContain('Token reuse detected');

      // 4. Legitimate token T2 should also now be revoked because the entire family was nuked!
      const attemptT2Res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', cookieT2);

      expect(attemptT2Res.status).toBe(401); // Family is revoked
    });
  });

  describe('3.7 — Auth Endpoints: POST /api/v1/auth/logout', () => {
    it('should require authentication, revoke tokens in Redis, and expire refresh cookie', async () => {
      const user = await User.create({
        phone: '+8801799988877',
        displayName: 'Logout User',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED
      });

      const token = signAccessToken({
        userId: user._id.toString(),
        role: user.role,
        isNidVerified: user.isNidVerified,
        isFrozen: user.isFrozen,
        deviceId: 'logout-device'
      });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', [`${REFRESH_COOKIE_NAME}=test-refresh-token`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully.');

      const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
      expect(cookieStr).toContain('Max-Age=0');
    });
  });

  describe('3.8 — Citizen Profile: GET /api/v1/auth/me & GET /api/v1/users/me', () => {
    let citizen: any;
    let token: string;

    beforeEach(async () => {
      citizen = await User.create({
        phone: '+8801711223344',
        displayName: 'Tanvir Hossain',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED,
        kycAttempts: 1,
        avatarUrl: 'https://cdn.becha-kena.com/avatars/tanvir.webp',
        deviceUUIDs: ['dev-tanvir-1'],
        activeDeviceCount: 1,
        averageRating: 4.8,
        totalDealsCompleted: 8,
        notificationPreferences: {
          pushEnabled: true,
          smsEnabled: true,
          priceDropAlerts: true
        }
      });

      token = signAccessToken({
        userId: citizen._id.toString(),
        role: citizen.role,
        isNidVerified: citizen.isNidVerified,
        isFrozen: citizen.isFrozen,
        deviceId: 'dev-tanvir-1'
      });
    });

    it('GET /api/v1/auth/me: should return full profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(citizen._id.toString());
      expect(res.body.data.phone).toBe(citizen.phone);
      expect(res.body.data.displayName).toBe(citizen.displayName);
      expect(res.body.data.isNidVerified).toBe(true);
      expect(res.body.data.kycStatus).toBe(KycStatus.VERIFIED);
      expect(res.body.data.avatarUrl).toBe(citizen.avatarUrl);
      expect(res.body.data.activeDeviceCount).toBe(1);
    });

    it('GET /api/v1/users/me: should return exact same profile envelope', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(citizen._id.toString());
      expect(res.body.data.displayName).toBe('Tanvir Hossain');
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should reject banned user even with a valid signature JWT with 403 ACCOUNT_BANNED', async () => {
      citizen.isBanned = true;
      await citizen.save();

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.ACCOUNT_BANNED);
    });
  });

  describe('3.9 — RBAC Middlewares (requireVerifiedCitizen, requireRole, requireListingOwner)', () => {
    const createRbacApp = (mountRoute: (app: express.Express) => void) => {
      const app = express();
      app.use(express.json());
      app.use(cookieParser());
      mountRoute(app);
      app.use(errorHandler);
      return app;
    };

    it('requireVerifiedCitizen: should allow verified, non-frozen citizen', async () => {
      const app = createRbacApp((testApp) => {
        testApp.get(
          '/test-verified',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: 'user-1',
              role: UserRole.CITIZEN,
              isNidVerified: true,
              isFrozen: false
            };
            next();
          },
          requireVerifiedCitizen,
          (_req: Request, res: Response) => {
            res.json({ allowed: true });
          }
        );
      });

      const res = await request(app).get('/test-verified');
      expect(res.status).toBe(200);
      expect(res.body.allowed).toBe(true);
    });

    it('requireVerifiedCitizen: should reject unverified citizen with 403 KYC_REQUIRED', async () => {
      const app = createRbacApp((testApp) => {
        testApp.get(
          '/test-unverified',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: 'user-2',
              role: UserRole.CITIZEN,
              isNidVerified: false,
              isFrozen: false
            };
            next();
          },
          requireVerifiedCitizen,
          (_req: Request, res: Response) => {
            res.json({ allowed: true });
          }
        );
      });

      const res = await request(app).get('/test-unverified');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_REQUIRED);
    });

    it('requireVerifiedCitizen: should reject frozen account with 403 ACCOUNT_FROZEN', async () => {
      const app = createRbacApp((testApp) => {
        testApp.get(
          '/test-frozen',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: 'user-3',
              role: UserRole.CITIZEN,
              isNidVerified: true,
              isFrozen: true
            };
            next();
          },
          requireVerifiedCitizen,
          (_req: Request, res: Response) => {
            res.json({ allowed: true });
          }
        );
      });

      const res = await request(app).get('/test-frozen');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.ACCOUNT_FROZEN);
    });

    it('requireRole: should enforce allowed roles and reject unauthorized roles with 403 FORBIDDEN', async () => {
      const app = createRbacApp((testApp) => {
        testApp.get(
          '/test-moderator-only',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: 'user-cit',
              role: UserRole.CITIZEN,
              isNidVerified: true,
              isFrozen: false
            };
            next();
          },
          requireRole([UserRole.MODERATOR, UserRole.SUPER_ADMIN]),
          (_req: Request, res: Response) => {
            res.json({ allowed: true });
          }
        );
      });

      const resForbidden = await request(app).get('/test-moderator-only');
      expect(resForbidden.status).toBe(403);
      expect(resForbidden.body.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('requireRole: should permit users with one of the allowed roles', async () => {
      const app = createRbacApp((testApp) => {
        testApp.get(
          '/test-mod-pass',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: 'mod-1',
              role: UserRole.MODERATOR,
              isNidVerified: true,
              isFrozen: false
            };
            next();
          },
          requireRole([UserRole.MODERATOR, UserRole.SUPER_ADMIN]),
          (_req: Request, res: Response) => {
            res.json({ allowed: true });
          }
        );
      });

      const res = await request(app).get('/test-mod-pass');
      expect(res.status).toBe(200);
      expect(res.body.allowed).toBe(true);
    });

    it('requireListingOwner: should allow seller matching listing.sellerId', async () => {
      const sellerId = new mongoose.Types.ObjectId();
      const listing = await Listing.create({
        sellerId,
        title: 'iPhone 15 Pro Max',
        description: 'Mint condition 256GB Natural Titanium',
        price: 135000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.8103],
          division: 'Dhaka',
          thana: 'Gulshan'
        },
        imageUrls: ['https://s3.ap-southeast-1.amazonaws.com/iphone.jpg'],
        status: ListingStatus.ACTIVE,
        moderationStatus: ModerationStatus.APPROVED
      });

      const app = createRbacApp((testApp) => {
        testApp.patch(
          '/test-listings/:id',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: sellerId.toString(),
              role: UserRole.CITIZEN,
              isNidVerified: true,
              isFrozen: false
            };
            next();
          },
          requireListingOwner,
          (req: Request, res: Response) => {
            res.json({ updated: true, listingId: (req as any).listing._id });
          }
        );
      });

      const res = await request(app).patch(`/test-listings/${listing._id}`);
      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(true);
      expect(res.body.listingId).toBe(listing._id.toString());
    });

    it('requireListingOwner: should reject non-owner with 403 UNAUTHORIZED_LISTING_ACTION', async () => {
      const sellerId = new mongoose.Types.ObjectId();
      const nonOwnerId = new mongoose.Types.ObjectId();

      const listing = await Listing.create({
        sellerId,
        title: 'MacBook Air M2',
        description: 'Midnight, 16GB RAM, 512GB SSD',
        price: 110000,
        condition: ListingCondition.GENTLY_USED,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.8103],
          division: 'Dhaka',
          thana: 'Banani'
        },
        imageUrls: ['https://s3.ap-southeast-1.amazonaws.com/macbook.jpg'],
        status: ListingStatus.ACTIVE,
        moderationStatus: ModerationStatus.APPROVED
      });

      const app = createRbacApp((testApp) => {
        testApp.delete(
          '/test-listings/:id',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: nonOwnerId.toString(),
              role: UserRole.CITIZEN,
              isNidVerified: true,
              isFrozen: false
            };
            next();
          },
          requireListingOwner,
          (_req: Request, res: Response) => {
            res.json({ deleted: true });
          }
        );
      });

      const res = await request(app).delete(`/test-listings/${listing._id}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_LISTING_ACTION);
    });

    it('requireListingOwner: should return 404 LISTING_NOT_FOUND if listing does not exist', async () => {
      const app = createRbacApp((testApp) => {
        testApp.delete(
          '/test-listings/:id',
          (req: Request, _res: Response, next) => {
            req.user = {
              userId: new mongoose.Types.ObjectId().toString(),
              role: UserRole.CITIZEN,
              isNidVerified: true,
              isFrozen: false
            };
            next();
          },
          requireListingOwner,
          (_req: Request, res: Response) => {
            res.json({ deleted: true });
          }
        );
      });

      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/test-listings/${nonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.LISTING_NOT_FOUND);
    });
  });
});
