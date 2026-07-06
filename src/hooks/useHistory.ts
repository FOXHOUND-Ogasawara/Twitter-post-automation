import { useState, useEffect, useCallback } from "react";
import type { PostHistoryItem } from "../types";
import { HISTORY_KEY, MAX_HISTORY } from "../constants";

// 投稿履歴の管理と localStorage への永続化
export const useHistory = () => {
  const [history, setHistory] = useState<PostHistoryItem[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const addToHistory = useCallback((item: PostHistoryItem) => {
    setHistory((prev) => [item, ...prev].slice(0, MAX_HISTORY));
  }, []);

  const deleteHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addToHistory, deleteHistory, clearHistory };
};
