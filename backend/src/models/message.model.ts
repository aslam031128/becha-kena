import { Schema, model, Document, Types } from 'mongoose';
import { MessageType } from '../constants/enums.js';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  text: string;
  messageType: MessageType;
  hasScamWarning: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
      index: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required']
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT
    },
    hasScamWarning: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'messages'
  }
);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ hasScamWarning: 1 }, { sparse: true });

export const Message = model<IMessage>('Message', MessageSchema);
