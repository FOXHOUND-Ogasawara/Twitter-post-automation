import { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createTwitterClient,
  getAuthenticatedUserId,
  getMissingEnvVars,
  toTwitterErrorInfo,
} from "./_lib/twitter.js";

interface TweetSummary {
  id: string;
  text: string;
  createdAt?: string;
}

// タイムラインの読み取りはレート制限が非常に厳しいため、
// ウォームインスタンス内でレスポンスをキャッシュして X API の消費を抑える
const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: { tweets: TweetSummary[]; fetchedAt: number } | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const missing = getMissingEnvVars();
  if (missing.length) {
    console.error("Missing X API credentials:", missing.join(", "));
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    res.setHeader("X-Timeline-Cache", "HIT");
    return res.status(200).json({ success: true, tweets: cache.tweets });
  }

  const client = createTwitterClient();

  try {
    const userId = await getAuthenticatedUserId(client);

    const timeline = await client.v2.userTimeline(userId, {
      max_results: 5,
      "tweet.fields": ["created_at", "text"],
    });

    const tweets: TweetSummary[] = timeline.tweets.map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
    }));

    cache = { tweets, fetchedAt: Date.now() };

    // Vercel の CDN にもキャッシュさせ、コールドスタート時の API 消費も抑える
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=3600",
    );
    return res.status(200).json({ success: true, tweets });
  } catch (error: unknown) {
    const info = toTwitterErrorInfo(error);
    console.error("Twitter Timeline Error:", JSON.stringify(info, null, 2));

    // レート制限などで取得できなくても、期限切れキャッシュが残っていればそれを返す
    if (cache) {
      res.setHeader("X-Timeline-Cache", "STALE");
      return res.status(200).json({ success: true, tweets: cache.tweets });
    }

    return res.status(info.status).json({
      error: info.message,
      code: info.code,
      data: info.data,
      rateLimitReset: info.rateLimitReset,
    });
  }
}
