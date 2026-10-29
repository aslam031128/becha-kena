import { Schema, model, Document, Types } from 'mongoose';
import { DisputeStatus } from '../constants/enums.js';

export interface IDeal extends Document {
  _id: Types.ObjectId;
  listingId: Types.ObjectId;
  offerId?: Types.ObjectId | null;
  sellerId: Types.ObjectId;
  buyerId: Types.ObjectId;
  finalPrice: number;
  isReviewedBySeller: boolean;
  isReviewedByBuyer: boolean;
  disputeStatus: DisputeStatus;
  disputeId?: Types.ObjectId | null;
  completedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required'],
      unique: true // Guarantees atomic deal exclusivity (no double-sale)
    },
    offerId: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      default: null
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer reference is required'],
      index: true
    },
    finalPrice: {
      type: Number,
      required: [true, 'Final agreed price is required'],
      min: [0, 'Final price cannot be negative']
    },
    isReviewedBySeller: {
      type: Boolean,
      default: false
    },
    isReviewedByBuyer: {
      type: Boolean,
      default: false
    },
    disputeStatus: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.NONE
    },
    disputeId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
      default: null
    },
    completedAt: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  {
    timestamps: false,
    collection: 'deals'
  }
);

// Indexes
DealSchema.index({ sellerId: 1, completedAt: -1 });
DealSchema.index({ buyerId: 1, completedAt: -1 });
DealSchema.index({ disputeStatus: 1 }, { sparse: true });

export const Deal = model<IDeal>('Deal', DealSchema);
