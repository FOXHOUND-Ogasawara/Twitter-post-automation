import axios from "axios";
import type { Tweet } from "../types";

export interface PostResponse {
  success: boolean;
  postUrl: string;
  postId: string;
}

interface TimelineResponse {
  success: boolean;
  tweets: Tweet[];
}

// API エラーを「再試行してよいか」を判断できる形に正規化する。
// 429（レート制限）や 4xx を再試行しても X API の消費が増えるだけなので、
// 再試行対象はネットワークエラーと 5xx に限定する。
export class ApiError extends Error {
  readonly status?: number;
  readonly rateLimited: boolean;
  readonly retryable: boolean;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.rateLimited = status === 429;
    this.retryable = status === undefined || status >= 500;
  }
}

export const toApiError = (error: unknown, fallback: string): ApiError => {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    const status = error.response?.status;
    const message =
      status === 429
        ? "X APIのレート制限に達しました。しばらく待ってから再試行してください。"
        : data?.error || error.message || fallback;
    return new ApiError(message, status);
  }
  return new ApiError(error instanceof Error ? error.message : fallback);
};

export const postTweet = async (
  text: string,
  images: string[]
): Promise<PostResponse> => {
  try {
    const response = await axios.post<PostResponse>("/api/post", {
      text,
      images,
    });
    return response.data;
  } catch (error: unknown) {
    throw toApiError(error, "投稿に失敗しました");
  }
};

export const getTimeline = async (): Promise<Tweet[]> => {
  try {
    const response = await axios.get<TimelineResponse>("/api/timeline");
    return response.data.tweets;
  } catch (error: unknown) {
    throw toApiError(error, "タイムラインの取得に失敗しました");
  }
};
