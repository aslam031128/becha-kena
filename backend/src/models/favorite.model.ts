import { Schema, model, Document, Types } from 'mongoose';

export interface IFavorite extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  listingId: Types.ObjectId;
  priceAtSave: number;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: [true, 'Listing reference is required']
    },
    priceAtSave: {
      type: Number,
      required: [true, 'Price at save benchmark is required'],
      min: [0, 'Price at save must be non-negative']
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'favorites'
  }
);

// Indexes
FavoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });
FavoriteSchema.index({ listingId: 1 });

export const Favorite = model<IFavorite>('Favorite', FavoriteSchema);
