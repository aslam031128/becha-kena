import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Conversation, Listing, Offer, Message } from '../models/index.js';
import { OfferStatus, ListingStatus, MessageType } from '../constants/enums.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import {
  ForbiddenError,
  NotFoundError,
  ConflictError
} from '../errors/HttpErrors.js';
import { BadRequestError } from '../errors/ValidationError.js';
import { sendSuccess } from '../utils/response.js';
import { scheduleOfferExpiration, cancelOfferExpiration } from '../queues/index.js';
import { getSocketServerOrNull } from '../sockets/socketServer.js';

/**
 * POST /api/v1/chats/:conversationId/offers
 * Buyer submits an offer (Round 1, max 3 offers/buyer/listing, 24h expiration).
 */
export const submitOffer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId as string;
    const { amount } = req.body;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestError('Invalid conversation ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found.', ErrorCodes.CONVERSATION_NOT_FOUND);
    }

    // Only buyer can initiate an offer
    if (conversation.buyerId.toString() !== userId) {
      if (conversation.sellerId.toString() === userId) {
        throw new ForbiddenError(
          'Sellers cannot make an initial offer on their own listing.',
          ErrorCodes.FORBIDDEN
        );
      }
      throw new ForbiddenError(
        'You are not a participant in this conversation.',
        ErrorCodes.UNAUTHORIZED_CHAT_ACTION
      );
    }

    const listing = await Listing.findById(conversation.listingId);
    if (!listing) {
      throw new NotFoundError('Listing not found.', ErrorCodes.LISTING_NOT_FOUND);
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new ConflictError(
        `Cannot submit offer because listing is currently ${listing.status}.`,
        ErrorCodes.CONFLICT
      );
    }

    // Validate offer amount
    if (typeof amount !== 'number' || amount < 50) {
      throw new BadRequestError('Minimum offer amount is 50 BDT.', ErrorCodes.VALIDATION_ERROR);
    }

    if (amount > listing.price) {
      throw new BadRequestError(
        `Offer amount cannot exceed listing asking price of ${listing.price} BDT.`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Anti-Spam Quota: Maximum 3 offers per buyer per listing
    const previousOffersCount = await Offer.countDocuments({
      listingId: listing._id,
      buyerId: conversation.buyerId
    });

    if (previousOffersCount >= 3) {
      throw new ForbiddenError(
        'You have reached the maximum limit of 3 offers for this listing.',
        ErrorCodes.OFFER_LIMIT_EXCEEDED
      );
    }

    // Check if there is already an active pending offer in this conversation
    const activePending = await Offer.findOne({
      listingId: listing._id,
      buyerId: conversation.buyerId,
      status: OfferStatus.PENDING
    });

    if (activePending) {
      throw new ConflictError(
        'You already have an active pending offer for this listing. Please wait for seller response.',
        ErrorCodes.CONFLICT
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

    const offer = await Offer.create({
      conversationId: conversation._id,
      listingId: listing._id,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      amount,
      status: OfferStatus.PENDING,
      round: 1,
      expiresAt
    });

    // Schedule delayed BullMQ expiration job (24 hours)
    await scheduleOfferExpiration(offer._id.toString(), 24 * 60 * 60 * 1000);

    // Create chat event message in negotiation thread
    const eventText = `Offer submitted: ৳${amount.toLocaleString('en-US')}`;
    const chatMessage = await Message.create({
      conversationId: conversation._id,
      senderId: conversation.buyerId,
      text: eventText,
      messageType: MessageType.OFFER_EVENT
    });

    // Update conversation lastMessage preview
    conversation.lastMessage = {
      text: eventText,
      senderId: conversation.buyerId,
      createdAt: new Date()
    };
    await conversation.save();

    // Broadcast real-time events via Socket.io
    const io = getSocketServerOrNull();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        id: chatMessage._id,
        conversationId: conversation._id,
        senderId: conversation.buyerId,
        text: eventText,
        messageType: MessageType.OFFER_EVENT,
        createdAt: chatMessage.createdAt
      });

      io.to(`conversation:${conversationId}`).emit('offer_submitted', {
        offerId: offer._id,
        amount: offer.amount,
        round: offer.round,
        expiresAt: offer.expiresAt,
        buyerId: offer.buyerId
      });
    }

    sendSuccess(
      res,
      {
        offerId: offer._id,
        conversationId: offer.conversationId,
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        amount: offer.amount,
        round: offer.round,
        status: offer.status,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt
      },
      201,
      'Offer sent successfully. Please wait for seller approval.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/chats/:conversationId/offers/:offerId/counter
 * Counter-offer by seller or buyer. Advances round by 1 (max round 3).
 */
export const counterOffer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    const conversationId = req.params.conversationId as string;
    const offerId = req.params.offerId as string;
    const { amount } = req.body;

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
      throw new BadRequestError('Invalid offer ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const offer = await Offer.findById(offerId);
    if (!offer || offer.conversationId.toString() !== conversationId) {
      throw new NotFoundError('Offer not found.', ErrorCodes.OFFER_NOT_FOUND);
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
        'You are not authorized to counter this offer.',
        ErrorCodes.UNAUTHORIZED_CHAT_ACTION
      );
    }

    // Must be in pending status
    if (offer.status !== OfferStatus.PENDING) {
      throw new ConflictError(
        `Cannot counter an offer that is already ${offer.status}.`,
        ErrorCodes.OFFER_ALREADY_RESOLVED
      );
    }

    // Check if expired
    if (new Date() > offer.expiresAt) {
      offer.status = OfferStatus.EXPIRED;
      await offer.save();
      throw new BadRequestError(
        'This offer has expired and can no longer be countered.',
        ErrorCodes.OFFER_EXPIRED
      );
    }

    // Max 3 rounds check
    if (offer.round >= 3) {
      throw new ForbiddenError(
        'Cannot exceed maximum of 3 counter rounds per buyer.',
        ErrorCodes.OFFER_LIMIT_EXCEEDED
      );
    }

    // Validate counter amount
    if (typeof amount !== 'number' || amount < 50) {
      throw new BadRequestError('Minimum offer amount is 50 BDT.', ErrorCodes.VALIDATION_ERROR);
    }

    // Mark previous offer as countered
    offer.status = OfferStatus.COUNTERED;
    await offer.save();

    // Cancel previous offer's expiration job
    await cancelOfferExpiration(offer._id.toString());

    // Create new linked counter-offer
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const counter = await Offer.create({
      conversationId: offer.conversationId,
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      amount,
      parentOfferId: offer._id,
      round: offer.round + 1,
      status: OfferStatus.PENDING,
      expiresAt: newExpiresAt
    });

    // Schedule delayed expiration for counter-offer
    await scheduleOfferExpiration(counter._id.toString(), 24 * 60 * 60 * 1000);

    // Chat message event
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const eventText = `Counter-offer: ৳${amount.toLocaleString('en-US')} (Round ${counter.round}/3)`;
    const chatMessage = await Message.create({
      conversationId: conversation._id,
      senderId: userObjectId,
      text: eventText,
      messageType: MessageType.OFFER_EVENT
    });

    conversation.lastMessage = {
      text: eventText,
      senderId: userObjectId,
      createdAt: new Date()
    };
    await conversation.save();

    // Broadcast via Socket.io
    const io = getSocketServerOrNull();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        id: chatMessage._id,
        conversationId: conversation._id,
        senderId: userObjectId,
        text: eventText,
        messageType: MessageType.OFFER_EVENT,
        createdAt: chatMessage.createdAt
      });

      io.to(`conversation:${conversationId}`).emit('offer_countered', {
        newOfferId: counter._id,
        parentOfferId: offer._id,
        amount: counter.amount,
        round: counter.round,
        expiresAt: counter.expiresAt
      });
    }

    sendSuccess(
      res,
      {
        newOfferId: counter._id,
        parentOfferId: offer._id,
        amount: counter.amount,
        round: counter.round,
        status: counter.status,
        expiresAt: counter.expiresAt
      },
      201,
      'Counter-offer sent successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/chats/:conversationId/offers/:offerId/accept
 * Seller accepts the offer. Updates listing status to under_offer.
 */
export const acceptOffer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    const conversationId = req.params.conversationId as string;
    const offerId = req.params.offerId as string;

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
      throw new BadRequestError('Invalid offer ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const offer = await Offer.findById(offerId);
    if (!offer || offer.conversationId.toString() !== conversationId) {
      throw new NotFoundError('Offer not found.', ErrorCodes.OFFER_NOT_FOUND);
    }

    // Only seller (or listing owner) can accept
    if (offer.sellerId.toString() !== userId) {
      throw new ForbiddenError(
        'Only the seller can accept an offer.',
        ErrorCodes.FORBIDDEN
      );
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new ConflictError(
        `Offer is already ${offer.status}.`,
        ErrorCodes.OFFER_ALREADY_RESOLVED
      );
    }

    if (new Date() > offer.expiresAt) {
      offer.status = OfferStatus.EXPIRED;
      await offer.save();
      throw new BadRequestError('Offer has expired.', ErrorCodes.OFFER_EXPIRED);
    }

    // Transition offer to ACCEPTED
    offer.status = OfferStatus.ACCEPTED;
    await offer.save();

    // Cancel expiration job
    await cancelOfferExpiration(offer._id.toString());

    // Update listing status to under_offer
    const listing = await Listing.findByIdAndUpdate(
      offer.listingId,
      { status: ListingStatus.UNDER_OFFER },
      { new: true }
    );

    // Chat notification
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const eventText = `Offer accepted! Agreed price: ৳${offer.amount.toLocaleString('en-US')}. Listing is now under offer.`;
    const chatMessage = await Message.create({
      conversationId: offer.conversationId,
      senderId: userObjectId,
      text: eventText,
      messageType: MessageType.OFFER_EVENT
    });

    const conversation = await Conversation.findById(offer.conversationId);
    if (conversation) {
      conversation.lastMessage = {
        text: eventText,
        senderId: userObjectId,
        createdAt: new Date()
      };
      await conversation.save();
    }

    // Socket.io emission
    const io = getSocketServerOrNull();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        id: chatMessage._id,
        conversationId: offer.conversationId,
        senderId: userObjectId,
        text: eventText,
        messageType: MessageType.OFFER_EVENT,
        createdAt: chatMessage.createdAt
      });

      io.to(`conversation:${conversationId}`).emit('offer_accepted', {
        offerId: offer._id,
        amount: offer.amount,
        listingStatus: ListingStatus.UNDER_OFFER
      });
    }

    sendSuccess(
      res,
      {
        offerId: offer._id,
        status: offer.status,
        finalPrice: offer.amount,
        listingStatus: listing?.status || ListingStatus.UNDER_OFFER
      },
      200,
      'Offer accepted and listing is now under offer.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/chats/:conversationId/offers/:offerId/decline
 * Declines the pending offer. Cancels expiration job.
 * If listing was under_offer from this offer chain, reverts to active.
 */
export const declineOffer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId as string;
    const conversationId = req.params.conversationId as string;
    const offerId = req.params.offerId as string;

    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
      throw new BadRequestError('Invalid offer ID format.', ErrorCodes.VALIDATION_ERROR);
    }

    const offer = await Offer.findById(offerId);
    if (!offer || offer.conversationId.toString() !== conversationId) {
      throw new NotFoundError('Offer not found.', ErrorCodes.OFFER_NOT_FOUND);
    }

    const isParticipant =
      offer.buyerId.toString() === userId ||
      offer.sellerId.toString() === userId;

    if (!isParticipant) {
      throw new ForbiddenError(
        'You are not authorized to decline this offer.',
        ErrorCodes.UNAUTHORIZED_CHAT_ACTION
      );
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new ConflictError(
        `Offer is already ${offer.status}.`,
        ErrorCodes.OFFER_ALREADY_RESOLVED
      );
    }

    // Transition offer to DECLINED
    offer.status = OfferStatus.DECLINED;
    await offer.save();

    // Cancel expiration job
    await cancelOfferExpiration(offer._id.toString());

    // If listing was under_offer and no other accepted offers exist, revert to active
    const otherAccepted = await Offer.findOne({
      listingId: offer.listingId,
      status: OfferStatus.ACCEPTED
    });

    let listingStatus = ListingStatus.ACTIVE;
    if (!otherAccepted) {
      const listing = await Listing.findById(offer.listingId);
      if (listing && listing.status === ListingStatus.UNDER_OFFER) {
        listing.status = ListingStatus.ACTIVE;
        await listing.save();
        listingStatus = listing.status;
      }
    }

    // Chat notification
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const eventText = `Offer of ৳${offer.amount.toLocaleString('en-US')} was declined.`;
    const chatMessage = await Message.create({
      conversationId: offer.conversationId,
      senderId: userObjectId,
      text: eventText,
      messageType: MessageType.OFFER_EVENT
    });

    const conversation = await Conversation.findById(offer.conversationId);
    if (conversation) {
      conversation.lastMessage = {
        text: eventText,
        senderId: userObjectId,
        createdAt: new Date()
      };
      await conversation.save();
    }

    // Socket emission
    const io = getSocketServerOrNull();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        id: chatMessage._id,
        conversationId: offer.conversationId,
        senderId: userObjectId,
        text: eventText,
        messageType: MessageType.OFFER_EVENT,
        createdAt: chatMessage.createdAt
      });

      io.to(`conversation:${conversationId}`).emit('offer_declined', {
        offerId: offer._id,
        status: offer.status
      });
    }

    sendSuccess(
      res,
      {
        offerId: offer._id,
        status: offer.status,
        listingStatus
      },
      200,
      'Offer declined successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/chats/:conversationId/offers/:offerId
 * Handles accept or decline action via JSON body: { action: 'accept' | 'decline' }.
 */
export const handleOfferAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { action } = req.body;
  if (action === 'accept') {
    return acceptOffer(req, res, next);
  } else if (action === 'decline') {
    return declineOffer(req, res, next);
  } else {
    next(new BadRequestError("Action must be either 'accept' or 'decline'.", ErrorCodes.VALIDATION_ERROR));
  }
};

/**
 * GET /api/v1/chats/:conversationId/offers
 * Lists all offers in the conversation thread.
 */
export const getConversationOffers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const conversationId = req.params.conversationId as string;

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
        'You are not authorized to view offers in this conversation.',
        ErrorCodes.UNAUTHORIZED_CHAT_ACTION
      );
    }

    const offers = await Offer.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .lean();

    const formatted = offers.map((o: any) => ({
      id: o._id,
      listingId: o.listingId,
      buyerId: o.buyerId,
      sellerId: o.sellerId,
      amount: o.amount,
      status: o.status,
      round: o.round,
      parentOfferId: o.parentOfferId,
      expiresAt: o.expiresAt,
      createdAt: o.createdAt
    }));

    sendSuccess(res, formatted, 200, 'Offers retrieved successfully.');
  } catch (error) {
    next(error);
  }
};
