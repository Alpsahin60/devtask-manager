import mongoose, { Schema, Document, Types } from 'mongoose';
import { SprintStatus } from '../types';

// Maximum sprint length — guards against accidental multi-month sprints
const MAX_SPRINT_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ISprintDocument extends Document {
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  reviewNotes?: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sprintSchema = new Schema<ISprintDocument>(
  {
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true,
      minlength: [1, 'Sprint name cannot be empty'],
      maxlength: [100, 'Sprint name cannot exceed 100 characters'],
    },
    goal: {
      type: String,
      trim: true,
      maxlength: [500, 'Sprint goal cannot exceed 500 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Sprint start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Sprint end date is required'],
      validate: [
        {
          validator: function (this: ISprintDocument, value: Date) {
            return value > this.startDate;
          },
          message: 'Sprint end date must be after start date',
        },
        {
          validator: function (this: ISprintDocument, value: Date) {
            const diff = value.getTime() - this.startDate.getTime();
            return diff <= MAX_SPRINT_DAYS * MS_PER_DAY;
          },
          message: `Sprint length cannot exceed ${MAX_SPRINT_DAYS} days`,
        },
      ],
    },
    status: {
      type: String,
      enum: {
        values: ['planned', 'active', 'completed', 'cancelled'] satisfies SprintStatus[],
        message: 'Status must be planned, active, completed, or cancelled',
      },
      default: 'planned',
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review notes cannot exceed 2000 characters'],
    },
    // Each sprint belongs to exactly one user — owner-isolation
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sprint must have an owner'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for the two main query shapes
sprintSchema.index({ owner: 1, status: 1 });
sprintSchema.index({ owner: 1, startDate: -1 });

export const Sprint = mongoose.model<ISprintDocument>('Sprint', sprintSchema);
