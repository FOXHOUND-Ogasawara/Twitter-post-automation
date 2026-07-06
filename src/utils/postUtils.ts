import { format } from "date-fns";
import { TIMESTAMP_FORMAT } from "../constants";

export const formatTimestamp = (date: Date): string =>
  format(date, TIMESTAMP_FORMAT);

// 投稿本文には末尾にタイムスタンプが自動付加される
export const buildPostBody = (baseText: string, date: Date): string =>
  `${baseText}\n\n${formatTimestamp(date)}`;

// タイムスタンプ付加後の実効文字数（文字数カウント表示用）
export const getPostBodyLength = (baseText: string): number =>
  buildPostBody(baseText, new Date()).length;
