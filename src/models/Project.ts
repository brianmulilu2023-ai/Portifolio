import { Schema, model } from "mongoose";

export interface ProjectDocument {
    title: string;
    category?: string;
    description?: string;
    imageUrl: string;
    storagePath: string;
    createdAt: Date;
    updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            trim: true,
            default: ""
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        imageUrl: {
            type: String,
            required: true,
            trim: true
        },
        storagePath: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

export const Project = model<ProjectDocument>("Project", projectSchema);
