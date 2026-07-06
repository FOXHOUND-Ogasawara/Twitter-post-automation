import { VercelRequest, VercelResponse } from "@vercel/node";
import { EUploadMimeType } from "twitter-api-v2";
import {
  createTwitterClient,
  getMissingEnvVars,
  toTwitterErrorInfo,
} from "./_lib/twitter";

const MIME_TYPE_MAP: Record<string, EUploadMimeType> = {
  "image/jpeg": EUploadMimeType.Jpeg,
  "image/png": EUploadMimeType.Png,
  "image/gif": EUploadMimeType.Gif,
  "image/webp": EUploadMimeType.Webp,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, images } = req.body;

  if (!text || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "Missing text or images" });
  }

  const missing = getMissingEnvVars();
  if (missing.length) {
    console.error("Missing X API credentials:", missing.join(", "));
    return res.status(500).json({
      error: "Server configuration error",
      details: `Missing environment variables: ${missing.join(", ")}`,
    });
  }

  const client = createTwitterClient();

  try {
    console.log("Start processing images...");
    const mediaIds: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const base64Image: string = images[i];

      const match = base64Image.match(/^data:(image\/\w+);base64,/);
      const rawMime = match ? match[1] : "image/jpeg";
      const mimeType = MIME_TYPE_MAP[rawMime] ?? EUploadMimeType.Jpeg;

      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(cleanBase64, "base64");

      console.log(
        `[Image ${i + 1}] Uploading... size: ${imageBuffer.length} bytes, type: ${mimeType}`,
      );

      // v2 アップロード（media_category がないと 503 になる）
      const mediaId = await client.v2.uploadMedia(imageBuffer, {
        media_type: mimeType,
        media_category: "tweet_image",
      });

      console.log(`[Image ${i + 1}] Upload success! mediaId: ${mediaId}`);
      mediaIds.push(mediaId);

      // 連続アップロード時は 1 秒待機
      if (i < images.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("Posting tweet with mediaIds:", mediaIds);
    const tweet = await client.v2.tweet(text, {
      media: { media_ids: mediaIds as [string] },
    });

    console.log("Tweet posted! id:", tweet.data.id);
    return res.status(200).json({
      success: true,
      postUrl: `https://x.com/i/web/status/${tweet.data.id}`,
      postId: tweet.data.id,
    });
  } catch (error: unknown) {
    const info = toTwitterErrorInfo(error);
    console.error("Twitter API Execution Error:", JSON.stringify(info, null, 2));
    return res.status(info.status).json({
      error: info.message,
      code: info.code,
      data: info.data,
      rateLimitReset: info.rateLimitReset,
    });
  }
}
