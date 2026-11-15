import { Router } from 'express';
import { z } from 'zod';
import {
  searchListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  renewListing,
  updateListingStatus,
  getMyListings,
  revealPhoneNumber
} from '../controllers/listing.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireVerifiedCitizen, requireListingOwner } from '../middlewares/rbac.js';
import { validateBody } from '../middlewares/validation.js';
import { ListingCondition, ListingCategory, ListingStatus } from '../constants/enums.js';

const router = Router();

const createListingSchema = z.object({
  title: z
    .string({ required_error: 'Listing title is required' })
    .trim()
    .min(10, 'Title must be at least 10 characters long')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(20, 'Description must be at least 20 characters long')
    .max(2000, 'Description cannot exceed 2000 characters'),
  price: z
    .number({ required_error: 'Price is required' })
    .min(50, 'Minimum price is 50 BDT')
    .max(2500000, 'Maximum price is 2,500,000 BDT'),
  condition: z.nativeEnum(ListingCondition, {
    errorMap: () => ({ message: 'Invalid condition option' })
  }),
  category: z.nativeEnum(ListingCategory, {
    errorMap: () => ({ message: 'Invalid category option' })
  }),
  location: z.object({
    division: z.string({ required_error: 'Division is required' }).trim().min(1),
    thana: z.string({ required_error: 'Thana is required' }).trim().min(1),
    coordinates: z
      .array(z.number())
      .length(2, 'Coordinates must be exactly [longitude, latitude]')
  }),
  imageUrls: z
    .array(z.string().url('Invalid image URL format'))
    .min(1, 'Must provide at least 1 image URL')
    .max(8, 'Must provide at most 8 image URLs'),
  videoUrl: z.string().url('Invalid video URL format').optional().nullable(),
  isPhoneHidden: z.boolean().optional()
});

const updateListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Title must be at least 10 characters long')
    .max(100, 'Title cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters long')
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  price: z
    .number()
    .min(50, 'Minimum price is 50 BDT')
    .max(2500000, 'Maximum price is 2,500,000 BDT')
    .optional(),
  condition: z.nativeEnum(ListingCondition).optional(),
  category: z.nativeEnum(ListingCategory).optional(),
  location: z
    .object({
      division: z.string().trim().min(1).optional(),
      thana: z.string().trim().min(1).optional(),
      coordinates: z.array(z.number()).length(2).optional()
    })
    .optional(),
  imageUrls: z
    .array(z.string().url())
    .min(1)
    .max(8)
    .optional(),
  videoUrl: z.string().url().optional().nullable(),
  isPhoneHidden: z.boolean().optional()
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(ListingStatus, {
    errorMap: () => ({ message: 'Invalid listing status' })
  }),
  soldToBuyerId: z.string().optional()
});

// 1. Seller Dashboard (must precede /:id)
router.get('/my-listings', requireAuth, requireVerifiedCitizen, getMyListings);

// 2. Public Catalog Search
router.get('/', searchListings);

// 3. Public Listing Detail
router.get('/:id', getListingById);

// 4. Create Listing (Verified Citizen only)
router.post('/', requireAuth, requireVerifiedCitizen, validateBody(createListingSchema), createListing);

// 5. Update Listing (Owner only)
router.put('/:id', requireAuth, requireListingOwner, validateBody(updateListingSchema), updateListing);

// 6. Delete / Archive Listing (Owner only)
router.delete('/:id', requireAuth, requireListingOwner, deleteListing);

// 7. Renew Listing (Owner only)
router.post('/:id/renew', requireAuth, requireListingOwner, renewListing);

// 8. Update Status (Owner only)
router.patch('/:id/status', requireAuth, requireListingOwner, validateBody(updateStatusSchema), updateListingStatus);

// 9. Phone Reveal Gate (Verified Citizen only)
router.post('/:id/reveal-phone', requireAuth, requireVerifiedCitizen, revealPhoneNumber);

export default router;

