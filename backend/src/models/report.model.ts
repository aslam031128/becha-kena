import { Schema, model, Document, Types } from 'mongoose';
import { ReportEntityType, ReportReason, ReportStatus } from '../constants/enums.js';

export interface IReport extends Document {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  entityType: ReportEntityType;
  entityId: Types.ObjectId;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reviewedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required'],
      index: true
    },
    entityType: {
      type: String,
      enum: Object.values(ReportEntityType),
      required: [true, 'Entity type is required']
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true
    },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: [true, 'Report reason is required']
    },
    details: {
      type: String,
      required: [true, 'Details are required'],
      maxlength: [500, 'Details cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'reports'
  }
);

// Indexes
ReportSchema.index({ entityType: 1, entityId: 1, status: 1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });

export const Report = model<IReport>('Report', ReportSchema);
