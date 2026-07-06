import { useState, useRef, useCallback, useEffect } from "react";

// 1秒刻みのカウントダウンタイマー。終了時にコールバックを呼ぶ。
export const useCountdown = () => {
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(0);
  }, []);

  const start = useCallback(
    (seconds: number, onFinish?: () => void) => {
      cancel();
      setCountdown(seconds);
      let remaining = seconds;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setCountdown(0);
          onFinish?.();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    },
    [cancel]
  );

  // アンマウント時にタイマーを解放する
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { countdown, start, cancel };
};
