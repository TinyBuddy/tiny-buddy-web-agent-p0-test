import { DEFAULT_AI_MODEL, DEFAULT_TTS_VOICE_ID } from "@/constants/ai";
import { Message } from '@/types/chat';
import { AsrLogger, ChatLogger, TtsLogger } from '@/utils/logger';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import os from 'os';
import path from 'path';
import AudioUploadService from './AudioUploadService';
import { songService } from './SongService';
import { soundEffectService } from './SoundEffectService';

/**
 * AI 服务类，用于处理与各种 AI API 的交互，包括 OpenAI 的 ASR 和 ElevenLabs 的 TTS
 */
export class AIService {
  private readonly _axios: AxiosInstance;

  // API 密钥直接在类中设置
  private readonly _openAIApiKey: string =
    "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"; // 填写您的 OpenAI API 密钥
  private readonly _elevenLabsApiKey: string =
    "sk_cbe05d648a62df6a1790fe2abedab8cdb458e00494a7b7ab"; // 填写您的 ElevenLabs API 密钥
  private readonly _openRouterApiKey: string =
    "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"; // 填写您的 OpenRouter API 密钥

  private readonly _defaultModel: string = DEFAULT_AI_MODEL;

  constructor() {
    this._axios = axios.create({
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * 检查 OpenAI API 密钥是否已设置
   */
  get isOpenAIApiKeySet(): boolean {
    return this._openAIApiKey.length > 0;
  }

  /**
   * 检查 ElevenLabs API 密钥是否已设置
   */
  get isElevenLabsApiKeySet(): boolean {
    return this._elevenLabsApiKey.length > 0;
  }

  /**
   * 检查 OpenRouter API 密钥是否已设置
   */
  get isOpenRouterApiKeySet(): boolean {
    return this._openRouterApiKey.length > 0;
  }

  /**
   * 使用 Whisper API 转写音频文件
   *
   * @param audioFilePath - 要转写的音频文件路径
   * @param language - 可选参数，指定音频语言，如果不指定，Whisper 会自动检测
   * @returns 转写的文本内容
   */
  async transcribeAudio(
    audioFilePath: string,
    language?: string,
    lastSentence?: string
  ): Promise<string> {
    if (!this.isOpenAIApiKeySet) {
      throw new Error("OpenAI API 密钥未设置，请先设置 API 密钥");
    }

    if (!fs.existsSync(audioFilePath)) {
      throw new Error("音频文件不存在");
    }

    try {
      AsrLogger.i(`开始转写音频文件: ${audioFilePath}`);

      // 创建表单数据
      const formData = new FormData();
      formData.append("file", fs.createReadStream(audioFilePath));
      formData.append("model", "gpt-4o-transcribe");
      formData.append("response_format", "json");
      formData.append("temperature", "0");
      formData.append(
        "prompt",
        `This transcript might contain both English and Chinese. Mostly english. Speaker is a 2-4 years old child. The child is responding to this sentence: '${lastSentence}'`
      );

      AsrLogger.i(`lastSentence: ${lastSentence}`);

      if (language) {
        formData.append("language", language);
      }

      // 发送请求到 Whisper API
      const response = await this._axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this._openAIApiKey}`,
          },
        }
      );

      // 检查响应状态
      if (response.status === 200) {
        // 解析响应数据
        const data = response.data;
        if (data && data.text) {
          AsrLogger.i(`转写成功，文本长度: ${data.text.length}`);
          return data.text;
        } else {
          throw new Error("无效的响应格式");
        }
      } else {
        throw new Error(`API 请求失败: ${response.status}`);
      }
    } catch (e: unknown) {
      AsrLogger.e("转写音频失败", e);
      if (axios.isAxiosError(e) && e.response) {
        throw new Error(
          `API 请求失败: ${e.response.status} - ${JSON.stringify(
            e.response.data
          )}`
        );
      }
      throw e;
    }
  }

  /**
   * 使用 ElevenLabs API 将文本转换为语音
   *
   * @param text - 要转换为语音的文本
   * @param voiceId - ElevenLabs 的声音 ID，默认使用常量定义的默认值
   * @param modelId - 使用的模型 ID，默认为 'eleven_multilingual_v2'
   * @returns 包含音频数据的临时文件路径
   */
  async textToSpeech(
    text: string,
    voiceId: string = DEFAULT_TTS_VOICE_ID,
    modelId: string = "eleven_flash_v2_5"
  ): Promise<string> {
    TtsLogger.i(`开始文本转语音请求: voiceId=${voiceId}, modelId=${modelId}`);
    TtsLogger.d(
      `文本内容: ${text.length > 100 ? `${text.substring(0, 100)}...` : text}`
    );

    try {
      // 设置请求数据
      const data = {
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      };

      TtsLogger.i("发送请求到ElevenLabs API: /v1/text-to-speech/" + voiceId);
      const startTime = Date.now();

      // 发送请求到 ElevenLabs API
      const response = await this._axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        data,
        {
          responseType: "arraybuffer",
          headers: {
            "xi-api-key": this._elevenLabsApiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const endTime = Date.now();
      TtsLogger.i(`ElevenLabs API响应耗时: ${endTime - startTime}ms`);

      // 检查响应状态
      if (response.status === 200) {
        const responseData = response.data as ArrayBuffer;
        TtsLogger.i(`收到响应数据: ${responseData.byteLength} 字节`);

        // 创建一个子文件夹用于存储TTS音频文件
        const tempDir = path.join(os.tmpdir(), "tts-audio");
        // 确保文件夹存在
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, `tts_${Date.now()}.mp3`);

        // 写入音频数据
        TtsLogger.d(`将音频数据写入临时文件: ${tempFilePath}`);
        fs.writeFileSync(tempFilePath, Buffer.from(responseData));

        const fileSize = fs.statSync(tempFilePath).size;
        TtsLogger.i(`音频文件已保存: ${tempFilePath}, 大小: ${fileSize} 字节`);

        return tempFilePath;
      } else {
        const errorMsg = `API 请求失败: ${response.status}`;
        TtsLogger.e(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (e: unknown) {
      TtsLogger.e("文本转语音请求失败", e);
      if (axios.isAxiosError(e) && e.response) {
        TtsLogger.e(`API响应状态码: ${e.response.status}`);
        TtsLogger.e(`API响应数据: ${e.response.data}`);
        throw new Error(
          `API 请求失败: ${e.response.status} - ${e.response.data}`
        );
      }
      throw e;
    }
  }

  /**
   * 使用 OpenRouter API 发送聊天请求（流式响应）
   *
   * @param messages - 聊天消息列表
   * @param onChunk - 接收到文本块时的回调函数
   * @param onComplete - 完成时的回调函数
   * @param model - 可选参数，指定使用的模型
   * @param temperature - 可选参数，指定温度
   * @param top_p - 可选参数，指定top_p
   * @param providedUserId - 可选参数，提供的用户ID，如果提供则优先使用
   * @param providedHost - 可选参数，提供的API Host，如果提供则优先使用
   * @param userBio - 可选参数，用户的个人简介
   * @returns 取消流式请求的函数
   */
  async chatStream(
    messages: Message[],
    onChunk: (text: string, done: boolean, musicUrl?: string) => void,
    onComplete?: (fullText: string) => void,
    model?: string,
    temperature?: number,
    top_p?: number,
    providedUserId?: string,
    providedHost?: string,
    userBio?: string
  ): Promise<() => void> {
    if (!this.isOpenRouterApiKeySet) {
      ChatLogger.w("OpenRouter API 密钥未设置");
      onChunk("", true);
      if (onComplete) onComplete("");
      return () => {};
    }

    // 用于存储完整响应
    let fullResponse = "";
    // 缓冲区，用于存储不完整的句子
    let buffer = "";

    // 用于跟踪和累积工具调用
    interface ToolCallTracker {
      [id: string]: {
        name: string;
        arguments: string;
        complete: boolean;
      };
    }
    const toolCallsTracker: ToolCallTracker = {};
    // 记录当前流中最后一个有效的工具调用ID
    let lastToolCallId: string | null = null;

    const processedMessages = [...messages];

    ChatLogger.i(`开始流式聊天请求，消息数量: ${processedMessages.length}`);

    // 获取用户ID和对应的host
    let userId;
    let apiHost;

    if (providedUserId) {
      userId = providedUserId;
      ChatLogger.i(`使用提供的用户ID: ${userId}`);
    } else {
      throw new Error("没有提供用户ID");
    }

    if (providedHost) {
      apiHost = providedHost;
      ChatLogger.i(`使用提供的API Host: ${apiHost}`);
    } else {
      throw new Error("没有提供API Host");
    }

    // 创建请求数据
    const data: any = {
      model: model || this._defaultModel,
      messages: processedMessages,
      stream: true,
      temperature: temperature || 1,
      top_p: top_p || 0.7,
      user_id: userId, // 添加用户ID
      single_message: true,
    };

    // 如果提供了用户Bio，添加到prompt_context中
    if (userBio && userBio.trim()) {
      data.prompt_context = {
        USER_BIO: userBio.trim(),
      };
    }

    let latestMessage = processedMessages[processedMessages.length - 1];
    if (latestMessage.role === "user" && latestMessage.id && userId) {
      // async
      ChatLogger.i(`获取最新音频文件`);
      AudioUploadService.getLatestAudioFile(userId, latestMessage.id, apiHost);
    }

    ChatLogger.i(`请求数据: ${JSON.stringify(data)}`);

    // 使用动态host构建API URL
    const apiUrl = `https://${apiHost}/api/chat`;
    ChatLogger.i(`发送请求到API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this._openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: new AbortController().signal,
    });

    if (!response.ok) {
      throw new Error(
        `API 请求失败: ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error("响应没有正文");
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    // 分句正则表达式，匹配句号、问号、感叹号后面的位置
    const sentenceEndRegex = /[.!?。！？…]+[\s"')\]]*/g;

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // 处理缓冲区中剩余的文本
            if (buffer.trim()) {
              onChunk(buffer, true);
              fullResponse += buffer;
            }

            ChatLogger.i(
              `流式聊天响应完成，总内容长度: ${fullResponse.length}`
            );
            if (onComplete) onComplete(fullResponse);
            break;
          }

          // 解码二进制数据
          const chunk = decoder.decode(value, { stream: true });

          // 处理 SSE 格式的数据
          const lines = chunk.split("\n");
          for (const line of lines) {
            // ChatLogger.i(`收到流数据: ${line}`);

            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                // 处理空行或格式错误的数据
                const dataStr = line.substring(6);
                // 跳过空数据和格式错误的数据
                if (!dataStr.trim() || dataStr.includes('"error":')) {
                  ChatLogger.d(`跳过无效数据: ${dataStr}`);
                  continue;
                }

                const data = JSON.parse(dataStr);
                if (data.choices && data.choices.length > 0) {
                  const content = data.choices[0].delta?.content || "";

                  // 检查是否有工具调用
                  const toolCalls = data.choices[0].delta?.tool_calls || [];
                  const message = data.choices[0].delta?.message || {};
                  const messageToolCalls = message.tool_calls || [];

                  // 合并来自两个可能位置的工具调用
                  const allToolCalls = [...toolCalls, ...messageToolCalls];

                  // 处理工具调用，累积参数
                  for (const toolCall of allToolCalls) {
                    if (toolCall.id && toolCall.function) {
                      const id = toolCall.id;
                      lastToolCallId = id; // 更新最后一个工具调用ID

                      // 如果是新的工具调用，初始化跟踪器
                      if (!toolCallsTracker[id]) {
                        toolCallsTracker[id] = {
                          name: toolCall.function.name || "",
                          arguments: "",
                          complete: false,
                        };
                      }

                      // 累积函数名和参数
                      if (toolCall.function.name) {
                        toolCallsTracker[id].name = toolCall.function.name;
                      }

                      if (toolCall.function.arguments) {
                        toolCallsTracker[id].arguments +=
                          toolCall.function.arguments;
                        ChatLogger.d(
                          `累积工具调用参数 [${id}]: ${toolCallsTracker[id].arguments}`
                        );
                      }

                      // 检查是否参数完整 - 检查更精确的JSON完整性标志
                      const args = toolCallsTracker[id].arguments.trim();
                      if (
                        args.startsWith("{") &&
                        args.endsWith("}") &&
                        !toolCallsTracker[id].complete
                      ) {
                        // 计算JSON括号的平衡性，确保格式正确
                        let openBraces = 0;
                        let isInString = false;
                        let isEscaped = false;

                        for (let i = 0; i < args.length; i++) {
                          const char = args[i];

                          if (isEscaped) {
                            isEscaped = false;
                            continue;
                          }

                          if (char === "\\") {
                            isEscaped = true;
                            continue;
                          }

                          if (char === '"' && !isEscaped) {
                            isInString = !isInString;
                            continue;
                          }

                          if (!isInString) {
                            if (char === "{") openBraces++;
                            else if (char === "}") openBraces--;
                          }
                        }

                        // 如果括号平衡且不在字符串中，尝试解析JSON
                        if (openBraces === 0 && !isInString) {
                          try {
                            const parsedArgs = JSON.parse(args);
                            toolCallsTracker[id].complete = true;
                            ChatLogger.i(
                              `工具调用参数完整 [${id}]: ${JSON.stringify(
                                parsedArgs
                              )}`
                            );

                            // 处理媒体播放工具调用
                            this.handleMediaPlayback(
                              toolCallsTracker[id].name,
                              parsedArgs.id,
                              content,
                              buffer,
                              onChunk
                            );
                          } catch (e) {
                            ChatLogger.d(
                              `JSON看起来完整但解析失败 [${id}]: ${e}`
                            );
                            // JSON解析失败，继续累积
                          }
                        } else {
                          ChatLogger.d(
                            `JSON看起来不完整 [${id}]: 括号平衡=${openBraces}, 字符串状态=${isInString}`
                          );
                        }
                      }
                    } else if (
                      toolCall.index === 0 &&
                      !toolCall.id &&
                      toolCall.function &&
                      lastToolCallId
                    ) {
                      // 处理没有ID但有索引和函数的特殊情况（某些API会省略重复ID）
                      if (toolCall.function.arguments) {
                        toolCallsTracker[lastToolCallId].arguments +=
                          toolCall.function.arguments;
                        ChatLogger.d(
                          `使用上一个ID累积参数 [${lastToolCallId}]: ${toolCallsTracker[lastToolCallId].arguments}`
                        );
                      }
                    }
                  }

                  // 仅当没有工具调用或工具调用已处理时处理内容
                  if (content && allToolCalls.length === 0) {
                    // 将新内容添加到缓冲区
                    buffer += content;
                    fullResponse += content;

                    // 检查是否有完整的句子
                    let sentenceMatch;

                    // 重置正则表达式的lastIndex
                    sentenceEndRegex.lastIndex = 0;

                    // 查找所有句子结束标记
                    while (
                      (sentenceMatch = sentenceEndRegex.exec(buffer)) !== null
                    ) {
                      // 提取完整的句子
                      const sentence = buffer.substring(
                        0,
                        sentenceMatch.index + sentenceMatch[0].length
                      );

                      // 检查句子是否有足够内容发送
                      let shouldSendSentence = false;
                      const hasChinese = /[\u4e00-\u9fa5]/.test(sentence);

                      if (hasChinese) {
                        // 对于中文内容，检查中文字符数量
                        const chineseContent = sentence.replace(
                          /[^\u4e00-\u9fa5]/g,
                          ""
                        );
                        shouldSendSentence = chineseContent.length > 3;
                      } else {
                        // 对于非中文内容，检查有意义的词数
                        const words = sentence
                          .trim()
                          .split(/\s+/)
                          .filter(
                            (word) =>
                              word.length > 0 && !/^[.!?,;:"\s]+$/.test(word)
                          );
                        shouldSendSentence = words.length > 2;
                      }

                      if (shouldSendSentence) {
                        // 发送句子到回调
                        onChunk(sentence, false);

                        // 更新缓冲区，移除已处理的句子
                        buffer = buffer.substring(
                          sentenceMatch.index + sentenceMatch[0].length
                        );

                        // 重置正则表达式的lastIndex
                        sentenceEndRegex.lastIndex = 0;
                      } else {
                        continue;
                      }
                    }
                  }
                }
              } catch (e) {
                ChatLogger.w(`解析流数据失败: ${e}`);
              }
            } else if (line === "data: [DONE]") {
              // 流结束，检查是否有未完成的工具调用
              ChatLogger.i("收到流结束标记，检查未完成的工具调用");

              // 如果有最后一个工具调用ID，尝试最终处理
              if (
                lastToolCallId &&
                toolCallsTracker[lastToolCallId] &&
                !toolCallsTracker[lastToolCallId].complete &&
                (toolCallsTracker[lastToolCallId].name === "play_music" ||
                  toolCallsTracker[lastToolCallId].name === "play_sfx")
              ) {
                const toolName = toolCallsTracker[lastToolCallId].name;
                const args = toolCallsTracker[lastToolCallId].arguments.trim();
                ChatLogger.i(
                  `流结束时处理未完成的工具调用 [${lastToolCallId}]: ${args}`
                );

                try {
                  // 尝试多种方式解析或修复JSON
                  let parsedArgs;
                  try {
                    // 1. 尝试直接解析
                    parsedArgs = JSON.parse(args);
                  } catch (e) {
                    ChatLogger.w(`直接解析失败，尝试修复JSON: ${e}`);

                    // 2. 尝试修复不完整的JSON
                    let fixedArgs = args;

                    // 确保以{开始
                    if (!fixedArgs.startsWith("{")) {
                      fixedArgs = "{" + fixedArgs;
                    }

                    // 确保以}结束
                    if (!fixedArgs.endsWith("}")) {
                      fixedArgs = fixedArgs + "}";
                    }

                    // 3. 尝试提取id部分
                    const idMatch = /\"id\":\s*\"([^\"]+)\"/.exec(fixedArgs);
                    if (idMatch && idMatch[1]) {
                      // 手动构建有效的JSON
                      parsedArgs = { id: idMatch[1] };
                      ChatLogger.i(`通过正则提取媒体ID: ${parsedArgs.id}`);
                    } else {
                      // 4. 尝试解析修复后的JSON
                      parsedArgs = JSON.parse(fixedArgs);
                    }
                  }

                  if (parsedArgs && parsedArgs.id) {
                    const mediaId = parsedArgs.id;
                    ChatLogger.i(`流结束时成功提取媒体ID: ${mediaId}`);

                    // 处理媒体播放
                    this.handleMediaPlayback(
                      toolName,
                      mediaId,
                      buffer.trim() ? buffer : "",
                      buffer,
                      onChunk
                    );
                    if (buffer.trim()) {
                      buffer = "";
                    }
                  }
                } catch (e) {
                  ChatLogger.w(`流结束时解析${toolName}参数彻底失败: ${e}`);
                }
              }

              // 流结束，如果还有未处理的缓冲区内容
              if (buffer.trim()) {
                onChunk(buffer, false);
                buffer = "";
              } else {
                // 确保发送完成标志
                onChunk("", true);
              }

              ChatLogger.i("流处理完成");
            }
          }
        }
      } catch (e: unknown) {
        if (new AbortController().signal.aborted) {
          ChatLogger.i("流式请求已被取消");
        } else {
          ChatLogger.e("处理流数据时出错", e);
          onChunk("", true);
          if (onComplete) onComplete(fullResponse);
        }
      }
    };

    // 开始处理流
    processStream();

    // 返回取消函数
    return () => {
      ChatLogger.i("取消流式聊天请求");
      new AbortController().abort();
    };
  }

