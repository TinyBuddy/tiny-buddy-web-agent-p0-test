"use client";

import { Message } from "@/types/chat";
import { PerformanceMetrics as PerformanceMetricsType } from "@/types/performance";
import { useEffect, useRef, useState } from 'react';
// 导入自定义钩子
import { DEFAULT_AI_MODEL, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_TTS_VOICE_ID } from '@/constants/ai';
import useAudioPlayer from "@/hooks/useAudioPlayer";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useChatState from "@/hooks/useChatState";
import { getUserId } from '@/utils/userIdManager';
import { fetchHistoryMessages } from '@/services/historyService';
import { getUserHost } from "@/utils/hostManager";

// 导入组件
import AISettingsModal from "@/components/AISettingsModal";
import ChatHistory from "@/components/ChatHistory";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import RecordButton from "@/components/RecordButton";
import StatusDisplay from "@/components/StatusDisplay";

import { songService } from '@/services/SongService';
import { soundEffectService } from '@/services/SoundEffectService';
import { randomUUID } from "crypto";

// 添加移动设备检测函数
const isMobile = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export default function Home() {
  // ASR 状态
  const [transcription, setTranscription] = useState("");
  const [isOnMobile, setIsOnMobile] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // 性能指标
  const [metrics, setMetrics] = useState<PerformanceMetricsType>({
    asrTime: 0,
    aiRequestTime: 0,
    ttsTime: 0,
  });
  
  // 控制性能指标浮窗的显示和隐藏
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(false);
  
  // 切换性能指标浮窗的显示状态
  const togglePerformanceMetrics = () => {
    setShowPerformanceMetrics(prev => !prev);
  };

  // 控制聊天历史边栏的显示和隐藏
  const [showChatHistory, setShowChatHistory] = useState(true);
  
  // 切换聊天历史边栏的显示状态
  const toggleChatHistory = () => {
    setShowChatHistory(prev => !prev);
  };

  // AI 生成参数设置
  const [aiSettings, setAiSettings] = useState({
    temperature: DEFAULT_TEMPERATURE,
    top_p: DEFAULT_TOP_P,
    model: DEFAULT_AI_MODEL,
    voiceId: DEFAULT_TTS_VOICE_ID,
    userBio: '',
  });

  // 使用自定义钩子
  const recorder = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete,
    onRecordingStart: () => {
      console.log("录音开始回调触发");
      setStatusText("Recording...");
    },
    onRecordingError: (error) => {
      console.error("录音错误:", error);
      setStatusText("Recording failed");

      // 如果是"没有录制到音频数据"错误，可能是录音未正确开始，重置状态
      if (error.message === "没有录制到音频数据") {
        setTimeout(() => {
          setStatusText("Listening...");
        }, 2000);
      }
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
    songService.initialize();
    soundEffectService.initialize();
  }, []);

  const audioPlayer = useAudioPlayer({
    onPlayStart: () => {
      console.log("音频开始播放");
      setStatusText("Playing audio...");
    },
    onPlayEnd: () => {
      console.log("音频播放结束");
      setStatusText("Listening...");
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("音频播放出错:", error);
      setStatusText("Audio playback failed");
      setIsProcessing(false);
    },
  });

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
  // 正在播放音乐的状态
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  /**
   * 处理录音按钮点击
   */
  const handleRecordButtonClick = () => {
    console.log("录音按钮点击, 当前录音状态:", recorder.isRecording);
    if (recorder.isRecording) {
      stopRecording();
    } else {

      // 如果音乐正在播放，则停止音乐播放
      if (isPlayingMusic) {
        stopMusicPlayback();
      }

      // 如果 TTS 音频正在播放，则停止 TTS 音频播放
      if (audioPlayer.status === "playing") {
        console.log("停止 TTS 音频播放");
        audioPlayer.stopAudio();
      }
      
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
    // setAudioBlob(blob);

    // 开始计时ASR处理时间
    const asrStartTime = performance.now();
    try {
      setIsTranscribing(true);
      setStatusText("Transcribing...");

      // get the last assistant message from the messages array
      const lastAssistantMessage = messages.findLast((message) => message.role === "assistant");
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
   * 处理用户消息并获取AI响应（流式）
   */
  async function processUserMessage(userMessage: string) {
    setIsProcessing(true);
    setStatusText("Processing...");
    let uuid = self.crypto.randomUUID();
    // 开始计时AI请求时间
    const aiStartTime = performance.now();

    try {
      // 构建请求消息
      const chatMessages: Message[] = [
        ...messages,
        // 新的用户消息
        {role: "user", content: userMessage ,id : uuid},
      ];

      // 清空当前助手消息
      addAssistantMessage("");
      const userId = getUserId(true);
      const apiHost = getUserHost(userId);

      // 创建 EventSource 连接
      const response = await fetch("/api/chat-stream", {
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

      if (!response.ok) {
        throw new Error(
          `AI请求失败: ${response.status} ${response.statusText}`
        );
      }

      // 用于存储完整的响应
      let fullAssistantMessage = "";
      // 用于跟踪是否正在播放TTS
      let isPlayingAudio = false;
      // 用于存储TTS音频队列
      const audioQueue: Blob[] = [];
      // 用于存储待处理的文本队列
      const textQueue: string[] = [];
      // 用于跟踪是否正在生成TTS
      let isGeneratingTTS = false;

      // 处理TTS文本生成
      const processTtsGeneration = async () => {
        if (textQueue.length > 0 && !isGeneratingTTS) {
          isGeneratingTTS = true;
          const text = textQueue.shift()!;
          
          try {
            console.log("开始生成TTS音频:", text.substring(0, 30) + "...");
            const audioBlob = await generateTTS(text);
            console.log("TTS音频生成完成，添加到播放队列");
            
            // 将生成的音频添加到队列
            audioQueue.push(audioBlob);
            
            // 如果没有正在播放音频，开始播放
            if (!isPlayingAudio) {
              playNextAudio();
            }
          } catch (error) {
            console.error("生成TTS失败:", error);
          } finally {
            isGeneratingTTS = false;
            // 继续处理下一个文本
            if (textQueue.length > 0) {
              processTtsGeneration();
            }
          }
        }
      };

      // 播放下一个音频
      const playNextAudio = async () => {
        if (audioQueue.length > 0 && !isPlayingAudio) {
          isPlayingAudio = true;
          const audioBlob = audioQueue.shift()!;
          
          try {
            console.log("开始播放队列中的音频");
            await playAudio(audioBlob);
            console.log("音频播放完成，检查队列中是否有下一个");
          } catch (error) {
            console.error("播放音频失败:", error);
          } finally {
            isPlayingAudio = false;
            // 检查队列中是否还有音频
            if (audioQueue.length > 0) {
              // 延迟一小段时间再播放下一个，确保语音之间有自然停顿
              setTimeout(() => {
                playNextAudio();
              }, 50);
            } else {
              console.log("音频队列已清空");
              // 如果文本队列也为空，设置状态为完成
              if (textQueue.length === 0 && !isGeneratingTTS) {
                console.log("所有处理已完成，重置状态");
                setStatusText("Listening...");
                setIsProcessing(false);
                setIsTranscribing(false);
              }
            }
          }
        }
      };

      // 生成TTS音频
      async function generateTTS(text: string): Promise<Blob> {
        const ttsStartTime = performance.now();
        console.log("开始TTS处理:", text.substring(0, 50) + "...");
        setStatusText("Generating speech...");

        try {
          // 发送文本到TTS服务
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              format: "mp3",
              voiceId: aiSettings.voiceId,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `TTS请求失败: ${response.status} ${response.statusText}`
            );
          }

          const audioBlob = await response.blob();
          const ttsEndTime = performance.now();

          // 添加更详细的日志
          console.log("TTS音频信息:", {
            size: audioBlob.size,
            type: audioBlob.type,
            duration: ttsEndTime - ttsStartTime,
          });

          // 更新TTS处理时间
          setMetrics((prev) => ({
            ...prev,
            ttsTime: ttsEndTime - ttsStartTime,
          }));

          return audioBlob;
        } catch (error) {
          console.error("TTS处理失败:", error);
          throw error;
        }
      }

      // 播放音频
      async function playAudio(audioBlob: Blob): Promise<void> {
        try {
          if (isMobile()) {
            console.log("移动设备：准备播放音频");
            setStatusText("Audio generated, please click the button to play");
            setAudioBlob(audioBlob);
            // 在移动设备上，我们需要等待用户手动播放
            return new Promise<void>((resolve) => {
              const handlePlayComplete = () => {
                console.log("移动设备：收到播放完成事件");
                resolve();
                window.removeEventListener('audioPlayComplete', handlePlayComplete);
              };
              window.addEventListener('audioPlayComplete', handlePlayComplete);
            });
          }

          try {
            // 使用主要播放方法
            console.log("使用主要播放方法");
            return await audioPlayer.playAudio(audioBlob);
          } catch (playError) {
            console.warn("主播放方式失败，尝试备选播放方案:", playError);

            // 创建音频URL并使用HTML5 Audio元素播放
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio();
            
            // 设置音频属性
            audio.preload = "auto";
            audio.volume = 1.0;

            audio.onplay = () => {
              console.log("备选播放方案：音频开始播放");
              setStatusText("Playing audio...");
            };

            // 使用 Promise 包装音频播放，确保等待播放完成
            return new Promise<void>((resolve, reject) => {
              audio.onended = () => {
                console.log("备选播放方案：音频播放结束");
                URL.revokeObjectURL(audioUrl); // 清理URL
                resolve();
              };

              audio.onerror = (e) => {
                console.error("备选播放方案：播放失败", e);
                setStatusText("Audio playback failed");
                URL.revokeObjectURL(audioUrl);
                reject(new Error("音频播放失败"));
              };

              // 设置音频源并加载
              audio.src = audioUrl;
              audio.load();
              
              // 使用 setTimeout 给浏览器一些时间来准备音频
              setTimeout(() => {
                audio.play().catch((error) => {
                  console.error("备选播放方案：无法播放音频", error);
                  URL.revokeObjectURL(audioUrl);
                  reject(error);
                });
              }, 100);
            });
          }
        } catch (error) {
          console.error("音频播放失败:", error);
          throw error;
        }
      }

      // 播放音乐URL
      async function playMusic(musicUrl: string): Promise<void> {
        try {
          console.log("开始播放音乐:", musicUrl);
          setStatusText("Playing music...");
          setIsPlayingMusic(true);
          
          // 创建音频元素
          const audio = new Audio(musicUrl);
          
          // 设置音频属性
          audio.preload = "auto";
          audio.volume = 1.0;
          
          // 监听停止音乐播放事件
          const handleStopMusic = () => {
            console.log("收到停止音乐播放事件");
            audio.pause();
            audio.currentTime = 0;
            window.removeEventListener('stopMusicPlayback', handleStopMusic);
          };
          
          window.addEventListener('stopMusicPlayback', handleStopMusic);
          
          // 使用 Promise 包装音频播放，确保等待播放完成
          return new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              console.log("音乐播放结束");
              setStatusText("Music playback completed");
              setIsPlayingMusic(false);
              setTimeout(() => {
                setStatusText("Listening...");
              }, 2000);
              window.removeEventListener('stopMusicPlayback', handleStopMusic);
              resolve();
            };
            
            audio.onerror = (e) => {
              console.error("音乐播放失败", e);
              setStatusText("Music playback failed");
              setIsPlayingMusic(false);
              window.removeEventListener('stopMusicPlayback', handleStopMusic);
              reject(new Error("音乐播放失败"));
            };
            
            // 开始播放
            audio.play().catch(error => {
              console.error("无法播放音乐", error);
              window.dispatchEvent(new Event('stopMusicPlayback'));
              window.removeEventListener('stopMusicPlayback', handleStopMusic);
              reject(error);
            });
          });
        } catch (error) {
          console.error("音乐播放处理失败:", error);
          setStatusText("Music playback error");
          setIsPlayingMusic(false);
          throw error;
        }
      }

      // 读取流数据
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      
      // 标记是否已收到第一个数据块
      let firstChunkReceived = false;

      // 注意: 这里我们改变了AI请求时间的测量方式
      // 现在: 只记录收到第一个stream数据的时间点
      // 这样可以更准确地反映AI开始响应的时间点

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // 如果是第一个数据块，记录时间
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          const firstChunkTime = performance.now();
          const timeToFirstChunk = firstChunkTime - aiStartTime;
          console.log("收到第一个数据块，时间:", timeToFirstChunk, "ms");
          
          // 更新AI请求时间 - 只记录从请求发送到收到第一个数据的时间
          setMetrics((prev) => ({
            ...prev,
            aiRequestTime: timeToFirstChunk,
          }));
        }
        
        // 解码数据
        const chunk = decoder.decode(value);
        // 处理SSE格式的数据
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.text) {
                // 更新UI显示
                fullAssistantMessage += data.text;
                updateCurrentAssistantMessage(fullAssistantMessage);
                
                // 如果是完整的句子，发送到TTS生成队列
                if (!data.done) {
                  // 将句子添加到TTS文本队列
                  textQueue.push(data.text);
                  // 处理TTS生成
                  processTtsGeneration();
                }
              }
              
              // 检查是否有音乐URL
              if (data.musicUrl) {
                console.log("检测到音乐播放请求:", data.musicUrl);
                
                // 创建一个等待所有TTS播放完成后执行的函数
                const playMusicWhenTtsCompleted = async () => {
                  console.log("等待所有TTS队列处理完成后播放音乐");
                  
                  // 等待所有现有TTS文本处理和音频播放完成
                  while (textQueue.length > 0 || audioQueue.length > 0 || isPlayingAudio || isGeneratingTTS) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                  
                  // 所有TTS处理完成后，播放音乐
                  console.log("所有TTS处理完成，开始播放音乐:", data.musicUrl);
                  playMusic(data.musicUrl);
                };
                
                // 启动等待和播放流程
                playMusicWhenTtsCompleted();
              }
              
              // 如果是最后一块数据
              if (data.done) {
                // 注意：我们不再在这里更新aiRequestTime，因为我们只关心第一个数据块的接收时间
                
                // 如果缓冲区中还有内容，处理剩余内容
                if (data.text && data.text.trim()) {
                  textQueue.push(data.text);
                  processTtsGeneration();
                }
                
                // 确保最终的助手消息被正确添加到聊天历史中
                if (fullAssistantMessage.trim()) {
                  console.log("流式处理完成，最终消息长度:", fullAssistantMessage.length);
                }
              }
            } catch (e) {
              console.error("解析流数据失败:", e);
            }
          }
        }
      }
      
      // 检查是否所有处理都已完成
      console.log("检查处理状态:", {
        isPlayingAudio,
        audioQueueLength: audioQueue.length,
        textQueueLength: textQueue.length,
        isGeneratingTTS
      });
      
      // 如果没有TTS在播放，也没有待处理的队列，设置状态为完成
      if (!isPlayingAudio && audioQueue.length === 0 && textQueue.length === 0 && !isGeneratingTTS) {
        console.log("所有处理已完成，重置状态");
        setStatusText("Listening...");
        setIsProcessing(false);
        setIsTranscribing(false);
      }
    } catch (error) {
      console.error("AI处理失败:", error);
      setStatusText("Failed to get response. Try again.");
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
   * 格式化性能指标时间
   */
  const formatTime = (time: number) => {
    return time < 1000
      ? `${Math.round(time)}ms`
      : `${(time / 1000).toFixed(2)}s`;
  };

  // 网页标题更新
  useEffect(() => {
    document.title = recorder.isRecording ? "🔴 Recording..." : "AI Buddy";
  }, [recorder.isRecording]);

  /**
   * 停止音乐播放
   */
  const stopMusicPlayback = () => {
    console.log("停止音乐播放");
    
    // 创建停止音乐播放的事件
    const stopMusicEvent = new Event('stopMusicPlayback');
    window.dispatchEvent(stopMusicEvent);
    
    // 更新状态
    setIsPlayingMusic(false);
    setStatusText("Music playback stopped");
    
    // 延迟恢复默认状态文本
    setTimeout(() => {
      setStatusText("Listening...");
    }, 1000);
  };

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentHost, setCurrentHost] = useState<string>('');

  useEffect(() => {
    const userId = getUserId();
    if (userId && userId !== currentUserId) {
      setCurrentUserId(userId);
      const host = getUserHost(userId);
      if (host && host !== currentHost) {
        setCurrentHost(host);
      }
      
      // 获取历史消息
      fetchHistoryMessages(userId).then(messages => {
        if (messages.length > 0) {
          // 重置聊天状态并添加历史消息
          resetChatMessages();
          messages.forEach(msg => {
            addMessage(msg);
          });
          console.log(`[Home] 已加载 ${messages.length} 条历史消息`);
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleUserIdUpdate = () => {
      const newUserId = getUserId();
      if (newUserId && newUserId !== currentUserId) {
        setCurrentUserId(newUserId);
        const newHost = getUserHost(newUserId);
        setCurrentHost(newHost);
        
        // 获取新用户的历史消息
        fetchHistoryMessages(newUserId).then(messages => {
          // 重置聊天状态并添加历史消息
          resetChatMessages();
          messages.forEach(msg => {
            addMessage(msg);
          });
          console.log(`[Home] 已加载新用户 ${messages.length} 条历史消息`);
        });
      }
    };

    // 监听用户ID更新事件
    window.addEventListener('userIdUpdated', handleUserIdUpdate);
    return () => {
      window.removeEventListener('userIdUpdated', handleUserIdUpdate);
    };
  }, [currentUserId]);

  // 添加对host变更的监听
  useEffect(() => {
    const handleHostUpdate = () => {
      const userId = currentUserId || getUserId();
      const newHost = getUserHost(userId);
      
      if (newHost && newHost !== currentHost) {
        console.log(`[Home] Host已更新: ${currentHost} -> ${newHost}`);
        setCurrentHost(newHost);
        
        // 获取新Host下的历史消息
        fetchHistoryMessages(userId, newHost).then(messages => {
          // 重置聊天状态并添加历史消息
          resetChatMessages();
          messages.forEach(msg => {
            addMessage(msg);
          });
          console.log(`[Home] 已加载新Host (${newHost}) 下的 ${messages.length} 条历史消息`);
        });
      }
    };

    // 监听host更新事件
    window.addEventListener('hostUpdated', handleHostUpdate);
    return () => {
      window.removeEventListener('hostUpdated', handleHostUpdate);
    };
  }, [currentUserId, currentHost]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50">
      {/* 移动设备提示 */}
      {isOnMobile ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-blue-500 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 01 15 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
          </svg>
          <h1 className="text-2xl font-bold mb-4">请使用电脑访问</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            抱歉，我们的应用目前仅支持桌面设备使用。<br />
            请使用电脑或笔记本电脑访问以获得最佳体验。
          </p>
      
        </div>
      ) : (
        <>
          {/* 顶部控制栏 */}
          <div className="fixed top-4 right-4 z-50 flex space-x-2">
            {/* 聊天历史切换按钮 - 仅在聊天历史隐藏时显示 */}
            {!showChatHistory && (
              <button
                onClick={toggleChatHistory}
                className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full p-2"
                title="Show chat history"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-500 dark:text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* 性能指标 */}
          {showPerformanceMetrics && (
            <PerformanceMetrics metrics={metrics} formatTime={formatTime} />
          )}

          <main className="flex-1 flex flex-col items-center justify-between p-8 relative">
            {/* 聊天历史记录面板 */}
            {showChatHistory && (
              <ChatHistory 
                messages={messages} 
                onClear={handleClear} 
                onTogglePerformance={togglePerformanceMetrics}
                showPerformance={showPerformanceMetrics}
                onToggleChatHistory={toggleChatHistory}
                aiSettings={aiSettings}
                onUpdateAiSettings={(newSettings) => setAiSettings({
                  ...aiSettings,
                  ...newSettings,
                  userBio: (newSettings as any).userBio || aiSettings.userBio || ''
                })}
              />
            )}

            {/* 主要内容区域 */}
            <div className={`flex-1 flex flex-col items-center justify-center w-full ${showChatHistory ? 'md:pr-64' : ''}`}>
              {/* 状态显示 */}
              <StatusDisplay
                statusText={statusText}
                isRecording={recorder.isRecording}
                isTranscribing={isTranscribing}
                isProcessing={isProcessing}
                ttsStatus={audioPlayer.status}
                isPlayingMusic={isPlayingMusic}
              />
              {isOnMobile && audioBlob && (
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded-md mb-30"
                  onClick={() => {
                    if (audioBlob) {
                      console.log("移动设备：用户点击播放按钮");
                      const audioUrl = URL.createObjectURL(audioBlob);
                      const audio = new Audio();
                      
                      // 设置音频属性
                      audio.preload = "auto";
                      audio.volume = 1.0;

                      audio.onplay = () => {
                        console.log("移动设备：音频开始播放");
                        setStatusText("Playing audio...");
                      };
                      
                      audio.onended = () => {
                        console.log("移动设备：音频播放结束");
                        // 触发自定义事件，通知 playAudio Promise 解决
                        window.dispatchEvent(new Event('audioPlayComplete'));
                        // 清理资源
                        URL.revokeObjectURL(audioUrl);
                        // 清除音频Blob，防止重复播放
                        setAudioBlob(null);
                      };
                      
                      audio.onerror = (e) => {
                        console.error("移动设备：音频播放失败", e);
                        // 即使出错也触发完成事件，以便继续处理队列
                        window.dispatchEvent(new Event('audioPlayComplete'));
                        URL.revokeObjectURL(audioUrl);
                        setAudioBlob(null);
                      };
                      
                      // 设置音频源并加载
                      audio.src = audioUrl;
                      audio.load();
                      
                      // 播放音频
                      setTimeout(() => {
                        audio.play().catch((error) => {
                          console.error("移动设备：无法播放音频", error);
                          window.dispatchEvent(new Event('audioPlayComplete'));
                          URL.revokeObjectURL(audioUrl);
                          setAudioBlob(null);
                        });
                      }, 100);
                    }
                  }}
                >
                  播放语音
                </button>
              )}
              <p className="text-green-500 dark:text-gray-400 py-2 text-sm text-center mb-4">
               {currentUserId || 'Loading...'} {currentHost || 'Loading...'}
              </p>
              {/* 录音按钮 */}
              <RecordButton
                isRecording={recorder.isRecording}
                isProcessing={isProcessing || isTranscribing}
                ttsStatus={audioPlayer.status}
                onClick={handleRecordButtonClick}
              />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
