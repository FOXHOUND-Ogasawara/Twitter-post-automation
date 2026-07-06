// 1回のツイートに添付する画像の枚数（= 1グループの枚数）
export const IMAGES_PER_GROUP = 4;

// グループ投稿の間隔（連投によるレート制限を避ける）
export const GROUP_INTERVAL_MS = 5000;

// 再試行はネットワークエラー・サーバーエラーのみ対象（429 や 4xx は再試行しない）
export const MAX_RETRIES = 5;
export const RETRY_BASE_DELAY_MS = 1000;

// エラー後にボタンが再活性化するまでの秒数
export const ERROR_TIMEOUT_SEC = 30;

export const HISTORY_KEY = "x_auto_post_history";
export const MAX_HISTORY = 100;

export const MAX_TWEET_CHARS = 280;

// 投稿本文・履歴表示で共通のタイムスタンプ形式
export const TIMESTAMP_FORMAT = "yyyy-MM-dd HH:mm:ss";
