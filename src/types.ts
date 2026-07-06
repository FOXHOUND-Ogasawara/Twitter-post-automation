import type { ImageFile } from "./utils/imageUtils";

export type PostGroupStatus = "pending" | "posting" | "success" | "failed";

export interface PostGroup {
  id: string;
  images: ImageFile[];
  status: PostGroupStatus;
  error?: string;
  retryCount: number;
}

export interface PostHistoryItem {
  id: string;
  text: string;
  timestamp: string;
  postUrl: string;
  thumbnail: string;
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
}
