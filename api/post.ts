import { VercelRequest, VercelResponse } from "@vercel/node";
import { TwitterApi, EUploadMimeType } from "twitter-api-v2";

// Chunked Upload でメディアをアップロード
async function uploadMediaChunked(
  client: TwitterApi,
  imageBuffer: Buffer,
  mimeType: EUploadMimeType,
  index: number,
): Promise<string> {
  console.log(
    `[Image ${index + 1}] Starting chunked upload... size: ${imageBuffer.length} bytes`,
  );

  // Step 1: INITIALIZE
  const initRes = await client.v2.post<{ data: { id: string } }>(
    "media/upload/initialize",
    {
      total_bytes: imageBuffer.length,
      media_type: mimeType,
      media_category: "tweet_image",
    },
  );
  const mediaId = initRes.data.id;
  console.log(`[Image ${index + 1}] Initialized. media_id: ${mediaId}`);

  // Step 2: APPEND（チャンクに分けて送信）
  const CHUNK_SIZE = 1024 * 1024; // 1MB
  let segmentIndex = 0;
  for (let offset = 0; offset < imageBuffer.length; offset += CHUNK_SIZE) {
    const chunk = imageBuffer.subarray(offset, offset + CHUNK_SIZE);
    const base64Chunk = chunk.toString("base64");

    await client.v2.post(`media/upload/${mediaId}/append`, {
      media_data: base64Chunk,
      segment_index: segmentIndex,
    });
    console.log(`[Image ${index + 1}] Appended segment ${segmentIndex}`);
    segmentIndex++;
  }

  // Step 3: FINALIZE
  const finalRes = await client.v2.post<{
    data: { id: string; processing_info?: { state: string } };
  }>(`media/upload/${mediaId}/finalize`, {});
  console.log(
    `[Image ${index + 1}] Finalized. state: ${finalRes.data?.processing_info?.state ?? "ready"}`,
  );

  return mediaId;
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

    const mimeTypeMap: Record<string, EUploadMimeType> = {
      "image/jpeg": EUploadMimeType.Jpeg,
      "image/png": EUploadMimeType.Png,
      "image/gif": EUploadMimeType.Gif,
      "image/webp": EUploadMimeType.Webp,
    };

    for (let i = 0; i < images.length; i++) {
      const base64Image = images[i];
      const match = base64Image.match(/^data:(image\/\w+);base64,/);
      const rawMime = match ? match[1] : "image/jpeg";
      const mimeType = mimeTypeMap[rawMime] ?? EUploadMimeType.Jpeg;
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(cleanBase64, "base64");

      // ✅ Chunked Upload で1枚ずつ
      const mediaId = await uploadMediaChunked(
        client,
        imageBuffer,
        mimeType,
        i,
      );
      mediaIds.push(mediaId);

      // 複数枚のとき少し待つ
      if (i < images.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
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
