import { Request, Response } from "express";
import s3 from "../utils/s3";
import prisma from "../utils/prisma";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Platform } from "@prisma/client";

export const saveWallpaper = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return
        }

        const { platformOf, ref, userId } = req.body;
        if (!platformOf || !ref || !userId) {
            res.status(400).json({ error: "Missing required fields" });
            return
        }

        const platformUpperCase = platformOf.toUpperCase()

        // Validate platformOf against the Platform enum
        if (!Object.values(Platform).includes(platformUpperCase)) {
            res.status(400).json({ error: "Invalid platform" });
            return
        }

        // Generate unique filename
        const fileName = `${userId}.png`;

        // Upload to S3
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        await s3.send(new PutObjectCommand(uploadParams));

        // // Construct the image URL
        const wallpaperS3Link = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        // // Save to Database
        const newWallpaper = await prisma.userWallpaper.create({
            data: {
                platform: platformUpperCase as Platform,
                link: wallpaperS3Link,
                ref,
                userId,
            },
        });

        res.status(201).json({ message: "Wallpaper saved", newWallpaper });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}