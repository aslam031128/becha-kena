import { Schema, model, Document, Types } from 'mongoose';
import { BD_PHONE_REGEX } from '../constants/regex.js';

export interface INidBlacklist extends Document {
  _id: Types.ObjectId;
  nidHash: string;
  phone: string;
  deviceUUID?: string | null;
  reason: string;
  bannedBy: Types.ObjectId;
  createdAt: Date;
}

const NidBlacklistSchema = new Schema<INidBlacklist>(
  {
    nidHash: {
      type: String,
      required: [true, 'Salted NID hash is required'],
      unique: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [BD_PHONE_REGEX, 'Invalid Bangladeshi mobile phone number']
    },
    deviceUUID: {
      type: String,
      default: null,
      trim: true
    },
    reason: {
      type: String,
      required: [true, 'Termination reason is required'],
      maxlength: [200, 'Reason cannot exceed 200 characters']
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Super Admin identifier is required']
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'nid_blacklists'
  }
);

export const NidBlacklist = model<INidBlacklist>('NidBlacklist', NidBlacklistSchema);
