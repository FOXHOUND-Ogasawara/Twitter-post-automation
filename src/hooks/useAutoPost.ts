import { useState, useCallback } from "react";
import { readFileAsDataURL, resizeThumbnail } from "../utils/imageUtils";
import type { ImageFile } from "../utils/imageUtils";
import type { PostGroup } from "../types";
import { buildPostBody } from "../utils/postUtils";
import { postTweet, toApiError } from "../services/api";
import type { PostResponse } from "../services/api";
import {
  IMAGES_PER_GROUP,
  GROUP_INTERVAL_MS,
  MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
  ERROR_TIMEOUT_SEC,
} from "../constants";
import { useHistory } from "./useHistory";
import { useCountdown } from "./useCountdown";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const createGroups = (images: ImageFile[]): PostGroup[] => {
  const groups: PostGroup[] = [];
  for (let i = 0; i < images.length; i += IMAGES_PER_GROUP) {
    groups.push({
      id: crypto.randomUUID(),
      images: images.slice(i, i + IMAGES_PER_GROUP),
      status: "pending",
      retryCount: 0,
    });
  }
  return groups;
};

interface PostResult {
  response: PostResponse;
  postBody: string;
  postedAt: Date;
}

// 1グループを再試行込みで投稿する。
// タイムスタンプは試行ごとに再生成する（同一本文による重複投稿エラーを避けるため）。
// 再試行はネットワーク/サーバーエラーのみ。4xx（レート制限含む）を再試行しても
// 画像アップロードで X API を無駄に消費するだけなので即座に失敗させる。
const postGroupWithRetry = async (
  group: PostGroup,
  baseText: string,
  onRetry: (retryCount: number) => void
): Promise<PostResult> => {
  const base64Images = await Promise.all(
    group.images.map((img) => readFileAsDataURL(img.file))
  );

  let attempt = 0;
  for (;;) {
    const postedAt = new Date();
    const postBody = buildPostBody(baseText, postedAt);
    try {
      const response = await postTweet(postBody, base64Images);
      return { response, postBody, postedAt };
    } catch (error: unknown) {
      const apiError = toApiError(error, "投稿に失敗しました");
      if (!apiError.retryable || attempt >= MAX_RETRIES) {
        throw apiError;
      }
      attempt += 1;
      console.warn(`Retrying group... attempt ${attempt}`, apiError.message);
      onRetry(attempt);
      await delay(RETRY_BASE_DELAY_MS * 2 ** attempt); // Exponential backoff
    }
  }
};

export const useAutoPost = () => {
  const [isPosting, setIsPosting] = useState(false);
  const [groups, setGroups] = useState<PostGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

  const { history, addToHistory, deleteHistory, clearHistory } = useHistory();
  const {
    countdown: errorCountdown,
    start: startErrorCountdown,
    cancel: cancelErrorCountdown,
  } = useCountdown();

  const processGroups = useCallback(
    async (initialGroups: PostGroup[], baseText: string) => {
      const activeGroups = [...initialGroups];
      const patchGroup = (index: number, patch: Partial<PostGroup>) => {
        activeGroups[index] = { ...activeGroups[index], ...patch };
        setGroups([...activeGroups]);
      };

      let hasError = false;

      for (let i = 0; i < activeGroups.length; i++) {
        setCurrentGroupIndex(i);
        patchGroup(i, { status: "posting", error: undefined });

        try {
          const { response, postBody, postedAt } = await postGroupWithRetry(
            activeGroups[i],
            baseText,
            (retryCount) => patchGroup(i, { retryCount })
          );

          patchGroup(i, { status: "success" });

          const thumbnail = await resizeThumbnail(activeGroups[i].images[0].file);
          addToHistory({
            id: response.postId,
            text: postBody,
            timestamp: postedAt.toISOString(),
            postUrl: response.postUrl,
            thumbnail,
          });
        } catch (error: unknown) {
          const apiError = toApiError(error, "投稿に失敗しました");
          console.error(apiError);
          hasError = true;
          patchGroup(i, { status: "failed", error: apiError.message });

          // レート制限中は残りのグループも失敗するだけなので、
          // 画像アップロードによる X API の無駄な消費を避けて中断する
          if (apiError.rateLimited) {
            for (let j = i + 1; j < activeGroups.length; j++) {
              patchGroup(j, {
                status: "failed",
                error: "レート制限のため中断しました",
              });
            }
            break;
          }
        }

        if (i < activeGroups.length - 1) {
          await delay(GROUP_INTERVAL_MS);
        }
      }

      if (hasError) {
        // エラーがあった場合はカウントダウン終了までボタンを無効のままにする
        startErrorCountdown(ERROR_TIMEOUT_SEC, () => setIsPosting(false));
      } else {
        setIsPosting(false);
      }
    },
    [addToHistory, startErrorCountdown]
  );

  const startPosting = useCallback(
    (text: string, images: ImageFile[]) => {
      if (images.length === 0 || isPosting) return;

      cancelErrorCountdown();

      const initialGroups = createGroups(images);
      setGroups(initialGroups);
      setCurrentGroupIndex(0);
      setIsPosting(true);

      processGroups(initialGroups, text);
    },
    [isPosting, cancelErrorCountdown, processGroups]
  );

  return {
    isPosting,
    groups,
    currentGroupIndex,
    history,
    errorCountdown,
    startPosting,
    deleteHistory,
    clearHistory,
  };
};
