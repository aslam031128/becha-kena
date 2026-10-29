import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { getRedisClient, getRedisOptions, redis } from '../src/config/redis.js';
import {
  globalLimiter,
  otpRequestCooldownLimiter,
  otpRequestDailyLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  listingCreateLimiter,
  phoneRevealLimiter
} from '../src/middlewares/rateLimiter.js';
import {
  offerExpirationQueue,
  scheduleOfferExpiration,
  processOfferExpiration,
  priceDropAlertQueue,
  schedulePriceDropAlert,
  processPriceDropAlert,
  listingLifecycleQueue,
  initListingLifecycleCron,
  processListingLifecycle,
  closeQueues
} from '../src/queues/index.js';
import { User, Listing, Conversation, Message, Offer, Favorite } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  ModerationStatus,
  OfferStatus,
  MessageType
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';

describe('Phase 2: Redis Client, BullMQ Queues & Rate Limiters Specification', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await closeQueues();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('2.1 — Redis Client Configuration', () => {
    it('should export a singleton ioredis client instance', () => {
      const client1 = getRedisClient();
      const client2 = getRedisClient();
      expect(client1).toBe(client2);
      expect(redis).toBe(client1);
    });

    it('should configure exponential backoff retry strategy and options', () => {
      const options = getRedisOptions();
      expect(options.maxRetriesPerRequest).toBeNull();
      expect(options.enableReadyCheck).toBe(false);
      expect(options.lazyConnect).toBe(true);
      expect(typeof options.retryStrategy).toBe('function');

      if (options.retryStrategy) {
        const delay1 = options.retryStrategy(1) as number;
        const delay2 = options.retryStrategy(2) as number;
        const delay3 = options.retryStrategy(5) as number;
        expect(delay2).toBeGreaterThanOrEqual(delay1);
        expect(delay3).toBeLessThanOrEqual(5000);
      }
    });
  });

  describe('2.2 — Endpoint Rate Limiters', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    it('globalLimiter: should enforce maximum requests and return 429 with standard error envelope', async () => {
      app.get('/test-global', globalLimiter, (_req: Request, res: Response) => {
        res.json({ ok: true });
      });

      // Send 100 successful requests
      for (let i = 0; i < 100; i++) {
        const res = await request(app).get('/test-global');
        expect(res.status).toBe(200);
      }

      // 101st request should be throttled
      const resThrottled = await request(app).get('/test-global');
      expect(resThrottled.status).toBe(429);
      expect(resThrottled.body.success).toBe(false);
      expect(resThrottled.body.error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    });

    it('otpRequestCooldownLimiter: should enforce 1 request per 60s per phone', async () => {
      app.post('/test-otp-cooldown', otpRequestCooldownLimiter, (_req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const phone = '+8801712345678';
      const firstRes = await request(app).post('/test-otp-cooldown').send({ phone });
      expect(firstRes.status).toBe(200);

      const immediateSecond = await request(app).post('/test-otp-cooldown').send({ phone });
      expect(immediateSecond.status).toBe(429);
      expect(immediateSecond.body.success).toBe(false);
      expect(immediateSecond.body.error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
      expect(immediateSecond.body.error.message).toContain('60 seconds');
    });

    it('otpRequestDailyLimiter: should enforce max 5 requests per 24 hours per phone', async () => {
      app.post('/test-otp-daily', otpRequestDailyLimiter, (_req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const phone = '+8801812345678';
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/test-otp-daily').send({ phone });
        expect(res.status).toBe(200);
      }

      const sixthRes = await request(app).post('/test-otp-daily').send({ phone });
      expect(sixthRes.status).toBe(429);
      expect(sixthRes.body.success).toBe(false);
      expect(sixthRes.body.error.code).toBe(ErrorCodes.OTP_ATTEMPTS_EXCEEDED);
    });

    it('otpVerifyLimiter: should enforce max 5 attempts per 5 minutes per phone', async () => {
      app.post('/test-otp-verify', otpVerifyLimiter, (_req: Request, res: Response) => {
        res.json({ ok: true });
      });

      const phone = '+8801912345678';
      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/test-otp-verify').send({ phone });
        expect(res.status).toBe(200);
      }

      const sixthAttempt = await request(app).post('/test-otp-verify').send({ phone });
      expect(sixthAttempt.status).toBe(429);
      expect(sixthAttempt.body.error.code).toBe(ErrorCodes.OTP_ATTEMPTS_EXCEEDED);
      expect(sixthAttempt.body.error.message).toContain('5 minutes');
    });

    it('listingCreateLimiter: should enforce max 5 listings per 24h per userId', async () => {
      app.post(
        '/test-listing-create',
        (req: Request, _res: Response, next) => {
          req.user = {
            userId: 'user_123',
            role: UserRole.CITIZEN,
            isNidVerified: true,
            isFrozen: false
          };
          next();
        },
        listingCreateLimiter,
        (_req: Request, res: Response) => {
          res.json({ ok: true });
        }
      );

      for (let i = 0; i < 5; i++) {
        const res = await request(app).post('/test-listing-create');
        expect(res.status).toBe(200);
      }

      const sixthListing = await request(app).post('/test-listing-create');
      expect(sixthListing.status).toBe(429);
      expect(sixthListing.body.error.code).toBe(ErrorCodes.LISTING_LIMIT_REACHED);
    });

    it('phoneRevealLimiter: should enforce max 10 reveals per 24h per userId', async () => {
      app.post(
        '/test-phone-reveal',
        (req: Request, _res: Response, next) => {
          req.user = {
            userId: 'buyer_999',
            role: UserRole.CITIZEN,
            isNidVerified: true,
            isFrozen: false
          };
          next();
        },
        phoneRevealLimiter,
        (_req: Request, res: Response) => {
          res.json({ ok: true });
        }
      );

      for (let i = 0; i < 10; i++) {
        const res = await request(app).post('/test-phone-reveal');
        expect(res.status).toBe(200);
      }

      const eleventhReveal = await request(app).post('/test-phone-reveal');
      expect(eleventhReveal.status).toBe(429);
      expect(eleventhReveal.body.error.code).toBe(ErrorCodes.PHONE_REVEAL_LIMIT_EXCEEDED);
    });
  });

  describe('2.3 — BullMQ Queues and Workers', () => {
    let buyer: any;
    let seller: any;
    let listing: any;
    let conversation: any;

    beforeEach(async () => {
      buyer = await User.create({
        phone: `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
        displayName: 'Buyer Person',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED,
        notificationPreferences: {
          pushEnabled: true,
          smsEnabled: true,
          priceDropAlerts: true
        }
      });

      seller = await User.create({
        phone: `+88018${Math.floor(10000000 + Math.random() * 90000000)}`,
        displayName: 'Seller Person',
        role: UserRole.CITIZEN,
        isNidVerified: true,
        kycStatus: KycStatus.VERIFIED
      });

      listing = await Listing.create({
        sellerId: seller._id,
        title: 'Sony Alpha A7 IV Mirrorless Camera',
        description: 'Excellent condition mirrorless camera with 24-70mm lens',
        price: 180000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.8103],
          division: 'Dhaka',
          thana: 'Gulshan'
        },
        imageUrls: ['https://s3.ap-southeast-1.amazonaws.com/camera.jpg'],
        status: ListingStatus.ACTIVE,
        moderationStatus: ModerationStatus.APPROVED
      });

      conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        lastMessage: {
          text: 'Hello, is this camera available?',
          senderId: buyer._id,
          createdAt: new Date()
        }
      });

      // Mock BullMQ queue additions to avoid requiring a live Redis server during unit tests
      jest.spyOn(offerExpirationQueue, 'add').mockImplementation(async (name: any, data: any, opts: any) => {
        return { id: opts?.jobId, name, data, opts } as any;
      });

      let storedJob: any = null;
      jest.spyOn(priceDropAlertQueue, 'getJob').mockImplementation(async (_jobId: string) => {
        return storedJob;
      });
      jest.spyOn(priceDropAlertQueue, 'add').mockImplementation(async (name: any, data: any, opts: any) => {
        storedJob = {
          id: opts?.jobId,
          name,
          data,
          opts,
          isDelayed: async () => true,
          remove: async () => {
            storedJob = null;
          }
        };
        return storedJob as any;
      });

      jest.spyOn(listingLifecycleQueue, 'add').mockImplementation(async (name: any, data: any, opts: any) => {
        return { id: opts?.jobId, name, data, opts } as any;
      });
    });

    it('offerExpiration: scheduleOfferExpiration should define offer-expiration queue and schedule delayed job', async () => {
      expect(offerExpirationQueue.name).toBe('offer-expiration');

      const offer = await Offer.create({
        conversationId: conversation._id,
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        amount: 170000,
        status: OfferStatus.PENDING,
        round: 1
      });

      // Schedules delayed job
      const job = await scheduleOfferExpiration(offer._id.toString(), 24 * 60 * 60 * 1000);
      expect(job).toBeDefined();
      expect(job.opts.delay).toBe(24 * 60 * 60 * 1000);
      expect(job.opts.jobId).toBe(`offer_expire:${offer._id.toString()}`);
    });

    it('offerExpiration: worker should atomically update pending offer to expired and create chat message', async () => {
      const offer = await Offer.create({
        conversationId: conversation._id,
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        amount: 165000,
        status: OfferStatus.PENDING,
        round: 1
      });

      // Simulate worker executing job
      const mockJob = {
        data: { offerId: offer._id.toString() },
        id: 'job-1'
      } as any;

      const result = await processOfferExpiration(mockJob);
      expect(result.expired).toBe(true);
      expect(result.status).toBe(OfferStatus.EXPIRED);

      // Verify offer in database transitioned to expired
      const updatedOffer = await Offer.findById(offer._id);
      expect(updatedOffer?.status).toBe(OfferStatus.EXPIRED);

      // Verify automated message was created in conversation
      const messages = await Message.find({ conversationId: conversation._id });
      const expiryMessage = messages.find((m) => m.messageType === MessageType.OFFER_EVENT);
      expect(expiryMessage).toBeDefined();
      expect(expiryMessage?.text).toContain('expired after 24 hours');
    });

    it('offerExpiration: worker should not expire already accepted or countered offers', async () => {
      const acceptedOffer = await Offer.create({
        conversationId: conversation._id,
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        amount: 175000,
        status: OfferStatus.ACCEPTED,
        round: 1
      });

      const mockJob = {
        data: { offerId: acceptedOffer._id.toString() },
        id: 'job-2'
      } as any;

      const result = await processOfferExpiration(mockJob);
      expect(result.expired).toBe(false);

      const dbOffer = await Offer.findById(acceptedOffer._id);
      expect(dbOffer?.status).toBe(OfferStatus.ACCEPTED);
    });

    it('priceDropAlert: schedulePriceDropAlert should debounce jobs with 5-minute delay', async () => {
      expect(priceDropAlertQueue.name).toBe('price-drop-alert');

      const job1 = await schedulePriceDropAlert(listing._id.toString(), 180000, 175000);
      expect(job1).toBeDefined();
      expect(job1.opts.delay).toBe(5 * 60 * 1000);
      expect(job1.id).toBe(`price_drop:${listing._id.toString()}`);

      // Second price change within debounce window
      const job2 = await schedulePriceDropAlert(listing._id.toString(), 175000, 160000);
      expect(job2.id).toBe(`price_drop:${listing._id.toString()}`);
      expect(job2.data.newPrice).toBe(160000);
    });

    it('priceDropAlert: worker should find favorites where priceAtSave > newPrice and dispatch alerts', async () => {
      // Buyer saved at 180,000 BDT
      await Favorite.create({
        userId: buyer._id,
        listingId: listing._id,
        priceAtSave: 180000
      });

      // Another user saved at 150,000 BDT (should NOT get alert for 160,000 BDT)
      const buyer2 = await User.create({
        phone: `+88019${Math.floor(10000000 + Math.random() * 90000000)}`,
        displayName: 'Buyer Two',
        role: UserRole.CITIZEN,
        notificationPreferences: { priceDropAlerts: true }
      });
      await Favorite.create({
        userId: buyer2._id,
        listingId: listing._id,
        priceAtSave: 150000
      });

      // Third user saved at 180,000 BDT but disabled price drop notifications
      const buyer3 = await User.create({
        phone: `+88016${Math.floor(10000000 + Math.random() * 90000000)}`,
        displayName: 'Buyer Three',
        role: UserRole.CITIZEN,
        notificationPreferences: { priceDropAlerts: false }
      });
      await Favorite.create({
        userId: buyer3._id,
        listingId: listing._id,
        priceAtSave: 180000
      });

      const mockJob = {
        data: {
          listingId: listing._id.toString(),
          oldPrice: 180000,
          newPrice: 160000
        },
        id: `price_drop:${listing._id.toString()}`
      } as any;

      const result = await processPriceDropAlert(mockJob);
      expect(result.eligibleCount).toBe(2); // buyer and buyer3 had priceAtSave (180k) > newPrice (160k)
      expect(result.alertsDispatched).toBe(1); // Only buyer had notificationPreferences.priceDropAlerts === true
    });

    it('listingLifecycle: initListingLifecycleCron should register repeatable hourly cron job', async () => {
      expect(listingLifecycleQueue.name).toBe('listing-lifecycle');

      const job = await initListingLifecycleCron();
      expect(job).toBeDefined();
      expect(job.opts.repeat?.pattern).toBe('0 * * * *');
    });

    it('listingLifecycle: worker should query active listings with expiresAt < now() and mark them expired', async () => {
      // 1. Expired listing (created with past expiresAt)
      const expiredListing = await Listing.create({
        sellerId: seller._id,
        title: 'Old Laptop Already Past 30 Days',
        description: 'Old laptop listed a long time ago and past deadline',
        price: 35000,
        condition: ListingCondition.GENTLY_USED,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.8103],
          division: 'Dhaka',
          thana: 'Gulshan'
        },
        imageUrls: ['https://s3.ap-southeast-1.amazonaws.com/laptop.jpg'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in the past
      });

      // 2. Fresh listing (expires in 30 days)
      const freshListing = await Listing.create({
        sellerId: seller._id,
        title: 'Brand New iPhone 16 Pro Max',
        description: 'Brand new in box unactivated smartphone',
        price: 150000,
        condition: ListingCondition.BRAND_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.8103],
          division: 'Dhaka',
          thana: 'Gulshan'
        },
        imageUrls: ['https://s3.ap-southeast-1.amazonaws.com/iphone.jpg'],
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      const mockJob = {
        data: {},
        id: 'cron-job-1'
      } as any;

      const result = await processListingLifecycle(mockJob);
      expect(result.expiredCount).toBeGreaterThanOrEqual(1);

      // Verify past listing is now EXPIRED
      const updatedOldListing = await Listing.findById(expiredListing._id);
      expect(updatedOldListing?.status).toBe(ListingStatus.EXPIRED);

      // Verify fresh listing is still ACTIVE
      const updatedFreshListing = await Listing.findById(freshListing._id);
      expect(updatedFreshListing?.status).toBe(ListingStatus.ACTIVE);
    });
  });
});
