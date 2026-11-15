import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import http from 'http';
import express from 'express';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSocketServer } from '../src/sockets/socketServer.js';
import { User, Listing, Conversation, Message } from '../src/models/index.js';
import {
  UserRole,
  KycStatus,
  ListingStatus,
  ListingCondition,
  ListingCategory
} from '../src/constants/enums.js';
import { ErrorCodes } from '../src/constants/errorCodes.js';
import { signAccessToken } from '../src/utils/token.js';
import {
  detectScamPatterns,
  stripExternalLinks,
  SCAM_WARNING_MESSAGE
} from '../src/utils/scamDetector.js';

describe('Phase 7: Real-Time Chat & Advance Payment Scam Shield Specification', () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Express;
  let httpServer: http.Server;
  let serverPort: number;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = createApp();
    httpServer = http.createServer(app);
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        serverPort = typeof addr === 'object' && addr ? addr.port : 5000;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Listing.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
  });

  const createUserAndToken = async (overrides: Partial<any> = {}) => {
    const user = await User.create({
      phone: overrides.phone || `+88017${Math.floor(10000000 + Math.random() * 90000000)}`,
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

  const createSampleListing = async (sellerId: mongoose.Types.ObjectId) => {
    return await Listing.create({
      sellerId,
      title: 'Apple iPhone 13 128GB Midnight Blue',
      description: 'Original device with box and invoice. Battery health 87%. No scratch or dent.',
      price: 54000,
      condition: ListingCondition.LIKE_NEW,
      category: ListingCategory.ELECTRONICS,
      location: {
        type: 'Point',
        coordinates: [90.3742, 23.7461],
        division: 'Dhaka',
        thana: 'Dhanmondi'
      },
      imageUrls: ['https://cdn.becha-kena.com/listings/img_1.webp'],
      status: ListingStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  describe('7.1 — Scam Pattern Detector & Phishing Link Stripper Utilities', () => {
    it('detectScamPatterns: should detect advance payment fraud keywords in Bengali and English', () => {
      expect(detectScamPatterns('Please pay 1000 BDT advance before courier delivery')).toBe(true);
      expect(detectScamPatterns('Send bkash fee first to confirm booking')).toBe(true);
      expect(detectScamPatterns('Delivery charge nagad a pathan')).toBe(true);
      expect(detectScamPatterns('Booking fee send money first')).toBe(true);
      expect(detectScamPatterns('ভাই অগ্রিম ১০০০ টাকা বিকাশ করুন')).toBe(true);
      expect(detectScamPatterns('নগদ নাম্বারে ডেলিভারি চার্জ পাঠান')).toBe(true);
    });

    it('detectScamPatterns: should return false for legitimate conversation', () => {
      expect(detectScamPatterns('Is this phone still available? Can I inspect it in Dhanmondi?')).toBe(false);
      expect(detectScamPatterns('What is your last price?')).toBe(false);
      expect(detectScamPatterns('I will pay full cash upon meetup.')).toBe(false);
    });

    it('stripExternalLinks: should strip http, https, and .apk patterns to prevent courier phishing attacks', () => {
      const malicious = 'Track your package here: https://phishing-courier.com/login and download fake_courier.apk now!';
      const sanitized = stripExternalLinks(malicious);

      expect(sanitized).not.toContain('https://phishing-courier.com/login');
      expect(sanitized).not.toContain('fake_courier.apk');
      expect(sanitized).toBe('Track your package here: and download now!');
    });
  });

  describe('7.2 — REST Chat Endpoints (/api/v1/chats)', () => {
    it('POST /api/v1/chats/initiate: should reject unverified citizen with 403 KYC_REQUIRED', async () => {
      const { user: seller } = await createUserAndToken();
      const { token: unverifiedToken } = await createUserAndToken({ isNidVerified: false });
      const listing = await createSampleListing(seller._id);

      const res = await request(app)
        .post('/api/v1/chats/initiate')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({ listingId: listing._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.KYC_REQUIRED);
    });

    it('POST /api/v1/chats/initiate: should reject seller chatting on own listing', async () => {
      const { user: seller, token: sellerToken } = await createUserAndToken();
      const listing = await createSampleListing(seller._id);

      const res = await request(app)
        .post('/api/v1/chats/initiate')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ listingId: listing._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCodes.BAD_REQUEST);
    });

    it('POST /api/v1/chats/initiate: should upsert conversation and increment listing inquiryCount', async () => {
      const { user: seller } = await createUserAndToken();
      const { user: buyer, token: buyerToken } = await createUserAndToken();
      const listing = await createSampleListing(seller._id);
      expect(listing.inquiryCount).toBe(0);

      // 1. Initial creation
      const res1 = await request(app)
        .post('/api/v1/chats/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: listing._id.toString() });

      expect(res1.status).toBe(200);
      expect(res1.body.data.conversationId).toBeDefined();
      expect(res1.body.data.seller.id).toBe(seller._id.toString());
      expect(res1.body.data.buyer.id).toBe(buyer._id.toString());

      const updatedListing = await Listing.findById(listing._id);
      expect(updatedListing?.inquiryCount).toBe(1);

      // 2. Second request returns same conversation document (enforces single thread)
      const res2 = await request(app)
        .post('/api/v1/chats/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ listingId: listing._id.toString() });

      expect(res2.status).toBe(200);
      expect(res2.body.data.conversationId).toBe(res1.body.data.conversationId);

      const totalConvs = await Conversation.countDocuments({ listingId: listing._id });
      expect(totalConvs).toBe(1);
    });

    it('GET /api/v1/chats: should list user inbox with counterpart and preview', async () => {
      const { user: seller } = await createUserAndToken({ displayName: 'Seller Sarah' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ displayName: 'Buyer Bobby' });
      const listing = await createSampleListing(seller._id);

      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id,
        lastMessage: {
          text: 'Hello, can you do 50,000 BDT?',
          senderId: buyer._id,
          createdAt: new Date()
        }
      });

      const res = await request(app)
        .get('/api/v1/chats')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].conversationId).toBe(conversation._id.toString());
      expect(res.body.data[0].counterpart.displayName).toBe('Seller Sarah');
      expect(res.body.data[0].lastMessage.text).toBe('Hello, can you do 50,000 BDT?');
    });

    it('POST /api/v1/chats/:conversationId/messages: should reject non-participant with 403', async () => {
      const { user: seller } = await createUserAndToken();
      const { user: buyer } = await createUserAndToken();
      const { token: strangerToken } = await createUserAndToken();
      const listing = await createSampleListing(seller._id);

      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id
      });

      const res = await request(app)
        .post(`/api/v1/chats/${conversation._id}/messages`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ text: 'Unauthorized intruder message' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCodes.UNAUTHORIZED_CHAT_ACTION);
    });

    it('POST /api/v1/chats/:conversationId/messages: should strip external links and attach scam warning', async () => {
      const { user: seller } = await createUserAndToken();
      const { user: buyer, token: buyerToken } = await createUserAndToken();
      const listing = await createSampleListing(seller._id);

      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id
      });

      const res = await request(app)
        .post(`/api/v1/chats/${conversation._id}/messages`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          text: 'Can you pay 500 BDT advance via bKash courier charge? Track at https://courier-scam.com/delivery'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.text).not.toContain('https://courier-scam.com/delivery');
      expect(res.body.data.hasScamWarning).toBe(true);
      expect(res.body.data.warningText).toBe(SCAM_WARNING_MESSAGE);

      // Verify denormalized preview on conversation
      const updatedConv = await Conversation.findById(conversation._id);
      expect(updatedConv?.lastMessage?.text).toBe(res.body.data.text);
    });

    it('GET /api/v1/chats/:conversationId/messages: should fetch chronological message history', async () => {
      const { user: seller } = await createUserAndToken();
      const { user: buyer, token: buyerToken } = await createUserAndToken();
      const listing = await createSampleListing(seller._id);

      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id
      });

      await Message.create([
        {
          conversationId: conversation._id,
          senderId: buyer._id,
          text: 'First question about battery health.',
          createdAt: new Date(Date.now() - 5000)
        },
        {
          conversationId: conversation._id,
          senderId: seller._id,
          text: 'Battery health is 87 percent original.',
          createdAt: new Date()
        }
      ]);

      const res = await request(app)
        .get(`/api/v1/chats/${conversation._id}/messages`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].text).toBe('First question about battery health.');
      expect(res.body.data[1].text).toBe('Battery health is 87 percent original.');
    });
  });

  describe('7.3 — Socket.io WebSocket Handshake & Real-Time Messaging', () => {
    it('should reject socket connection without authentication token', (done) => {
      const socket = ClientSocket(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        reconnection: false
      });

      socket.on('connect_error', (err) => {
        expect(err.message).toBe('Authentication token required');
        socket.disconnect();
        done();
      });
    });

    it('should reject socket connection if citizen account is frozen', async () => {
      const { token: frozenToken } = await createUserAndToken({ isFrozen: true });

      await new Promise<void>((resolve) => {
        const socket = ClientSocket(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          reconnection: false,
          auth: { token: frozenToken }
        });

        socket.on('connect_error', (err) => {
          expect(err.message).toContain('Account is frozen');
          socket.disconnect();
          resolve();
        });
      });
    });

    it('should connect authenticated socket and handle join_conversation, send_message, and typing events', async () => {
      const { user: seller, token: sellerToken } = await createUserAndToken({ displayName: 'Seller' });
      const { user: buyer, token: buyerToken } = await createUserAndToken({ displayName: 'Buyer' });
      const listing = await createSampleListing(seller._id);

      const conversation = await Conversation.create({
        listingId: listing._id,
        buyerId: buyer._id,
        sellerId: seller._id
      });

      // Connect seller socket client
      const sellerSocket: ClientSocketType = ClientSocket(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token: sellerToken }
      });

      // Connect buyer socket client
      const buyerSocket: ClientSocketType = ClientSocket(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        auth: { token: buyerToken }
      });

      await Promise.all([
        new Promise<void>((resolve) => sellerSocket.on('connect', resolve)),
        new Promise<void>((resolve) => buyerSocket.on('connect', resolve))
      ]);

      // Both join conversation room
      await new Promise<void>((resolve) => {
        sellerSocket.emit('join_conversation', { conversationId: conversation._id.toString() }, resolve);
      });
      await new Promise<void>((resolve) => {
        buyerSocket.emit('join_conversation', { conversationId: conversation._id.toString() }, resolve);
      });

      // Test real-time message broadcasting with scam detector
      const messagePromise = new Promise<void>((resolve) => {
        sellerSocket.on('new_message', (msg: any) => {
          expect(msg.conversationId.toString()).toBe(conversation._id.toString());
          expect(msg.senderId).toBe(buyer._id.toString());
          expect(msg.text).toContain('Send 500 BDT advance via bkash');
          expect(msg.hasScamWarning).toBe(true);
          expect(msg.warningText).toBe(SCAM_WARNING_MESSAGE);
          resolve();
        });
      });

      // Buyer sends message over socket
      buyerSocket.emit('send_message', {
        conversationId: conversation._id.toString(),
        text: 'Send 500 BDT advance via bkash please'
      });

      await messagePromise;

      // Test typing indicator
      const typingPromise = new Promise<void>((resolve) => {
        sellerSocket.on('user_typing', (data: any) => {
          expect(data.userId).toBe(buyer._id.toString());
          expect(data.isTyping).toBe(true);
          resolve();
        });
      });

      buyerSocket.emit('typing', {
        conversationId: conversation._id.toString(),
        isTyping: true
      });

      await typingPromise;

      sellerSocket.disconnect();
      buyerSocket.disconnect();
    });
  });
});
