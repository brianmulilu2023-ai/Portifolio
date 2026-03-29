import path from "path";
import { randomUUID } from "crypto";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { Project } from "./models/Project";

dotenv.config();

const {
    PORT = "4000",
    MONGODB_URI,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET
} = process.env;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_BUCKET) {
    throw new Error("Missing environment variables. Copy .env.example to .env and fill in all values.");
}

const mongoUri = MONGODB_URI;
const supabaseUrl = SUPABASE_URL;
const supabaseServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = SUPABASE_BUCKET;

const app = express();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith("image/")) {
            callback(new Error("Only image uploads are allowed."));
            return;
        }

        callback(null, true);
    }
});

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const publicDirectory = path.resolve(__dirname, "..");

type AsyncHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncHandler) {
    return (request: Request, response: Response, next: NextFunction) => {
        handler(request, response, next).catch(next);
    };
}

app.use(cors());
app.use(express.json());
app.use(express.static(publicDirectory));

app.get("/api/health", (_request: Request, response: Response) => {
    response.json({ ok: true });
});

app.get("/api/projects", asyncHandler(async (_request: Request, response: Response) => {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();

    response.json({
        projects: projects.map((project) => ({
            id: project._id.toString(),
            title: project.title,
            category: project.category,
            description: project.description,
            imageUrl: project.imageUrl,
            storagePath: project.storagePath,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        }))
    });
}));

app.post("/api/projects", upload.single("file"), asyncHandler(async (request: Request, response: Response) => {
    const file = request.file;
    const title = request.body.title?.trim();
    const category = request.body.category?.trim() || "";
    const description = request.body.description?.trim() || "";

    if (!title) {
        response.status(400).json({ error: "Project title is required." });
        return;
    }

    if (!file) {
        response.status(400).json({ error: "Project image is required." });
        return;
    }

    const extension = file.originalname.includes(".")
        ? file.originalname.slice(file.originalname.lastIndexOf("."))
        : "";
    const storagePath = `projects/${Date.now()}-${randomUUID()}${extension}`;

    const uploadResult = await supabase.storage.from(supabaseBucket).upload(storagePath, file.buffer, {
        cacheControl: "3600",
        contentType: file.mimetype,
        upsert: false
    });

    if (uploadResult.error) {
        response.status(500).json({ error: uploadResult.error.message });
        return;
    }

    const publicUrlResult = supabase.storage.from(supabaseBucket).getPublicUrl(storagePath);
    const imageUrl = publicUrlResult.data.publicUrl;

    const savedProject = await Project.create({
        title,
        category,
        description,
        imageUrl,
        storagePath
    });

    response.status(201).json({
        message: "Project uploaded successfully.",
        project: {
            id: savedProject._id.toString(),
            title: savedProject.title,
            category: savedProject.category,
            description: savedProject.description,
            imageUrl: savedProject.imageUrl,
            storagePath: savedProject.storagePath,
            createdAt: savedProject.createdAt
        }
    });
}));

app.delete("/api/projects/:id", asyncHandler(async (request: Request, response: Response) => {
    const project = await Project.findById(request.params.id);

    if (!project) {
        response.status(404).json({ error: "Project not found." });
        return;
    }

    const deleteStorageResult = await supabase.storage.from(supabaseBucket).remove([project.storagePath]);

    if (deleteStorageResult.error) {
        response.status(500).json({ error: deleteStorageResult.error.message });
        return;
    }

    await project.deleteOne();

    response.json({ message: "Project deleted successfully." });
}));

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) {
        response.status(400).json({ error: error.message });
        return;
    }

    response.status(500).json({ error: error.message || "Something went wrong." });
});

app.get("*", (_request: Request, response: Response) => {
    response.sendFile(path.join(publicDirectory, "index.html"));
});

async function startServer() {
try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");
} catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
}
    app.listen(Number(PORT), () => {
        console.log(`Portfolio server running on http://localhost:${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
