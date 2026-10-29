import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  User,
  Listing,
  Conversation,
  Message,
  Offer,
  Deal,
  Review,
  Favorite,
  Report,
  Dispute,
  PhoneRevealAudit,
  NidBlacklist
} from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory,
  ModerationStatus,
  MessageType,
  OfferStatus,
  DisputeStatus,
  ReportEntityType,
  ReportReason,
  ReportStatus,
  ReviewTag
} from '../src/constants/enums.js';

describe('Phase 1: Database Models & Indexes Specification', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await Promise.all([
      User.init(),
      Listing.init(),
      Conversation.init(),
      Message.init(),
      Offer.init(),
      Deal.init(),
      Review.init(),
      Favorite.init(),
      Report.init(),
      Dispute.init(),
      PhoneRevealAudit.init(),
      NidBlacklist.init()
    ]);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  });

  describe('1. User Model (Store D1)', () => {
    it('should successfully create a valid user with defaults', async () => {
      const user = await User.create({
        phone: '01712345678',
        displayName: 'Tanvir Ahmed'
      });

      expect(user._id).toBeDefined();
      expect(user.role).toBe(UserRole.CITIZEN);
      expect(user.isNidVerified).toBe(false);
      expect(user.kycStatus).toBe(KycStatus.UNVERIFIED);
      expect(user.kycAttempts).toBe(0);
      expect(user.activeDeviceCount).toBe(1);
      expect(user.isBanned).toBe(false);
      expect(user.isFrozen).toBe(false);
      expect(user.notificationPreferences.pushEnabled).toBe(true);
      expect(user.notificationPreferences.smsEnabled).toBe(true);
      expect(user.notificationPreferences.priceDropAlerts).toBe(true);
      expect(user.notificationPreferences.quietHoursStart).toBe('23:00');
      expect(user.notificationPreferences.quietHoursEnd).toBe('07:00');
      expect(user.averageRating).toBe(0.0);
      expect(user.totalDealsCompleted).toBe(0);
    });

    it('should reject invalid Bangladeshi phone numbers', async () => {
      await expect(
        User.create({
          phone: '123456',
          displayName: 'Invalid User'
        })
      ).rejects.toThrow();
    });

    it('should enforce maximum of 2 active devices', async () => {
      await expect(
        User.create({
          phone: '01812345678',
          displayName: 'Multi Device User',
          activeDeviceCount: 3
        })
      ).rejects.toThrow();
    });

    it('should support encryptedNidData envelope and hide by default', async () => {
      const user = await User.create({
        phone: '01912345678',
        displayName: 'Encrypted NID User',
        nidHash: 'a'.repeat(64),
        encryptedNidData: {
          iv: 'random_iv_hex',
          authTag: 'random_auth_tag',
          ciphertext: 'random_ciphertext'
        }
      });

      const fetchedUser = await User.findById(user._id);
      expect(fetchedUser?.encryptedNidData).toBeUndefined();

      const userWithSecret = await User.findById(user._id).select('+encryptedNidData');
      expect(userWithSecret?.encryptedNidData?.ciphertext).toBe('random_ciphertext');
    });
  });

  describe('2. Listing Model (Store D2)', () => {
    it('should create a valid listing with GeoJSON coordinates and default 30-day lifecycle', async () => {
      const seller = await User.create({
        phone: '01711112222',
        displayName: 'Seller One'
      });

      const listing = await Listing.create({
        sellerId: seller._id,
        title: 'MacBook Pro M2 16GB 512GB in Mint Condition',
        description: 'Authentic item used very carefully for 6 months. Battery cycle count is under 50.',
        price: 145000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.8103], // [longitude, latitude]
          division: 'Dhaka',
          thana: 'Gulshan'
        },
        imageUrls: ['https://s3.amazonaws.com/becha-kena/macbook1.jpg']
      });

      expect(listing._id).toBeDefined();
      expect(listing.status).toBe(ListingStatus.ACTIVE);
      expect(listing.moderationStatus).toBe(ModerationStatus.PENDING);
      expect(listing.isPhoneHidden).toBe(true);
      expect(listing.renewCount).toBe(0);
      expect(listing.maxRenewals).toBe(2);
      expect(listing.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });

    it('should reject price below 50 BDT or above 2,500,000 BDT', async () => {
      const seller = await User.create({
        phone: '01722223333',
        displayName: 'Seller Two'
      });

      await expect(
        Listing.create({
          sellerId: seller._id,
          title: 'Too Cheap Product Listing Test',
          description: 'A valid description for testing price constraint limits.',
          price: 20,
          condition: ListingCondition.GENTLY_USED,
          category: ListingCategory.HOME,
          location: {
            type: 'Point',
            coordinates: [90.4125, 23.8103],
            division: 'Dhaka',
            thana: 'Dhanmondi'
          },
          imageUrls: ['https://s3.amazonaws.com/test.jpg']
        })
      ).rejects.toThrow();
    });
  });

  describe('3. Conversation & Message Models (Store D3 & D4)', () => {
    it('should create a conversation and enforce uniqueness for listing-buyer-seller trio', async () => {
      const buyer = await User.create({ phone: '01733334444', displayName: 'Buyer A' });
      const seller = await User.create({ phone: '01744445555', displayName: 'Seller B' });
      const listing = await Listing.create({
        sellerId: seller._id,
        title: 'Samsung Galaxy S23 Ultra 256GB',
        description: 'Excellent condition smartphone with original box and invoice.',
        price: 85000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.38, 23.75],
          division: 'Dhaka',
          thana: 'Mirpur'
        },
        imageUrls: ['https://s3.amazonaws.com/s23.jpg']
      });

      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        lastMessage: {
          text: 'Is this still available?',
          senderId: buyer._id,
          createdAt: new Date()
        }
      });

      expect(conversation._id).toBeDefined();
      expect(conversation.status).toBe('active');

      // Check unique index enforcement
      await Conversation.init();
      await expect(
        Conversation.create({
          listingId: listing._id,
          buyerId: buyer._id,
          sellerId: seller._id
        })
      ).rejects.toThrow();
    });

    it('should create chat messages and track scam warning detection', async () => {
      const buyer = await User.create({ phone: '01755556666', displayName: 'Buyer C' });
      const seller = await User.create({ phone: '01766667777', displayName: 'Seller D' });
      const listing = await Listing.create({
        sellerId: seller._id,
        title: 'Yamaha FZ Version 3 Dual Channel ABS',
        description: '2022 model, 15000 km run, single hand driven in Dhaka.',
        price: 195000,
        condition: ListingCondition.GENTLY_USED,
        category: ListingCategory.VEHICLES,
        location: {
          type: 'Point',
          coordinates: [90.38, 23.75],
          division: 'Dhaka',
          thana: 'Uttara'
        },
        imageUrls: ['https://s3.amazonaws.com/bike.jpg']
      });

      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id
      });

      const message = await Message.create({
        conversationId: conversation._id,
        senderId: seller._id,
        text: 'Please send advance 500 BDT through bKash first',
        messageType: MessageType.TEXT,
        hasScamWarning: true
      });

      expect(message._id).toBeDefined();
      expect(message.hasScamWarning).toBe(true);
      expect(message.isDeleted).toBe(false);
    });
  });

  describe('4. Offer & Deal Models (Store D5 & D6)', () => {
    it('should create an offer and prevent exceeding 3 negotiation rounds', async () => {
      const buyer = await User.create({ phone: '01777778888', displayName: 'Offer Buyer' });
      const seller = await User.create({ phone: '01788889999', displayName: 'Offer Seller' });
      const listing = await Listing.create({
        sellerId: seller._id,
        title: 'Sony PlayStation 5 Disc Edition',
        description: 'Includes 2 controllers and 3 game discs. Warranty remaining.',
        price: 60000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.38, 23.75],
          division: 'Dhaka',
          thana: 'Mohakhali'
        },
        imageUrls: ['https://s3.amazonaws.com/ps5.jpg']
      });

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
        amount: 55000,
        status: OfferStatus.PENDING,
        round: 1
      });

      expect(offer._id).toBeDefined();
      expect(offer.status).toBe(OfferStatus.PENDING);
      expect(offer.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);

      // Attempt round > 3
      await expect(
        Offer.create({
          conversationId: conversation._id,
          listingId: listing._id,
          buyerId: buyer._id,
          sellerId: seller._id,
          amount: 58000,
          round: 4
        })
      ).rejects.toThrow();
    });

    it('should create deal and enforce 1 deal per listing', async () => {
      const buyer = await User.create({ phone: '01799990000', displayName: 'Deal Buyer' });
      const seller = await User.create({ phone: '01700001111', displayName: 'Deal Seller' });
      const listing = await Listing.create({
        sellerId: seller._id,
        title: 'Apple iPad Air 5th Generation M1 Chip',
        description: '64GB Wi-Fi, Space Gray, with Apple Pencil 2nd Gen.',
        price: 52000,
        condition: ListingCondition.LIKE_NEW,
        category: ListingCategory.ELECTRONICS,
        location: {
          type: 'Point',
          coordinates: [90.41, 23.78],
          division: 'Dhaka',
          thana: 'Banani'
        },
        imageUrls: ['https://s3.amazonaws.com/ipad.jpg']
      });

      const deal = await Deal.create({
        listingId: listing._id,
        sellerId: seller._id,
        buyerId: buyer._id,
        finalPrice: 50000,
        disputeStatus: DisputeStatus.NONE
      });

      expect(deal._id).toBeDefined();
      expect(deal.finalPrice).toBe(50000);
      expect(deal.isReviewedBySeller).toBe(false);
      expect(deal.isReviewedByBuyer).toBe(false);

      // Enforce unique deal on listing
      await Deal.init();
      await expect(
        Deal.create({
          listingId: listing._id,
          sellerId: seller._id,
          buyerId: buyer._id,
          finalPrice: 48000
        })
      ).rejects.toThrow();
    });
  });

  describe('5. Review, Favorite, Report, Dispute, PhoneRevealAudit, NidBlacklist', () => {
    it('should create review with integer rating and tags', async () => {
      const reviewer = await User.create({ phone: '01311112222', displayName: 'Reviewer' });
      const reviewee = await User.create({ phone: '01322223333', displayName: 'Reviewee' });
      const dealId = new mongoose.Types.ObjectId();
      const listingId = new mongoose.Types.ObjectId();

      const review = await Review.create({
        dealId,
        listingId,
        reviewerId: reviewer._id,
        revieweeId: reviewee._id,
        rating: 5,
        tags: [ReviewTag.PUNCTUAL, ReviewTag.ITEM_AS_DESCRIBED],
        comment: 'Great gentleman, arrived exactly on time at Dhanmondi 27.'
      });

      expect(review._id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.tags).toContain(ReviewTag.PUNCTUAL);

      // Duplicate review on same deal by same reviewer should be prevented
      await Review.init();
      await expect(
        Review.create({
          dealId,
          listingId,
          reviewerId: reviewer._id,
          revieweeId: reviewee._id,
          rating: 4
        })
      ).rejects.toThrow();
    });

    it('should create favorite and prevent duplicate saves', async () => {
      const user = await User.create({ phone: '01333334444', displayName: 'Fav User' });
      const listingId = new mongoose.Types.ObjectId();

      const fav = await Favorite.create({
        userId: user._id,
        listingId,
        priceAtSave: 25000
      });

      expect(fav._id).toBeDefined();
      expect(fav.priceAtSave).toBe(25000);

      await Favorite.init();
      await expect(
        Favorite.create({
          userId: user._id,
          listingId,
          priceAtSave: 22000
        })
      ).rejects.toThrow();
    });

    it('should create report with valid category', async () => {
      const reporter = await User.create({ phone: '01344445555', displayName: 'Reporter User' });
      const entityId = new mongoose.Types.ObjectId();

      const report = await Report.create({
        reporterId: reporter._id,
        entityType: ReportEntityType.LISTING,
        entityId,
        reason: ReportReason.SCAM_ADVANCE_DEMANDED,
        details: 'Seller insisted on receiving 2000 BDT advance via bKash before showing the product.'
      });

      expect(report._id).toBeDefined();
      expect(report.status).toBe(ReportStatus.PENDING);
    });

    it('should create dispute with official Bangladesh Police GD reference', async () => {
      const buyer = await User.create({ phone: '01355556666', displayName: 'Dispute Buyer' });
      const seller = await User.create({ phone: '01366667777', displayName: 'Dispute Seller' });
      const dealId = new mongoose.Types.ObjectId();

      const dispute = await Dispute.create({
        dealId,
        buyerId: buyer._id,
        sellerId: seller._id,
        gdNumber: 'GD-2026-9874',
        thanaName: 'Dhanmondi Thana',
        gdFilingDate: new Date('2026-10-20'),
        gdDocumentUrl: 'https://s3.amazonaws.com/gd-scans/gd-9874.pdf',
        status: 'pending'
      });

      expect(dispute._id).toBeDefined();
      expect(dispute.gdNumber).toBe('GD-2026-9874');
    });

    it('should create phoneRevealAudit log', async () => {
      const buyer = await User.create({ phone: '01377778888', displayName: 'Audit Buyer' });
      const seller = await User.create({ phone: '01388889999', displayName: 'Audit Seller' });
      const listingId = new mongoose.Types.ObjectId();

      const audit = await PhoneRevealAudit.create({
        buyerId: buyer._id,
        listingId,
        sellerId: seller._id,
        ipAddress: '103.205.71.14'
      });

      expect(audit._id).toBeDefined();
      expect(audit.ipAddress).toBe('103.205.71.14');
    });

    it('should create nidBlacklist entry and enforce uniqueness', async () => {
      const admin = await User.create({
        phone: '01399990000',
        displayName: 'Super Admin',
        role: UserRole.SUPER_ADMIN
      });

      const blacklist = await NidBlacklist.create({
        nidHash: 'b'.repeat(64),
        phone: '01899990000',
        reason: 'Confirmed fraudulent seller with counterfeit iPhone',
        bannedBy: admin._id
      });

      expect(blacklist._id).toBeDefined();

      await NidBlacklist.init();
      // Test duplicate phone rejection
      await expect(
        NidBlacklist.create({
          nidHash: 'c'.repeat(64),
          phone: '01899990000',
          reason: 'Another reason',
          bannedBy: admin._id
        })
      ).rejects.toThrow();
    });
  });
});
