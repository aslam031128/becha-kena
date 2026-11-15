import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { User, Listing, Favorite } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';
import { processPriceDropAlert } from '../src/queues/priceDropAlert.worker.js';

describe('Phase 6: Favorites & Price Drop Alerts Specification', () => {
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
    await Favorite.deleteMany({});
  });

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
      isBanned: overrides.isBanned ?? false,
      notificationPreferences: {
        pushEnabled: true,
        smsEnabled: true,
        priceDropAlerts: overrides.priceDropAlerts ?? true
      }
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
      title: 'Samsung Galaxy S22 Ultra 256GB Phantom Black',
      description: 'Official warranty device with box and original charger. No scratch.',
      price,
      condition: ListingCondition.LIKE_NEW,
      category: ListingCategory.ELECTRONICS,
      location: {
        type: 'Point',
        coordinates: [90.3742, 23.7461],
        division: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://cdn.becha-kena.com/s22.webp'],
      status: ListingStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  describe('6.1 — Add to Favorites (POST /api/v1/favorites/:listingId)', () => {
    it('should reject unverified citizen with 403 KYC_REQUIRED', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711111111' });
      const { token: unverifiedToken } = await createUserAndToken({
        phone: '+8801722222222',
        isNidVerified: false
      });

      const listing = await createSampleListing(seller._id);

      const res = await request(app)
        .post(`/api/v1/favorites/${listing._id}`)
        .set('Authorization', `Bearer ${unverifiedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_REQUIRED);
    });

    it('should reject when seller attempts to favorite their own listing', async () => {
      const { user: seller, token: sellerToken } = await createUserAndToken();
      const listing = await createSampleListing(seller._id);

      const res = await request(app)
        .post(`/api/v1/favorites/${listing._id}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should reject non-existent listing with 404', async () => {
      const { token } = await createUserAndToken();
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/v1/favorites/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.LISTING_NOT_FOUND);
    });

    it('should successfully add listing to favorites and store benchmark priceAtSave', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711111111' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ phone: '+8801722222222' });

      const listing = await createSampleListing(seller._id, 55000);

      const res = await request(app)
        .post(`/api/v1/favorites/${listing._id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.listingId).toBe(listing._id.toString());
      expect(res.body.data.priceAtSave).toBe(55000);

      const dbFavorite = await Favorite.findOne({ userId: buyer._id, listingId: listing._id });
      expect(dbFavorite).toBeDefined();
      expect(dbFavorite?.priceAtSave).toBe(55000);
    });
  });

  describe('6.2 — Remove from Favorites (DELETE /api/v1/favorites/:listingId)', () => {
    it('should reject removing a listing not present in user favorites with 404', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711111111' });
      const { token: buyerToken } = await createUserAndToken({ phone: '+8801722222222' });

      const listing = await createSampleListing(seller._id);

      const res = await request(app)
        .delete(`/api/v1/favorites/${listing._id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('should successfully delete favorite document from database', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711111111' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ phone: '+8801722222222' });

      const listing = await createSampleListing(seller._id);
      await Favorite.create({
        userId: buyer._id,
        listingId: listing._id,
        priceAtSave: listing.price
      });

      const res = await request(app)
        .delete(`/api/v1/favorites/${listing._id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.removed).toBe(true);

      const dbFavorite = await Favorite.findOne({ userId: buyer._id, listingId: listing._id });
      expect(dbFavorite).toBeNull();
    });
  });

  describe('6.3 — List Favorites & Real-Time Price Drop Computation (GET /api/v1/favorites)', () => {
    it('should return empty list when citizen has no saved listings', async () => {
      const { token } = await createUserAndToken();

      const res = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.totalCount).toBe(0);
    });

    it('should compute isPriceDropped=true and priceDropAmount when currentPrice < priceAtSave', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711111111' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ phone: '+8801722222222' });

      // Listing created at 60,000 BDT
      const listing = await createSampleListing(seller._id, 60000);

      // Buyer saves listing when price is 60,000 BDT
      await Favorite.create({
        userId: buyer._id,
        listingId: listing._id,
        priceAtSave: 60000
      });

      // Seller lowers price to 52,000 BDT (8,000 BDT price drop!)
      listing.price = 52000;
      await listing.save();

      const res = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);

      const item = res.body.data[0];
      expect(item.listingId).toBe(listing._id.toString());
      expect(item.priceAtSave).toBe(60000);
      expect(item.currentPrice).toBe(52000);
      expect(item.isPriceDropped).toBe(true);
      expect(item.priceDropAmount).toBe(8000);
    });

    it('should compute isPriceDropped=false when price has not decreased', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711111111' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ phone: '+8801722222222' });

      const listing = await createSampleListing(seller._id, 45000);

      await Favorite.create({
        userId: buyer._id,
        listingId: listing._id,
        priceAtSave: 45000
      });

      const res = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].isPriceDropped).toBe(false);
      expect(res.body.data[0].priceDropAmount).toBe(0);
    });
  });

  describe('6.4 — BullMQ Price Drop Alert Worker Integration', () => {
    it('should process price drop alerts for users who saved the listing at higher price and have alerts enabled', async () => {
      const { user: seller } = await createUserAndToken({ phone: '+8801711111111' });
      const { user: alertUser } = await createUserAndToken({
        phone: '+8801722222222',
        priceDropAlerts: true
      });
      const { user: silentUser } = await createUserAndToken({
        phone: '+8801733333333',
        priceDropAlerts: false
      });

      const listing = await createSampleListing(seller._id, 50000);

      // Both users saved it at 50,000
      await Favorite.create([
        { userId: alertUser._id, listingId: listing._id, priceAtSave: 50000 },
        { userId: silentUser._id, listingId: listing._id, priceAtSave: 50000 }
      ]);

      // Seller drops price to 42,000
      listing.price = 42000;
      await listing.save();

      // Trigger the background worker process
      const result = await processPriceDropAlert({
        data: {
          listingId: listing._id.toString(),
          oldPrice: 50000,
          newPrice: 42000
        }
      } as any);

      expect(result.alertsDispatched).toBe(1); // Only alertUser has priceDropAlerts: true
      expect(result.eligibleCount).toBe(2); // alertUser and silentUser saved at 50000 > 42000
    });
  });
});
