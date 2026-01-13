import { VercelRequest, VercelResponse } from "@vercel/node";
import { TwitterApi } from "twitter-api-v2";

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
    console.error("Missing X API credentials in environment variables.");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });

  try {
    const mediaIds = await Promise.all(
      images.map(async (base64Image: string) => {
        // Detect mime type
        const match = base64Image.match(/^data:(image\/\w+);base64,/);
        const mimeType = match ? match[1] : "image/jpeg";

        // Map mime to extension string for twitter-api-v2 'type' option
        // The library expects 'jpg', 'png', etc. when uploading buffers.
        let type = "jpg";
        if (mimeType === "image/png") type = "png";
        if (mimeType === "image/gif") type = "gif";
        if (mimeType === "image/webp") type = "webp";

        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(cleanBase64, "base64");

        // Only pass mimeType. The library logic for Buffer uploads is specific.
        // Documentation says: options.type is required if Buffer is passed without known extension path.
        // options.type expects a file extension (e.g. "png") or a mime type (e.g. "image/png")?
        // Checking library source via types: it often aliases 'type' to extension.
        // Let's pass { type: extension, mimeType: mimeType } to be fully explicit.
        const mediaId = await client.v1.uploadMedia(imageBuffer, {
          mimeType,
          type,
        });
        return mediaId;
      })
    );

    const tweet = await client.v2.tweet(text, {
      media: { media_ids: mediaIds },
    });

    return res.status(200).json({
      success: true,
      postUrl: `https://x.com/user/status/${tweet.data.id}`,
      postId: tweet.data.id,
    });
  } catch (error: unknown) {
    const err = error as any;
    console.error("Twitter API Error:", err);
    return res.status(500).json({
      error: err.message || "Internal Server Error",
      details: err.data || undefined,
    });
  }
}
