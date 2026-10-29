import { Schema, model, Document, Types } from 'mongoose';
import {
  ListingStatus,
  ListingCondition,
  ListingCategory,
  ModerationStatus
} from '../constants/enums.js';

export interface IListingLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  division: string;
  thana: string;
}

export interface IListing extends Document {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  category: ListingCategory;
  location: IListingLocation;
  imageUrls: string[];
  status: ListingStatus;
  moderationStatus: ModerationStatus;
  isPhoneHidden: boolean;
  soldToBuyerId?: Types.ObjectId | null;
  viewCount: number;
  inquiryCount: number;
  renewCount: number;
  maxRenewals: number;
  renewedAt?: Date | null;
  expiresAt: Date;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Listing title is required'],
      trim: true,
      minlength: [10, 'Title must be at least 10 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Description must be at least 20 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [50, 'Minimum price is 50 BDT'],
      max: [2500000, 'Maximum price is 2,500,000 BDT']
    },
    condition: {
      type: String,
      enum: Object.values(ListingCondition),
      required: [true, 'Item condition is required']
    },
    category: {
      type: String,
      enum: Object.values(ListingCategory),
      required: [true, 'Listing category is required']
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates [longitude, latitude] are required'],
        validate: {
          validator: (coords: number[]) => coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1]),
          message: 'Coordinates must be exactly [longitude, latitude]'
        }
      },
      division: {
        type: String,
        required: [true, 'Division is required'],
        trim: true
      },
      thana: {
        type: String,
        required: [true, 'Thana is required'],
        trim: true
      }
    },
    imageUrls: {
      type: [String],
      required: [true, 'At least one image is required'],
      validate: {
        validator: (urls: string[]) => urls.length >= 1 && urls.length <= 8,
        message: 'Must provide between 1 and 8 image URLs'
      }
    },
    status: {
      type: String,
      enum: Object.values(ListingStatus),
      default: ListingStatus.ACTIVE,
      index: true
    },
    moderationStatus: {
      type: String,
      enum: Object.values(ModerationStatus),
      default: ModerationStatus.PENDING,
      index: true
    },
    isPhoneHidden: {
      type: Boolean,
      default: true
    },
    soldToBuyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    inquiryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    renewCount: {
      type: Number,
      default: 0,
      min: 0,
      max: [2, 'Cannot exceed maximum of 2 renewals']
    },
    maxRenewals: {
      type: Number,
      default: 2
    },
    renewedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day lifecycle
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'listings'
  }
);

// Indexes
ListingSchema.index({ 'location.coordinates': '2dsphere' });
ListingSchema.index({ status: 1, category: 1, createdAt: -1 });
ListingSchema.index({ sellerId: 1, status: 1 });
ListingSchema.index({ expiresAt: 1 });
ListingSchema.index({ deletedAt: 1 }, { sparse: true });

export const Listing = model<IListing>('Listing', ListingSchema);
