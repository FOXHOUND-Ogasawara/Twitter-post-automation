import { format } from "date-fns";
import twitter from "twitter-text";
import { MAX_TWEET_WEIGHT, TIMESTAMP_FORMAT } from "../constants";

export const formatTimestamp = (date: Date): string =>
  format(date, TIMESTAMP_FORMAT);

// 投稿本文には末尾にタイムスタンプが自動付加される
export const buildPostBody = (baseText: string, date: Date): string =>
  `${baseText}\n\n${formatTimestamp(date)}`;

// X の重み付きカウント（日本語・全角は1文字=2、URL は一律23）による残り文字数。
// タイムスタンプ付加後の本文で計算する。単純な length では日本語の本文が
// UI 上は収まって見えても API 側で文字数超過(403)になるため、
// X 公式のカウント実装である twitter-text を使う。
export const getTweetRemaining = (baseText: string): number =>
  MAX_TWEET_WEIGHT -
  twitter.parseTweet(buildPostBody(baseText, new Date())).weightedLength;
