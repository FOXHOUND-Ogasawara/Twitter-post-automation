import { TwitterApi, ApiResponseError } from "twitter-api-v2";

// `_lib` 配下は Vercel のエンドポイントとして公開されない

const REQUIRED_ENV_VARS = [
  "X_API_KEY",
  "X_API_KEY_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_TOKEN_SECRET",
] as const;

export const getMissingEnvVars = (): string[] =>
  REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

export const createTwitterClient = (): TwitterApi =>
  new TwitterApi({
    appKey: process.env.X_API_KEY!,
    appSecret: process.env.X_API_KEY_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
  });

// v2.me() はレート制限が厳しい（Free プランは 25 回/24h）ため、
// ウォームインスタンス間でユーザー ID をキャッシュする。
// 環境変数 X_USER_ID を設定すれば me() の呼び出し自体を完全に省略できる。
let cachedUserId: string | null = process.env.X_USER_ID || null;

export const getAuthenticatedUserId = async (
  client: TwitterApi
): Promise<string> => {
  if (cachedUserId) return cachedUserId;
  const me = await client.v2.me();
  cachedUserId = me.data.id;
  return cachedUserId;
};

export interface TwitterErrorInfo {
  status: number;
  message: string;
  code?: number;
  data?: unknown;
  rateLimitReset?: number;
}

// Twitter API のエラーを HTTP レスポンス向けに正規化する。
// レート制限（429）等の HTTP ステータスをそのまま伝搬させることで、
// クライアント側が「再試行すべきか」を判断できるようにする。
export const toTwitterErrorInfo = (error: unknown): TwitterErrorInfo => {
  if (error instanceof ApiResponseError) {
    return {
      status: error.code >= 400 && error.code < 600 ? error.code : 500,
      message: error.message,
      code: error.code,
      data: error.data,
      rateLimitReset: error.rateLimit?.reset,
    };
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : "Internal Server Error",
  };
};
