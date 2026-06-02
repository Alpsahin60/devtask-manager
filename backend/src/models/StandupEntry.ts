import mongoose, { Schema, Document, Types } from 'mongoose';

// Daily standup note that belongs to a sprint and a specific calendar day.
// The (owner, sprintId, date) tuple is unique so a user can only have one
// standup entry per day per sprint — repeated PUTs upsert that single entry.
export interface IStandupEntryDocument extends Document {
  sprintId: Types.ObjectId;
  owner: Types.ObjectId;
  date: Date;
  yesterday?: string;
  today?: string;
  blockers?: string;
  createdAt: Date;
  updatedAt: Date;
}

const standupEntrySchema = new Schema<IStandupEntryDocument>(
  {
    sprintId: {
      type: Schema.Types.ObjectId,
      ref: 'Sprint',
      required: [true, 'Standup entry must reference a sprint'],
      index: true,
    },
    // Owner is denormalised onto the entry so owner-isolation filters can hit
    // the index directly without joining Sprint on every query.
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Standup entry must have an owner'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Standup entry needs a date'],
    },
    yesterday: {
      type: String,
      trim: true,
      maxlength: [500, 'Yesterday note cannot exceed 500 characters'],
    },
    today: {
      type: String,
      trim: true,
      maxlength: [500, 'Today note cannot exceed 500 characters'],
    },
    blockers: {
      type: String,
      trim: true,
      maxlength: [500, 'Blockers note cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index — enforces "one standup per day per sprint per user".
// The service layer is responsible for normalising `date` to 00:00 UTC before save.
standupEntrySchema.index(
  { owner: 1, sprintId: 1, date: 1 },
  { unique: true }
);

// Dashboard query: the user's most recent standups across all sprints.
standupEntrySchema.index({ owner: 1, date: -1 });

export const StandupEntry = mongoose.model<IStandupEntryDocument>(
  'StandupEntry',
  standupEntrySchema
);
