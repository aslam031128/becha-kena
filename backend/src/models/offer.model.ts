import { Schema, model, Document, Types } from 'mongoose';
import { OfferStatus } from '../constants/enums.js';

export interface IOffer extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  amount: number;
  status: OfferStatus;
  parentOfferId?: Types.ObjectId | null;
  round: number;
  expiresAt: Date;
  createdAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required']
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required']
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer reference is required']
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required']
    },
    amount: {
      type: Number,
      required: [true, 'Offer amount is required'],
      min: [50, 'Minimum offer amount is 50 BDT']
    },
    status: {
      type: String,
      enum: Object.values(OfferStatus),
      default: OfferStatus.PENDING
    },
    parentOfferId: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      default: null
    },
    round: {
      type: Number,
      default: 1,
      min: 1,
      max: [3, 'Cannot exceed maximum of 3 counter rounds per buyer']
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24-hr TTL
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'offers'
  }
);

// Indexes
OfferSchema.index({ conversationId: 1, status: 1 });
OfferSchema.index({ listingId: 1, buyerId: 1 });
OfferSchema.index({ expiresAt: 1 });

export const Offer = model<IOffer>('Offer', OfferSchema);