  /**
   * 处理媒体播放工具调用
   * @param toolName 工具名称 ('play_music' 或 'play_sfx')
   * @param id 媒体ID
   * @param content 当前文本内容
   * @param buffer 缓冲区内容
   * @param onChunk 回调函数
   * @private
   */
  private handleMediaPlayback = (
    toolName: string,
    id: string,
    content: string,
    buffer: string,
    onChunk: (text: string, done: boolean, mediaUrl?: string) => void
  ) => {
    let mediaUrl: string | undefined;
    let mediaType: string;
    let found = false;

    if (toolName === "play_music") {
      mediaType = "歌曲";
      const song = songService.getSongById(id);
      if (song) {
        mediaUrl = song.url;
        found = true;
      }
    } else if (toolName === "play_sfx") {
      mediaType = "音效";
      const soundEffect = soundEffectService.getSoundEffectById(id);
      if (soundEffect) {
        mediaUrl = soundEffect.url;
        found = true;
      }
    } else {
      ChatLogger.e(`未知的媒体工具调用: ${toolName}`);
      return;
    }

    if (found && mediaUrl) {
      ChatLogger.i(`找到${mediaType}URL: ${mediaUrl}`);
      this.handleMusicUrl(mediaUrl, content, buffer, onChunk);
    } else {
      ChatLogger.e(`未找到ID为${id}的${mediaType}`);
      // 如果找不到媒体，仍然处理文本部分
      if (buffer.trim()) {
        onChunk(buffer, false);
        buffer = "";
      }
    }
  };

