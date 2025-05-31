"use client";

import React, { useState, useEffect } from "react";
import { Message } from "@/types/chat";
import useChatState from "@/hooks/useChatState";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import RecordButton from "@/components/RecordButton";
import StatusDisplay from "@/components/StatusDisplay";
import ChatHistory from "@/components/ChatHistory";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import { getUserId } from "@/utils/userIdManager";
import { getUserHost } from "@/utils/hostManager";
import { getOpenAIApiKey } from "@/utils/apiKeyManager";
import { isMobile } from "@/utils/platform";

interface PerformanceMetrics {
  asrTime: number;
  aiRequestTime: number;
}

/**
 * 主页面组件
 * 集成语音识别、AI对话等功能
 */
export default function Home() {
  // ASR 状态
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");

  // 性能指标
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    asrTime: 0,
    aiRequestTime: 0,
  });

  // AI 设置状态
  const [aiSettings, setAiSettings] = useState({
    temperature: 1.0,
    top_p: 0.7,
    model: "anthropic/claude-3.5-sonnet-20241022",
    userBio: "" as string | undefined,
  });

  // 显示状态
  const [showPerformance, setShowPerformance] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [isOnMobile, setIsOnMobile] = useState(false);

  // 用户ID和API Host状态
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentHost, setCurrentHost] = useState<string>("");

  // 录音器
  const recorder = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete,
    onRecordingError: (error) => {
      console.error("录音出错:", error);
      setStatusText("Recording failed. Try again.");
      setIsTranscribing(false);
    },
  });

  useEffect(() => {
    if (isMobile()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const vConsole = require("vconsole");
      new vConsole();
      console.log("vConsole 初始化成功");
      setIsOnMobile(true);
    }
  }, []);

  const {
    messages,
    currentUserMessage,
    currentAssistantMessage,
    isProcessing,
    setIsProcessing,
    addUserMessage,
    addAssistantMessage,
    updateCurrentAssistantMessage,
    clearMessages,
    resetChatMessages,
    addMessage,
  } = useChatState();

  // 状态文本
  const [statusText, setStatusText] = useState("Listening...");

  /**
   * 处理录音按钮点击
   */
  const handleRecordButtonClick = () => {
    console.log("录音按钮点击, 当前录音状态:", recorder.isRecording);
    if (recorder.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /**
   * 开始录音
   */
  const startRecording = () => {
    setStatusText("Recording...");
    console.log("开始录音...");
    recorder.startRecording();
  };

  /**
   * 停止录音
   */
  const stopRecording = () => {
    console.log("停止录音...");
    recorder.stopRecording();
    setStatusText("Processing...");
  };

  /**
   * 处理录音完成
   */
  async function handleRecordingComplete(blob: Blob) {
    setIsTranscribing(true);
    setStatusText("Processing voice...");
    const asrStartTime = performance.now();

    try {
      const lastAssistantMessage = messages.findLast(
        (message) => message.role === "assistant"
      );
      const lastAssistantMessageContent = lastAssistantMessage?.content;

      // 发送音频到语音识别服务
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("lastSentence", lastAssistantMessageContent || "");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `语音识别失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const asrEndTime = performance.now();

      setMetrics((prev) => ({
        ...prev,
        asrTime: asrEndTime - asrStartTime,
      }));

      // 设置转录结果
      setTranscription(data.text);
      console.log("转录结果:", data.text);

      // 如果有识别出内容，进行AI请求
      if (data.text.trim()) {
        addUserMessage(data.text);
        await processUserMessage(data.text);
      } else {
        setStatusText("No speech detected. Try again.");
        setIsTranscribing(false);
      }
    } catch (error) {
      console.error("语音识别失败:", error);
      setStatusText("Transcription failed. Try again.");
      setIsTranscribing(false);
    }
  }

  /**
   * 处理用户消息并获取AI响应（普通请求）
   */
  async function processUserMessage(userMessage: string) {
    setIsProcessing(true);
    setStatusText("Processing...");
    const uuid = self.crypto.randomUUID();
    // 开始计时AI请求时间
    const aiStartTime = performance.now();

    try {
      // 构建请求消息
      const chatMessages: Message[] = [
        ...messages,
        // 新的用户消息
        { role: "user", content: userMessage, id: uuid },
      ];

      // 清空当前助手消息
      addAssistantMessage("");
      const userId = getUserId(true);
      const apiHost = getUserHost(userId);

      // 发送普通聊天请求
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatMessages,
          aiSettings: aiSettings,
          userId: userId, // 获取最新的用户ID并传递给API
          apiHost: apiHost, // 获取最新的API Host并传递给API
        }),
      });

      const aiEndTime = performance.now();

      // 更新AI请求时间
      setMetrics((prev) => ({
        ...prev,
        aiRequestTime: aiEndTime - aiStartTime,
      }));

      if (!response.ok) {
        throw new Error(
          `AI请求失败: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success && data.message) {
        // 更新助手消息
        updateCurrentAssistantMessage(data.message);
        console.log("AI响应完成，消息长度:", data.message.length);
        setStatusText("Listening...");
      } else {
        throw new Error(data.error || "无效的响应格式");
      }
    } catch (error) {
      console.error("AI处理失败:", error);
      setStatusText("Failed to get response. Try again.");
    } finally {
      setIsProcessing(false);
      setIsTranscribing(false);
    }
  }

  /**
   * 清除聊天历史
   */
  const handleClear = () => {
    clearMessages();
    setStatusText("Chat history cleared");
    setTimeout(() => setStatusText("Listening..."), 2000);
  };

  /**
   * 切换性能指标显示
   */
  const handleTogglePerformance = () => {
    setShowPerformance(!showPerformance);
  };

  /**
   * 切换聊天历史显示
   */
  const handleToggleChatHistory = () => {
    setShowChatHistory(!showChatHistory);
  };

  /**
   * 更新AI设置
   */
  const handleUpdateAiSettings = (newSettings: {
    temperature: number;
    top_p: number;
    model: string;
    userBio?: string;
  }) => {
    setAiSettings({
      temperature: newSettings.temperature,
      top_p: newSettings.top_p,
      model: newSettings.model,
      userBio: newSettings.userBio || "",
    });
  };

  // 获取用户ID和Host信息
  useEffect(() => {
    const userId = getUserId(true);
    const host = getUserHost(userId);
    setCurrentUserId(userId);
    setCurrentHost(host);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {isOnMobile && (
        <>
          <div className="fixed top-0 left-0 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40">
            <div className="flex items-center justify-between p-4">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Voice Assistant
              </h1>
              <div className="flex space-x-2">
                <button
                  onClick={handleClear}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleTogglePerformance}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {showPerformance ? "Hide" : "Show"} Metrics
                </button>
                <button
                  onClick={handleToggleChatHistory}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  {showChatHistory ? "Hide" : "Show"} Chat
                </button>
              </div>
            </div>
          </div>

          <main className="pt-20 pb-4 px-4">
            {showPerformance && (
              <div className="mb-4">
                <PerformanceMetrics
                  metrics={{
                    asrTime: metrics.asrTime,
                    aiRequestTime: metrics.aiRequestTime,
                    ttsTime: 0,
                  }}
                  formatTime={(time: number) => `${Math.round(time)}ms`}
                />
              </div>
            )}

            {showChatHistory && (
              <div className="mb-4 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <ChatHistory
                  messages={messages}
                  onClear={handleClear}
                  onTogglePerformance={handleTogglePerformance}
                  showPerformance={showPerformance}
                  onToggleChatHistory={handleToggleChatHistory}
                  aiSettings={aiSettings}
                  onUpdateAiSettings={handleUpdateAiSettings}
                />
              </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              {/* 状态显示 */}
              <StatusDisplay
                statusText={statusText}
                isRecording={recorder.isRecording}
                isTranscribing={isTranscribing}
                isProcessing={isProcessing}
              />

              <p className="text-green-500 dark:text-gray-400 py-2 text-sm text-center mb-4">
                {currentUserId || "Loading..."} {currentHost || "Loading..."}
              </p>

              {/* 录音按钮 */}
              <RecordButton
                isRecording={recorder.isRecording}
                isProcessing={isProcessing || isTranscribing}
                onClick={handleRecordButtonClick}
              />
            </div>
          </main>
        </>
      )}

      {!isOnMobile && (
        <>
          {/* 侧边栏组件 - 性能指标 */}
          {showPerformance && (
            <div className="fixed top-4 left-4 z-30">
              <PerformanceMetrics
                metrics={{
                  asrTime: metrics.asrTime,
                  aiRequestTime: metrics.aiRequestTime,
                  ttsTime: 0,
                }}
                formatTime={(time: number) => `${Math.round(time)}ms`}
              />
            </div>
          )}

          {/* 侧边栏组件 - 聊天历史 */}
          {showChatHistory && (
            <div className="fixed top-0 right-0 h-full w-64 z-20">
              <ChatHistory
                messages={messages}
                onClear={handleClear}
                onTogglePerformance={handleTogglePerformance}
                showPerformance={showPerformance}
                onToggleChatHistory={handleToggleChatHistory}
                aiSettings={aiSettings}
                onUpdateAiSettings={handleUpdateAiSettings}
              />
            </div>
          )}

          {/* 主内容区域 */}
          <main className="flex-1 flex items-center justify-center min-h-screen">
            <div
              className={`flex-1 flex flex-col items-center justify-center w-full ${
                showChatHistory ? "md:pr-64" : ""
              }`}
            >
              {/* 状态显示 */}
              <StatusDisplay
                statusText={statusText}
                isRecording={recorder.isRecording}
                isTranscribing={isTranscribing}
                isProcessing={isProcessing}
              />

              <p className="text-green-500 dark:text-gray-400 py-2 text-sm text-center mb-4">
                {currentUserId || "Loading..."} {currentHost || "Loading..."}
              </p>

              {/* 录音按钮 */}
              <RecordButton
                isRecording={recorder.isRecording}
                isProcessing={isProcessing || isTranscribing}
                onClick={handleRecordButtonClick}
              />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
