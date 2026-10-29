import { Schema, model, Document, Types } from 'mongoose';

export interface ILastMessagePreview {
  text: string;
  senderId: Types.ObjectId;
  createdAt: Date;
}

export interface IConversation extends Document {
  _id: Types.ObjectId;
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  lastMessage?: ILastMessagePreview | null;
  status: 'active' | 'blocked' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
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
    lastMessage: {
      type: {
        text: { type: String, required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, required: true, default: Date.now }
      },
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'archived'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    collection: 'conversations'
  }
);

// Enforce single conversation thread per buyer-seller-ad trio
ConversationSchema.index({ listingId: 1, buyerId: 1, sellerId: 1 }, { unique: true });
ConversationSchema.index({ updatedAt: -1 });

export const Conversation = model<IConversation>('Conversation', ConversationSchema);
