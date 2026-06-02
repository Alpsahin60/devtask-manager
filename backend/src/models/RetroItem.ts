import mongoose, { Schema, Document, Types } from 'mongoose';
import { RetroCategory } from '../types';

// Single Mad/Sad/Glad retrospective item attached to a sprint.
// Owner is denormalised — same rationale as in StandupEntry.
export interface IRetroItemDocument extends Document {
  sprintId: Types.ObjectId;
  owner: Types.ObjectId;
  category: RetroCategory;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const retroItemSchema = new Schema<IRetroItemDocument>(
  {
    sprintId: {
      type: Schema.Types.ObjectId,
      ref: 'Sprint',
      required: [true, 'Retro item must reference a sprint'],
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Retro item must have an owner'],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: ['mad', 'sad', 'glad'] satisfies RetroCategory[],
        message: 'Category must be mad, sad, or glad',
      },
      required: [true, 'Retro item needs a category'],
    },
    content: {
      type: String,
      required: [true, 'Retro item content is required'],
      trim: true,
      minlength: [1, 'Retro item content cannot be empty'],
      maxlength: [500, 'Retro item content cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Grouped view: items of a sprint by category.
retroItemSchema.index({ owner: 1, sprintId: 1, category: 1 });
// Chronological view of all retro items per sprint.
retroItemSchema.index({ sprintId: 1, createdAt: -1 });

export const RetroItem = mongoose.model<IRetroItemDocument>('RetroItem', retroItemSchema);
