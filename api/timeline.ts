import { VercelRequest, VercelResponse } from "@vercel/node";
import { TwitterApi } from "twitter-api-v2";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Ensure environment variables are set
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
    // Get the authenticated user's ID first
    const me = await client.v2.me();

    // Fetch user timeline (latest 5 tweets)
    // exclude retweets and replies to keep it clean if desired, strictly implied by "latest tweets"
    // Using default fields
    const timeline = await client.v2.userTimeline(me.data.id, {
      max_results: 5,
      "tweet.fields": ["created_at", "text"],
      // exclude: ["retweets", "replies"], // Temporarily allow everything to see if it works
    });

    const tweets = timeline.tweets.map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
    }));

    return res.status(200).json({
      success: true,
      tweets: tweets,
    });
  } catch (error: unknown) {
    const err = error as any;
    console.error("Twitter Timeline Error:", err);
    return res.status(500).json({
      error: err.message || "Failed to fetch timeline",
      details: err.data || null,
      code: err.code || null,
    });
  }
}