  /**
   * 辅助函数：处理音乐URL，考虑是否有文本内容
   */
  private handleMusicUrl = (
    musicUrl: string,
    textContent: string,
    buffer: string,
    onChunk: (text: string, done: boolean, musicUrl?: string) => void
  ) => {
    if (textContent) {
      // 如果有文本内容，需要先处理文本
      if (textContent === buffer) {
        // 如果文本就是当前缓冲区，处理缓冲区
        let sentenceMatch;
        const sentenceEndRegex = /[.!?。！？…]+[\s"')\]]*/g;
        sentenceEndRegex.lastIndex = 0;

        // 提取完整句子
        const sentences: string[] = [];
        let lastMatchEnd = 0;

        while ((sentenceMatch = sentenceEndRegex.exec(buffer)) !== null) {
          // 提取完整的句子
          const sentence = buffer.substring(
            lastMatchEnd,
            sentenceMatch.index + sentenceMatch[0].length
          );
          lastMatchEnd = sentenceMatch.index + sentenceMatch[0].length;

          let shouldSendSentence = false;
          const hasChinese = /[\u4e00-\u9fa5]/.test(sentence);

          if (hasChinese) {
            const chineseContent = sentence.replace(/[^\u4e00-\u9fa5]/g, "");
            shouldSendSentence = chineseContent.length > 3;
          } else {
            const words = sentence
              .trim()
              .split(/\s+/)
              .filter(
                (word) => word.length > 0 && !/^[.!?,;:"\s]+$/.test(word)
              );
            shouldSendSentence = words.length > 4;
          }

          if (shouldSendSentence) {
            sentences.push(sentence);
          }
        }

        // 检查是否有剩余内容
        if (lastMatchEnd < buffer.length) {
          const remainingText = buffer.substring(lastMatchEnd);
          if (remainingText.trim().length > 0) {
            sentences.push(remainingText);
          }
        }

        // 发送所有句子，只在最后一个句子附加音乐URL
        if (sentences.length > 0) {
          // 发送除最后一个以外的所有句子
          for (let i = 0; i < sentences.length - 1; i++) {
            onChunk(sentences[i], false);
          }

          // 发送最后一个句子，附加音乐URL
          onChunk(sentences[sentences.length - 1], false, musicUrl);
        } else {
          // 如果没有有效句子但有内容，直接发送带音乐URL的内容
          if (buffer.trim()) {
            onChunk(buffer, false, musicUrl);
          } else {
            // 如果没有内容，只发送音乐URL
            onChunk("", false, musicUrl);
          }
        }
      } else {
        // 如果是单独的文本内容，作为一个句子发送并附加音乐URL
        onChunk(textContent, false, musicUrl);
      }
    } else {
      // 如果没有文本内容，发送空文本和音乐URL
      onChunk("", false, musicUrl);
    }
  };
}

// 创建全局单例实例
export const aiService = new AIService();
