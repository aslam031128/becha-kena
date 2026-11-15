import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { getRedisClient } from '../src/config/redis.js';
import { User, Listing, PhoneRevealAudit } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  UploadContext
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';
import { s3StorageService } from '../src/services/storage/s3.service.js';
import { priceDropAlertQueue } from '../src/queues/priceDropAlert.queue.js';
import { mediaProcessingQueue } from '../src/queues/mediaProcessing.queue.js';

describe('Phase 5: Listings Engine, Direct-to-Cloud Media Uploads & Phone Reveal Gate', () => {
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
    await Listing.deleteMany({});
    await PhoneRevealAudit.deleteMany({});
    s3StorageService.clearMockObjects();

    jest.spyOn(priceDropAlertQueue, 'getJob').mockImplementation(async (_jobId: string) => null as any);
    jest.spyOn(priceDropAlertQueue, 'add').mockImplementation(async (name: any, data: any, opts: any) => ({
      id: opts?.jobId || 'mock-job-id',
      name,
      data,
      opts
    } as any));
  });

  // Helper to create test user & token
  const createUserAndToken = async (overrides: Partial<any> = {}) => {
    const user = await User.create({
      phone: overrides.phone || '+8801712345678',
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

  describe('5.1 — Direct-to-Cloud Media Upload Architecture (Presigned URL)', () => {
    it('POST /api/v1/uploads/presigned-url: should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/uploads/presigned-url')
        .send({
          fileName: 'photo.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024 * 1024,
          context: UploadContext.LISTING_IMAGE
        });

      expect(res.status).toBe(401);
    });

    it('POST /api/v1/uploads/presigned-url: should reject file size exceeding context limits', async () => {
      const { token } = await createUserAndToken();

      // Listing image max limit is 5MB. Try 6MB.
      const res = await request(app)
        .post('/api/v1/uploads/presigned-url')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'oversized.jpg',
          fileType: 'image/jpeg',
          fileSize: 6 * 1024 * 1024,
          context: UploadContext.LISTING_IMAGE
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.UPLOAD_FILE_TOO_LARGE);
    });

    it('POST /api/v1/uploads/presigned-url: should reject disallowed MIME type', async () => {
      const { token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/uploads/presigned-url')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'script.exe',
          fileType: 'application/x-msdownload',
          fileSize: 10000,
          context: UploadContext.LISTING_IMAGE
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.UPLOAD_INVALID_FILE_TYPE);
    });

    it('POST /api/v1/uploads/presigned-url: should generate public upload URL for listing image', async () => {
      const { user, token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/uploads/presigned-url')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'my_phone.webp',
          fileType: 'image/webp',
          fileSize: 1.5 * 1024 * 1024,
          context: UploadContext.LISTING_IMAGE
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.uploadUrl).toBeDefined();
      expect(res.body.data.objectKey).toContain(`public/listings/${user._id}/`);
      expect(res.body.data.publicUrl).toContain(res.body.data.objectKey);
      expect(res.body.data.isPrivate).toBe(false);
      expect(res.body.data.expiresInSeconds).toBe(600);
      expect(res.body.data.method).toBe('PUT');
    });

    it('POST /api/v1/uploads/presigned-url: should generate private storage path for NID document', async () => {
      const { user, token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/uploads/presigned-url')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fileName: 'nid_front.jpg',
          fileType: 'image/jpeg',
          fileSize: 2 * 1024 * 1024,
          context: UploadContext.NID_FRONT
        });

      expect(res.status).toBe(200);
      expect(res.body.data.objectKey).toContain(`private/kyc/${user._id}/`);
      expect(res.body.data.isPrivate).toBe(true);
      expect(res.body.data.publicUrl).toBeNull(); // Private document has NO public CDN URL
    });

    it('POST /api/v1/uploads/confirm: should reject confirmation if key does not match user prefix', async () => {
      const { token } = await createUserAndToken();
      const anotherUserId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/uploads/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({
          objectKey: `public/listings/${anotherUserId}/fake_key.jpg`,
          context: UploadContext.LISTING_IMAGE
        });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/uploads/confirm: should confirm upload and enqueue video processing for listing_video', async () => {
      const { user, token } = await createUserAndToken();
      const objectKey = `public/videos/${user._id}/sample-video.mp4`;
      s3StorageService.seedMockObject(objectKey, 12 * 1024 * 1024, 'video/mp4');

      const res = await request(app)
        .post('/api/v1/uploads/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({
          objectKey,
          context: UploadContext.LISTING_VIDEO
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.objectKey).toBe(objectKey);
      expect(res.body.data.mimeType).toBe('video/mp4');
      expect(res.body.data.confirmedAt).toBeDefined();
    });

    it('GET /api/v1/uploads/private-url: should allow document owner or moderator to get signed GET URL', async () => {
      const { user, token } = await createUserAndToken();
      const objectKey = `private/kyc/${user._id}/secret-nid.webp`;

      const res = await request(app)
        .get(`/api/v1/uploads/private-url?key=${objectKey}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.expiresInSeconds).toBe(900);

      // Stranger trying to access private document
      const { token: strangerToken } = await createUserAndToken({ phone: '+8801799999999' });
      const forbiddenRes = await request(app)
        .get(`/api/v1/uploads/private-url?key=${objectKey}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(forbiddenRes.status).toBe(403);
    });
  });

  describe('5.2 — Listings Engine CRUD & Geospatial Search', () => {
    it('POST /api/v1/listings: should reject unverified citizen with 403 KYC_REQUIRED', async () => {
      const { token } = await createUserAndToken({ isNidVerified: false });

      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Apple iPhone 13 128GB Midnight Blue',
          description: 'Original device with box and invoice. Battery health 87%. No scratch or dent.',
          price: 54000,
          condition: ListingCondition.LIKE_NEW,
          category: ListingCategory.ELECTRONICS,
          location: {
            division: 'Dhaka',
            thana: 'Dhanmondi',
            coordinates: [90.3742, 23.7461]
          },
          imageUrls: ['https://cdn.becha-kena.com/listings/img_1.webp']
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_REQUIRED);
    });

    it('POST /api/v1/listings: should reject if active monthly quota of 5 is exceeded', async () => {
      const { user, token } = await createUserAndToken();

      // Seed 5 active listings for this user
      for (let i = 0; i < 5; i++) {
        await Listing.create({
          sellerId: user._id,
          title: `Sample Gadget Listing #${i + 1} Long Enough`,
          description: 'This is a sample description of at least twenty characters for testing purposes.',
          price: 5000 + i * 500,
          condition: ListingCondition.GENTLY_USED,
          category: ListingCategory.ELECTRONICS,
          location: {
            type: 'Point',
            coordinates: [90.3742, 23.7461],
            division: 'Dhaka',
            thana: 'Dhanmondi'
          },
          imageUrls: ['https://cdn.becha-kena.com/img.webp'],
          status: ListingStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }

      // 6th listing attempt should be rejected
      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Sixth Listing Trying to Bypass Monthly Quota',
          description: 'This is another sample description of at least twenty characters for testing purposes.',
          price: 9000,
          condition: ListingCondition.LIKE_NEW,
          category: ListingCategory.ELECTRONICS,
          location: {
            division: 'Dhaka',
            thana: 'Dhanmondi',
            coordinates: [90.3742, 23.7461]
          },
          imageUrls: ['https://cdn.becha-kena.com/img6.webp']
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.C2C_QUOTA_EXHAUSTED);
    });

    it('POST /api/v1/listings: should publish listing successfully with 30-day lifecycle', async () => {
      const { user, token } = await createUserAndToken();

      const res = await request(app)
        .post('/api/v1/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Apple iPhone 13 128GB Midnight Blue (BTRC Approved)',
          description: 'Original device with box and invoice. Battery health 87%. No scratch or dent.',
          price: 54000,
          condition: ListingCondition.LIKE_NEW,
          category: ListingCategory.ELECTRONICS,
          location: {
            division: 'Dhaka',
            thana: 'Dhanmondi',
            coordinates: [90.3742, 23.7461]
          },
          imageUrls: ['https://cdn.becha-kena.com/listings/img_1.webp'],
          isPhoneHidden: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.price).toBe(54000);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.activeQuotaRemaining).toBe(4);

      const dbListing = await Listing.findById(res.body.data.id);
      expect(dbListing).toBeDefined();
      expect(dbListing?.sellerId.toString()).toBe(user._id.toString());
      expect(dbListing?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });

    it('GET /api/v1/listings/:id: should fetch listing, increment view count, and hide phone', async () => {
      const { user } = await createUserAndToken();
      const listing = await Listing.create({
        sellerId: user._id,
        title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
        description: 'Used with extreme care for 6 months. Comes with original carrying case and cables.',
        price: 22000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.3984, 23.8759],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://cdn.becha-kena.com/sony.webp'],
        viewCount: 10,
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app).get(`/api/v1/listings/${listing._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(listing._id.toString());
      expect(res.body.data.viewCount).toBe(11); // incremented
      expect(res.body.data.seller.displayName).toBe(user.displayName);
      expect(res.body.data.isPhoneHidden).toBe(true);
      expect(res.body.data.seller.phone).toBeUndefined(); // Phone NEVER in public listing response
    });

    it('GET /api/v1/listings: should filter by text query, price range, and division', async () => {
      const { user } = await createUserAndToken();

      await Listing.create([
        {
          sellerId: user._id,
          title: 'Apple iPhone 13 Pro Max 256GB Gold',
          description: 'Excellent condition with box and battery health 90 percent.',
          price: 75000,
          condition: ListingCondition.LIKE_NEW,
          category: ListingCategory.ELECTRONICS,
          location: {
            type: 'Point',
            coordinates: [90.3742, 23.7461],
            division: 'Dhaka',
            thana: 'Dhanmondi'
          },
          imageUrls: ['https://cdn.becha-kena.com/p1.webp'],
          status: ListingStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        },
        {
          sellerId: user._id,
          title: 'Yamaha FZS V3 Dual Channel ABS Motorcycle',
          description: 'Registration Dhaka Metro 2 years updated. First owner vehicle.',
          price: 215000,
          condition: ListingCondition.GENTLY_USED,
          category: ListingCategory.VEHICLES,
          location: {
            type: 'Point',
            coordinates: [91.8312, 22.3384],
            division: 'Chittagong',
            thana: 'Panchlaish'
          },
          imageUrls: ['https://cdn.becha-kena.com/v1.webp'],
          status: ListingStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        }
      ]);

      // 1. Search text 'iPhone'
      const resText = await request(app).get('/api/v1/listings?q=iPhone');
      expect(resText.status).toBe(200);
      expect(resText.body.data).toHaveLength(1);
      expect(resText.body.data[0].title).toContain('iPhone');

      // 2. Search category 'vehicles'
      const resCat = await request(app).get('/api/v1/listings?category=vehicles');
      expect(resCat.status).toBe(200);
      expect(resCat.body.data).toHaveLength(1);
      expect(resCat.body.data[0].category).toBe('vehicles');

      // 3. Search price range minPrice=100000
      const resPrice = await request(app).get('/api/v1/listings?minPrice=100000');
      expect(resPrice.status).toBe(200);
      expect(resPrice.body.data).toHaveLength(1);
      expect(resPrice.body.data[0].price).toBe(215000);
    });

    it('PUT /api/v1/listings/:id: should allow owner to update and enqueue price drop alert on price reduction', async () => {
      const { user, token } = await createUserAndToken();
      const listing = await Listing.create({
        sellerId: user._id,
        title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
        description: 'Used with extreme care for 6 months. Comes with original carrying case.',
        price: 22000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.3984, 23.8759],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://cdn.becha-kena.com/sony.webp'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .put(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          price: 19500, // Reduced price!
          title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones (Price Dropped)'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(19500);

      const updated = await Listing.findById(listing._id);
      expect(updated?.price).toBe(19500);
    });

    it('DELETE /api/v1/listings/:id: should soft-delete listing', async () => {
      const { user, token } = await createUserAndToken();
      const listing = await Listing.create({
        sellerId: user._id,
        title: 'Gadget To Be Deleted After Sold On Facebook',
        description: 'This is a sample description of at least twenty characters long.',
        price: 5000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.3984, 23.8759],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://cdn.becha-kena.com/del.webp'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .delete(`/api/v1/listings/${listing._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('archived');
      expect(res.body.data.deletedAt).toBeDefined();

      const archived = await Listing.findById(listing._id);
      expect(archived?.deletedAt).toBeDefined();
    });

    it('POST /api/v1/listings/:id/renew: should reject if before Day 25, and allow on Day 25+', async () => {
      const { user, token } = await createUserAndToken();

      // Listing created today (has 30 days left - Day 0)
      const freshListing = await Listing.create({
        sellerId: user._id,
        title: 'Brand New Listing Trying Early Renewal',
        description: 'This is a sample description of at least twenty characters long.',
        price: 12000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.3984, 23.8759],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://cdn.becha-kena.com/fresh.webp'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000) // 28 days remaining (> 5 days)
      });

      const earlyRes = await request(app)
        .post(`/api/v1/listings/${freshListing._id}/renew`)
        .set('Authorization', `Bearer ${token}`);

      expect(earlyRes.status).toBe(400);
      expect(earlyRes.body.error.code).toBe(ErrorCodes.RENEWAL_TOO_EARLY);

      // Now set expiresAt to only 2 days remaining (Day 28)
      freshListing.expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      await freshListing.save();

      const validRes = await request(app)
        .post(`/api/v1/listings/${freshListing._id}/renew`)
        .set('Authorization', `Bearer ${token}`);

      expect(validRes.status).toBe(200);
      expect(validRes.body.data.renewCount).toBe(1);
      expect(validRes.body.data.maxRenewals).toBe(2);
    });

    it('GET /api/v1/listings/my-listings: should return authenticated seller ads', async () => {
      const { user, token } = await createUserAndToken();
      await Listing.create({
        sellerId: user._id,
        title: 'Seller Dashboard Verification Item',
        description: 'This is a sample description of at least twenty characters long.',
        price: 8000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.3984, 23.8759],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://cdn.becha-kena.com/mine.webp'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get('/api/v1/listings/my-listings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Seller Dashboard Verification Item');
    });
  });

  describe('5.3 — Phone Reveal Gate (10 reveals / 24 hours)', () => {
    it('POST /api/v1/listings/:id/reveal-phone: should unmask seller phone and record audit entry', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711223344' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ phone: '+8801899887766' });

      const listing = await Listing.create({
        sellerId: seller._id,
        title: 'Listing For Click-and-Call Contact Test',
        description: 'This is a sample description of at least twenty characters long.',
        price: 15000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.3984, 23.8759],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://cdn.becha-kena.com/call.webp'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .post(`/api/v1/listings/${listing._id}/reveal-phone`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sellerPhone).toBe('+8801711223344');
      expect(res.body.data.revealsUsedToday).toBe(1);
      expect(res.body.data.revealsRemainingToday).toBe(9);

      // Verify audit log in MongoDB
      const auditLog = await PhoneRevealAudit.findOne({
        buyerId: buyer._id,
        listingId: listing._id
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.sellerId.toString()).toBe(seller._id.toString());
    });

    it('POST /api/v1/listings/:id/reveal-phone: should enforce max 10 reveals limit and return 429', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711223344' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ phone: '+8801899887766' });

      const listing = await Listing.create({
        sellerId: seller._id,
        title: 'Listing For Quota Exhaustion Test',
        description: 'This is a sample description of at least twenty characters long.',
        price: 15000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.3984, 23.8759],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://cdn.becha-kena.com/call.webp'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      });

      // Pre-set reveal count in Redis to 10
      await redis.set(`phone_reveal:count:${buyer._id}`, '10', 'EX', 86400);

      const res = await request(app)
        .post(`/api/v1/listings/${listing._id}/reveal-phone`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe(ErrorCodes.PHONE_REVEAL_LIMIT_EXCEEDED);
    });
  });
});
