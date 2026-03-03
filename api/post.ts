import { VercelRequest, VercelResponse } from "@vercel/node";
import { TwitterApi, EUploadMimeType } from "twitter-api-v2";

// 503のときリトライするヘルパー
async function uploadWithRetry(
  client: TwitterApi,
  imageBuffer: Buffer,
  mimeType: EUploadMimeType,
  index: number,
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Uploading image ${index + 1}... attempt ${attempt}, size: ${imageBuffer.length} bytes`,
      );
      const mediaId = await client.v2.uploadMedia(imageBuffer, {
        media_type: mimeType,
      });
      console.log(`Image ${index + 1} uploaded successfully: ${mediaId}`);
      return mediaId;
    } catch (err: any) {
      console.error(
        `Image ${index + 1} upload failed (attempt ${attempt}):`,
        err?.code,
        err?.data,
      );
      if (attempt < maxRetries && err?.code === 503) {
        const wait = attempt * 2000; // 2秒 → 4秒 → 6秒
        console.log(`Retrying in ${wait}ms...`);
        await new Promise((res) => setTimeout(res, wait));
      } else {
        throw err;
      }
    }
  }
  throw new Error(
    `Failed to upload image ${index + 1} after ${maxRetries} attempts`,
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, images } = req.body;

  if (!text || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "Missing text or images" });
  }

  if (
    !process.env.X_API_KEY ||
    !process.env.X_API_KEY_SECRET ||
    !process.env.X_ACCESS_TOKEN ||
    !process.env.X_ACCESS_TOKEN_SECRET
  ) {
    const missing = [
      !process.env.X_API_KEY && "X_API_KEY",
      !process.env.X_API_KEY_SECRET && "X_API_KEY_SECRET",
      !process.env.X_ACCESS_TOKEN && "X_ACCESS_TOKEN",
      !process.env.X_ACCESS_TOKEN_SECRET && "X_ACCESS_TOKEN_SECRET",
    ].filter(Boolean);
    console.error("Missing X API credentials:", missing.join(", "));
    return res.status(500).json({
      error: "Server configuration error",
      details: `Missing environment variables: ${missing.join(", ")}`,
    });
  }

  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });

  try {
    console.log("Start processing images...");
    const mediaIds: string[] = [];

    // ✅ 並列 → 順番に1枚ずつアップロード
    for (let i = 0; i < images.length; i++) {
      const base64Image = images[i];
      const match = base64Image.match(/^data:(image\/\w+);base64,/);
      const rawMime = match ? match[1] : "image/jpeg";
      const mimeTypeMap: Record<string, EUploadMimeType> = {
        "image/jpeg": EUploadMimeType.Jpeg,
        "image/png": EUploadMimeType.Png,
        "image/gif": EUploadMimeType.Gif,
        "image/webp": EUploadMimeType.Webp,
      };
      const mimeType = mimeTypeMap[rawMime] ?? EUploadMimeType.Jpeg;
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(cleanBase64, "base64");

      const mediaId = await uploadWithRetry(client, imageBuffer, mimeType as EUploadMimeType, i);
      mediaIds.push(mediaId);

      // 複数枚のとき、次のアップロードまで少し待つ
      if (i < images.length - 1) {
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    console.log("All images uploaded. Posting tweet...");
    const tweet = await client.v2.tweet(text, {
      media: {
        media_ids: mediaIds as
          | [string]
          | [string, string]
          | [string, string, string]
          | [string, string, string, string],
      },
    });

    console.log("Tweet posted successfully:", tweet.data.id);
    return res.status(200).json({
      success: true,
      postUrl: `https://x.com/user/status/${tweet.data.id}`,
      postId: tweet.data.id,
    });
  } catch (error: unknown) {
    const err = error as any;
    console.error("Twitter API Execution Error:", JSON.stringify(err, null, 2));
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return res.status(500).json({
      error: errorMessage,
      code: err.code || undefined,
      data: err.data || undefined,
    });
  }
}
