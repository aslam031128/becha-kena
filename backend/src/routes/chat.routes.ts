import { Router } from 'express';
import { z } from 'zod';
import {
  initiateConversation,
  getConversations,
  getMessages,
  sendMessage
} from '../controllers/chat.controller.js';
import {
  submitOffer,
  counterOffer,
  acceptOffer,
  declineOffer,
  handleOfferAction,
  getConversationOffers
} from '../controllers/offer.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireVerifiedCitizen } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validation.js';

const router = Router();

const initiateConversationSchema = z.object({
  listingId: z
    .string({ required_error: 'listingId is required' })
    .min(1, 'listingId cannot be empty')
});

const sendMessageSchema = z
  .object({
    text: z.string().trim().max(1000, 'Message cannot exceed 1000 characters').optional(),
    content: z.string().trim().max(1000, 'Message cannot exceed 1000 characters').optional(),
    type: z.enum(['text', 'image']).optional(),
    mediaUrl: z.string().optional()
  })
  .refine(
    (data) => (data.text && data.text.length > 0) || (data.content && data.content.length > 0),
    { message: 'Message text or content cannot be empty' }
  );

const submitOfferSchema = z.object({
  amount: z
    .number({ required_error: 'Offer amount is required' })
    .min(50, 'Minimum offer amount is 50 BDT')
});

const counterOfferSchema = z.object({
  amount: z
    .number({ required_error: 'Counter offer amount is required' })
    .min(50, 'Minimum offer amount is 50 BDT')
});

const patchOfferSchema = z.object({
  action: z.enum(['accept', 'decline'], {
    required_error: "Action must be 'accept' or 'decline'"
  })
});

/**
 * @route   POST /api/v1/chats/initiate & POST /api/v1/chats/start
 * @desc    Start or retrieve existing conversation thread for a listing
 * @access  Verified Citizen
 */
router.post('/initiate', requireAuth, requireVerifiedCitizen, validateBody(initiateConversationSchema), initiateConversation);
router.post('/start', requireAuth, requireVerifiedCitizen, validateBody(initiateConversationSchema), initiateConversation);

/**
 * @route   GET /api/v1/chats
 * @desc    Get user's conversation inbox
 * @access  Verified Citizen
 */
router.get('/', requireAuth, requireVerifiedCitizen, getConversations);

/**
 * @route   GET /api/v1/chats/:conversationId/messages
 * @desc    Get message history in a thread
 * @access  Verified Citizen
 */
router.get('/:conversationId/messages', requireAuth, requireVerifiedCitizen, getMessages);

/**
 * @route   POST /api/v1/chats/:conversationId/messages
 * @desc    Send message (HTTP fallback with link stripping & scam scan)
 * @access  Verified Citizen
 */
router.post('/:conversationId/messages', requireAuth, requireVerifiedCitizen, validateBody(sendMessageSchema), sendMessage);

/**
 * @route   POST /api/v1/chats/:conversationId/offers
 * @desc    Submit formal binding purchase offer (max 3 offers/buyer/listing, 24h expiration)
 * @access  Verified Citizen
 */
router.post(
  '/:conversationId/offers',
  requireAuth,
  requireVerifiedCitizen,
  validateBody(submitOfferSchema),
  submitOffer
);

/**
 * @route   GET /api/v1/chats/:conversationId/offers
 * @desc    List all offers in a negotiation thread
 * @access  Verified Citizen
 */
router.get(
  '/:conversationId/offers',
  requireAuth,
  requireVerifiedCitizen,
  getConversationOffers
);

/**
 * @route   POST /api/v1/chats/:conversationId/offers/:offerId/counter
 * @desc    Submit counter-offer (advances round, max 3 rounds)
 * @access  Verified Citizen
 */
router.post(
  '/:conversationId/offers/:offerId/counter',
  requireAuth,
  requireVerifiedCitizen,
  validateBody(counterOfferSchema),
  counterOffer
);

/**
 * @route   POST /api/v1/chats/:conversationId/offers/:offerId/accept
 * @desc    Seller accepts the offer; marks listing as under_offer
 * @access  Verified Citizen
 */
router.post(
  '/:conversationId/offers/:offerId/accept',
  requireAuth,
  requireVerifiedCitizen,
  acceptOffer
);

/**
 * @route   POST /api/v1/chats/:conversationId/offers/:offerId/decline
 * @desc    Decline the offer
 * @access  Verified Citizen
 */
router.post(
  '/:conversationId/offers/:offerId/decline',
  requireAuth,
  requireVerifiedCitizen,
  declineOffer
);

/**
 * @route   PATCH /api/v1/chats/:conversationId/offers/:offerId
 * @desc    Accept or decline offer via PATCH { action: 'accept' | 'decline' }
 * @access  Verified Citizen
 */
router.patch(
  '/:conversationId/offers/:offerId',
  requireAuth,
  requireVerifiedCitizen,
  validateBody(patchOfferSchema),
  handleOfferAction
);

export default router;
