import { Schema, model, Document, Types } from 'mongoose';
import { ReviewTag } from '../constants/enums.js';

export interface IReview extends Document {
  _id: Types.ObjectId;
  dealId: Types.ObjectId;
  listingId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  rating: number;
  tags: ReviewTag[];
  comment?: string | null;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      required: [true, 'Deal reference is required']
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required']
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer reference is required']
    },
    revieweeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewee reference is required'],
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5'
      }
    },
    tags: {
      type: [String],
      enum: Object.values(ReviewTag),
      default: []
    },
    comment: {
      type: String,
      maxlength: [300, 'Comment cannot exceed 300 characters'],
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'reviews'
  }
);

// Indexes
ReviewSchema.index({ dealId: 1, reviewerId: 1 }, { unique: true });
ReviewSchema.index({ revieweeId: 1, createdAt: -1 });

export const Review = model<IReview>('Review', ReviewSchema);
