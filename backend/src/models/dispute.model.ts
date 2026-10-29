import { Schema, model, Document, Types } from 'mongoose';
import { DisputeResolution } from '../constants/enums.js';

export type DisputeClaimStatus = 'pending' | 'verified' | 'rejected' | 'escalated_to_police';

export interface IDispute extends Document {
  _id: Types.ObjectId;
  dealId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  gdNumber: string;
  thanaName: string;
  gdFilingDate: Date;
  gdDocumentUrl: string;
  status: DisputeClaimStatus;
  resolutionAction?: DisputeResolution | null;
  resolvedBy?: Types.ObjectId | null;
  createdAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      required: [true, 'Deal reference is required'],
      unique: true // Restricts dispute filings to 1 per completed deal
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer reference is required']
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required'],
      index: true
    },
    gdNumber: {
      type: String,
      required: [true, 'Police GD number is required'],
      trim: true
    },
    thanaName: {
      type: String,
      required: [true, 'Police thana name is required'],
      trim: true
    },
    gdFilingDate: {
      type: Date,
      required: [true, 'GD filing date is required']
    },
    gdDocumentUrl: {
      type: String,
      required: [true, 'GD document image/scan URL is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'escalated_to_police'],
      default: 'pending'
    },
    resolutionAction: {
      type: String,
      enum: Object.values(DisputeResolution),
      default: null
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'disputes'
  }
);

// Indexes
DisputeSchema.index({ status: 1, createdAt: -1 });

export const Dispute = model<IDispute>("Dispute", DisputeSchema);
