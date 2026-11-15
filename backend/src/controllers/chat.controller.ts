import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { Listing } from '../models/listing.model.js';
import { User } from '../models/user.model.js';
import { MessageType } from '../constants/enums.js';
import { stripExternalLinks, detectScamPatterns, SCAM_WARNING_MESSAGE } from '../utils/scamDetector.js';
import { getSocketServerOrNull } from '../sockets/socketServer.js';
import { sendSuccess } from '../utils/response.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError
} from '../errors/index.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * POST /api/v1/chats/initiate (and /api/v1/chats/start)
 * Starts or retrieves existing 1-to-1 conversation thread between buyer & seller.
 * Enforces single conversation thread per buyer-seller-ad trio.
 */
export const initiateConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const buyerId = req.user?.userId;
    const { listingId } = req.body;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      throw new BadRequestError('Invalid listing ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const listing = await Listing.findOne({ _id: listingId, deletedAt: null });
    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    // Prevent seller from starting a chat with themselves on their own listing
    if (listing.sellerId.toString() === buyerId) {
      throw new BadRequestError(
        'Seller cannot start a chat with themselves on their own listing.',
        ErrorCodes.BAD_REQUEST
      );
    }

    const seller = await User.findById(listing.sellerId);
    if (!seller || seller.isBanned) {
      throw new ForbiddenError(
        'The seller account is unavailable or suspended.',
        ErrorCodes.ACCOUNT_BANNED
      );
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) {
      throw new NotFoundError('Buyer account not found.', ErrorCodes.NOT_FOUND);
    }

    // Upsert conversation thread
    const buyerObjectId = new mongoose.Types.ObjectId(buyerId);
    const sellerObjectId = listing.sellerId;

    const conversation = await Conversation.findOneAndUpdate(
      { listingId: listing._id, buyerId: buyerObjectId, sellerId: sellerObjectId },
      {
        $setOnInsert: {
          listingId: listing._id,
          buyerId: buyerObjectId,
          sellerId: sellerObjectId,
          status: 'active'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Atomically increment inquiry count on listing
    await Listing.findByIdAndUpdate(listing._id, { $inc: { inquiryCount: 1 } });

    sendSuccess(
      res,
      {
        id: conversation._id.toString(),
        conversationId: conversation._id.toString(),
        listing: {
          id: listing._id,
          title: listing.title,
          price: listing.price,
          status: listing.status,
          thumbnailUrl: listing.imageUrls?.[0] || null
        },
        seller: {
          id: seller._id,
          displayName: seller.displayName,
          isNidVerified: seller.isNidVerified
        },
        buyer: {
          id: buyer._id,
          displayName: buyer.displayName,
          isNidVerified: buyer.isNidVerified
        },
        createdAt: conversation.createdAt
      },
      200,
      'Conversation thread ready.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/chats
 * Lists all conversations for the authenticated user, sorted by most recent message.
 */
export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await Conversation.find({
      $or: [{ buyerId: userObjectId }, { sellerId: userObjectId }],
      status: { $ne: 'archived' }
    })
      .sort({ updatedAt: -1 })
      .populate('listingId', 'title price status imageUrls')
      .populate('buyerId', 'displayName avatarUrl isNidVerified')
      .populate('sellerId', 'displayName avatarUrl isNidVerified')
      .lean();

    const formatted = conversations
      .filter((c: any) => c.listingId)
      .map((c: any) => {
        const isBuyer = c.buyerId?._id?.toString() === userId;
        const counterpart = isBuyer ? c.sellerId : c.buyerId;
        const listing = c.listingId;

        return {
          id: c._id.toString(),
          conversationId: c._id.toString(),
          listingId: listing._id.toString(),
          listing: {
            id: listing._id.toString(),
            title: listing.title,
            price: listing.price,
            status: listing.status,
            thumbnailUrl: listing.imageUrls?.[0] || null
          },
          counterpart: {
            id: counterpart?._id?.toString(),
            displayName: counterpart?.displayName || 'Citizen',
            avatarUrl: counterpart?.avatarUrl || null,
            isNidVerified: counterpart?.isNidVerified ?? false
          },
          lastMessage: c.lastMessage
            ? {
                id: c._id.toString(),
                conversationId: c._id.toString(),
                senderId: c.lastMessage.senderId?.toString(),
                type: 'text',
                content: c.lastMessage.text,
                text: c.lastMessage.text,
                createdAt: c.lastMessage.createdAt
              }
            : null,
          unreadCount: 0,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        };
      });

    sendSuccess(res, formatted, 200, 'Conversations retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/chats/:conversationId/messages
 * Fetches message history in a thread with pagination.
 */
export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId as string;
    const { page = 1, limit = 30 } = req.query;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestError('Invalid conversation ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found.', ErrorCodes.CONVERSATION_NOT_FOUND);
    }

    const isParticipant =
      conversation.buyerId.toString() === userId ||
      conversation.sellerId.toString() === userId;

    if (!isParticipant) {
      throw new ForbiddenError(
        'You do not have permission to view messages in this conversation.',
        ErrorCodes.UNAUTHORIZED_CHAT_ACTION
      );
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Message.countDocuments({
      conversationId: conversation._id,
      isDeleted: false
    });

    const messages = await Message.find({
      conversationId: conversation._id,
      isDeleted: false
    })
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formatted = messages.map((m: any) => ({
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId: m.senderId.toString(),
      text: m.text,
      content: m.text,
      messageType: m.messageType || 'text',
      type: m.messageType || 'text',
      hasScamWarning: m.hasScamWarning,
      ...(m.hasScamWarning && { warningText: SCAM_WARNING_MESSAGE }),
      createdAt: m.createdAt
    }));

    sendSuccess(
      res,
      formatted,
      200,
      'Messages retrieved successfully.',
      {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/chats/:conversationId/messages
 * Sends message via HTTP fallback.
 * Strips phishing hyperlinks and scans for advance payment scam regex.
 */
export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId as string;
    const rawText = req.body.text || req.body.content || '';
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      throw new BadRequestError('Message text or content is required.', ErrorCodes.VALIDATION_ERROR);
    }

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestError('Invalid conversation ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found.', ErrorCodes.CONVERSATION_NOT_FOUND);
    }

    const isParticipant =
      conversation.buyerId.toString() === userId ||
      conversation.sellerId.toString() === userId;

    if (!isParticipant) {
      throw new ForbiddenError(
        'You do not have permission to post to this conversation.',
        ErrorCodes.UNAUTHORIZED_CHAT_ACTION
      );
    }

    // 1. Phishing & Courier link stripping
    const sanitizedText = stripExternalLinks(rawText);

    // 2. Advance scam detection
    const hasScamWarning = detectScamPatterns(sanitizedText);

    // 3. Save message
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: new mongoose.Types.ObjectId(userId),
      text: sanitizedText,
      messageType: MessageType.TEXT,
      hasScamWarning
    });

    // 4. Update Conversation denormalized preview
    conversation.lastMessage = {
      text: sanitizedText,
      senderId: new mongoose.Types.ObjectId(userId),
      createdAt: message.createdAt
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    const payload = {
      id: message._id.toString(),
      conversationId: conversation._id.toString(),
      senderId: userId,
      type: 'text',
      messageType: message.messageType,
      text: sanitizedText,
      content: sanitizedText,
      hasScamWarning,
      ...(hasScamWarning && { warningText: SCAM_WARNING_MESSAGE }),
      createdAt: message.createdAt
    };

    // 5. If Socket.io is active, emit to room
    const io = getSocketServerOrNull();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', payload);
    }

    sendSuccess(res, payload, 201, 'Message delivered.');
  } catch (error) {
    next(error);
  }
};
