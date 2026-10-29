import { Schema, model, Document, Types } from 'mongoose';

export interface IPhoneRevealAudit extends Document {
  _id: Types.ObjectId;
  buyerId: Types.ObjectId;
  listingId: Types.ObjectId;
  sellerId: Types.ObjectId;
  ipAddress: string;
  createdAt: Date;
}

const PhoneRevealAuditSchema = new Schema<IPhoneRevealAudit>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer reference is required'],
      index: true
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required']
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required']
    },
    ipAddress: {
      type: String,
      required: [true, 'Client IP address is required'],
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'phone_reveal_audits'
  }
);

// Rolling 90-day auto-purge TTL index (90 * 24 * 60 * 60 = 7,776,000 seconds)
PhoneRevealAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
PhoneRevealAuditSchema.index({ buyerId: 1, createdAt: -1 });

export const PhoneRevealAudit = model<IPhoneRevealAudit>('PhoneRevealAudit', PhoneRevealAuditSchema);
