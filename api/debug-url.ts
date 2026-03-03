import { VercelRequest, VercelResponse } from "@vercel/node";
import { TwitterApi, EUploadMimeType } from "twitter-api-v2";
import * as https from "https";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY!,
    appSecret: process.env.X_API_KEY_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
  });

  // https.request をモンキーパッチして URL を記録
  const originalRequest = https.request.bind(https);
  const capturedRequests: string[] = [];

  (https as any).request = (options: any, ...args: any[]) => {
    const url = `https://${options.hostname}${options.path}`;
    const log = `${options.method ?? "?"} ${url}`;
    capturedRequests.push(log);
    console.log("🔍 Actual HTTP request:", log);
    console.log("🔍 Headers:", JSON.stringify(options.headers ?? {}, null, 2));
    return originalRequest(options, ...args);
  };

  try {
    // 1×1 の極小テスト PNG（実際の画像送信不要）
    const tinyPng = Buffer.from(
      "89504e470d0a1a0a0000000d494844520000000100000001" +
        "08060000001f15c4890000000a49444154789c6260000000" +
        "020001e221bc330000000049454e44ae426082",
      "hex",
    );

    console.log("Attempting upload with tiny PNG...");
    const mediaId = await client.v2.uploadMedia(tinyPng, {
      media_type: EUploadMimeType.Png,
      media_category: "tweet_image",
    });

    return res.status(200).json({
      success: true,
      mediaId,
      capturedRequests, // ← 実際に叩いた URL が入る
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message,
      code: error.code,
      data: error.data,
      capturedRequests, // ← エラーでも URL が確認できる
    });
  } finally {
    // モンキーパッチを元に戻す
    (https as any).request = originalRequest;
  }
}
