"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface AudioPlayerOptions {
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 音频播放钩子函数
 * 提供音频播放相关功能
 */
export function useAudioPlayer({
  onPlayStart,
  onPlayEnd,
  onError,
}: AudioPlayerOptions = {}) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (blobUrlRef.current) {
      console.log("清理旧的音频URL资源");
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * 停止播放
   */
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      console.log("停止播放音频");
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      setStatus("idle");
    }
  }, []);

  /**
   * 播放音频数据
   * @param audioData 要播放的音频数据，可以是Blob、Base64或URL
   * @returns Promise，在音频播放完成后解决
   */
  const playAudio = useCallback(
    async (audioData: Blob | string) => {
      try {
        console.log("开始处理音频数据");

        // 先确保停止当前正在播放的音频并重置状态
        if (audioRef.current) {
          const audio = audioRef.current;
          console.log("停止之前的音频播放");
          audio.pause();
          audio.currentTime = 0;
          audio.removeAttribute("src"); // 移除当前源

          // 移除旧的事件监听器
          audio.onplay = null;
          audio.onended = null;
          audio.onerror = null;
        }

        // 清理之前的URL
        cleanup();

        setStatus("loading");

        let audioBlob: Blob;
        let mimeType = "audio/mpeg";

        // 处理不同类型的输入数据
        if (typeof audioData === "string") {
          if (audioData.startsWith("data:")) {
            console.log("处理Base64编码的音频数据");
            const response = await fetch(audioData);
            audioBlob = await response.blob();
            mimeType = audioBlob.type || mimeType;
          } else {
            console.log("从URL获取音频数据");
            const response = await fetch(audioData);
            audioBlob = await response.blob();
            mimeType = audioBlob.type || mimeType;
          }
        } else {
          console.log(
            "处理Blob数据，大小:",
            audioData.size,
            "类型:",
            audioData.type
          );
          mimeType = audioData.type || mimeType;
          audioBlob = audioData.type
            ? audioData
            : new Blob([audioData], { type: mimeType });
        }

        // 创建新的Audio元素（而不是重用）
        const audio = new Audio();
        audioRef.current = audio;

        // 创建URL并保存引用
        const url = URL.createObjectURL(audioBlob);
        blobUrlRef.current = url;
        console.log("创建新的音频URL，MIME类型:", mimeType);

        // 返回一个Promise，在音频播放完成后解决
        return new Promise<void>((resolve, reject) => {
          // 设置事件监听器
          audio.onplay = () => {
            console.log("音频开始播放");
            setStatus("playing");
            if (onPlayStart) onPlayStart();
          };

          audio.onended = () => {
            console.log("音频播放结束");
            setStatus("idle");
            if (onPlayEnd) onPlayEnd();
            // 不要在这里清理URL，因为可能需要重复播放
            resolve(); // 解决Promise
          };

          audio.onerror = (e) => {
            console.error("音频播放出错:", e);
            setStatus("idle");
            if (onError) onError(new Error("音频播放失败"));
            reject(new Error("音频播放失败")); // 拒绝Promise
          };

          // 设置音频源
          audio.src = url;

          // 播放音频
          try {
            console.log("尝试播放音频");
            // 预加载音频
            audio.load();
            // 确保音量合适
            audio.volume = 1.0;
            // audio speed
            audio.playbackRate = 0.9;

            // 使用setTimeout给浏览器一些时间来准备音频
            setTimeout(() => {
              const playPromise = audio.play();

              if (playPromise !== undefined) {
                playPromise.catch((error) => {
                  console.error("无法播放音频:", error);
                  cleanup(); // 出错时清理资源
                  setStatus("idle");
                  if (onError)
                    onError(
                      error instanceof Error ? error : new Error("播放音频时出错")
                    );
                  reject(error); // 拒绝Promise
                });
              }
            }, 100);
          } catch (error) {
            console.error("无法播放音频:", error);
            cleanup(); // 出错时清理资源
            setStatus("idle");
            if (onError)
              onError(
                error instanceof Error ? error : new Error("播放音频时出错")
              );
            reject(error); // 拒绝Promise
          }
        });
      } catch (error) {
        console.error("处理音频数据时出错:", error);
        cleanup(); // 出错时清理资源
        setStatus("idle");
        if (onError)
          onError(
            error instanceof Error ? error : new Error("处理音频数据时出错")
          );
        throw error;
      }
    },
    [cleanup, onPlayStart, onPlayEnd, onError]
  );

  return {
    status,
    playAudio,
    stopAudio,
    setStatus,
  };
}

export default useAudioPlayer;
