import { Schema, model, Document, Types } from 'mongoose';
import { UserRole, KycStatus } from '../constants/enums.js';
import { BD_PHONE_REGEX } from '../constants/regex.js';

export interface IEncryptedNidData {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface INotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  priceDropAlerts: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  phone: string;
  nidHash?: string | null;
  encryptedNidData?: IEncryptedNidData | null;
  displayName: string;
  role: UserRole;
  isNidVerified: boolean;
  kycStatus: KycStatus;
  kycAttempts: number;
  avatarUrl?: string | null;
  deviceUUIDs: string[];
  activeDeviceCount: number;
  isBanned: boolean;
  banReason?: string | null;
  banProposedBy?: Types.ObjectId | null;
  bannedAt?: Date | null;
  isFrozen: boolean;
  notificationPreferences: INotificationPreferences;
  averageRating: number;
  totalDealsCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is mandatory'],
      unique: true,
      trim: true,
      match: [BD_PHONE_REGEX, 'Invalid Bangladeshi mobile phone number']
    },
    nidHash: {
      type: String
    },
    encryptedNidData: {
      type: {
        iv: { type: String, required: true },
        authTag: { type: String, required: true },
        ciphertext: { type: String, required: true }
      },
      default: null,
      select: false // Never exposed on generic queries
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [3, 'Display name must be at least 3 characters'],
      maxlength: [50, 'Display name cannot exceed 50 characters']
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CITIZEN,
      required: true
    },
    isNidVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    kycStatus: {
      type: String,
      enum: Object.values(KycStatus),
      default: KycStatus.UNVERIFIED,
      required: true
    },
    kycAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    avatarUrl: {
      type: String,
      default: null
    },
    deviceUUIDs: {
      type: [String],
      default: []
    },
    activeDeviceCount: {
      type: Number,
      default: 1,
      min: 0,
      max: [2, 'Cannot exceed maximum of 2 active devices']
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true
    },
    banReason: {
      type: String,
      default: null
    },
    banProposedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    bannedAt: {
      type: Date,
      default: null
    },
    isFrozen: {
      type: Boolean,
      default: false,
      index: true
    },
    notificationPreferences: {
      pushEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: true },
      priceDropAlerts: { type: Boolean, default: true },
      quietHoursStart: { type: String, default: '23:00' },
      quietHoursEnd: { type: String, default: '07:00' }
    },
    averageRating: {
      type: Number,
      default: 0.0,
      min: [0.0, 'Rating cannot be less than 0'],
      max: [5.0, 'Rating cannot exceed 5']
    },
    totalDealsCompleted: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

// Compound & sparse indexes
UserSchema.index({ nidHash: 1 }, { unique: true, sparse: true });
UserSchema.index({ isNidVerified: 1, role: 1 });
UserSchema.index({ isBanned: 1, isFrozen: 1 });

export const User = model<IUser>('User', UserSchema);
