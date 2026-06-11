import { Document, Schema, Types, model } from "mongoose";

export type TransactionType = "IN" | "OUT";

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  type: TransactionType;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    type: { type: String, enum: ["IN", "OUT"], required: true, index: true },
    description: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

transactionSchema.index({ description: "text" });

export const Transaction = model<ITransaction>("Transaction", transactionSchema);
