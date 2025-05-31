import { DEFAULT_AI_MODEL } from "@/constants/ai";
import { Message } from '@/types/chat';
import { AsrLogger, ChatLogger } from '@/utils/logger';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * AI 服务类，用于处理与各种 AI API 的交互，包括 OpenAI 的 ASR 和聊天功能
 */
export class AIService {
  private readonly _axios: AxiosInstance;

  // API 密钥直接在类中设置
  private readonly _openAIApiKey: string =
    "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";
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
   * @param lastSentence - 可选参数，上一句话的内容，用于提供上下文
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
   * 使用 OpenRouter API 发送聊天请求（普通请求）
   *
   * @param messages - 聊天消息列表
   * @param model - 可选参数，指定使用的模型
   * @param temperature - 可选参数，指定温度
   * @param top_p - 可选参数，指定top_p
   * @param providedUserId - 可选参数，提供的用户ID，如果提供则优先使用
   * @param providedHost - 可选参数，提供的API Host，如果提供则优先使用
   * @param userBio - 可选参数，用户的个人简介
   * @returns 完整的AI响应文本
   */
  async chat(
    messages: Message[],
    model?: string,
    temperature?: number,
    top_p?: number,
    providedUserId?: string,
    providedHost?: string,
    userBio?: string
  ): Promise<string> {
    if (!this.isOpenRouterApiKeySet) {
      ChatLogger.w("OpenRouter API 密钥未设置");
      throw new Error("OpenRouter API 密钥未设置");
    }

    const processedMessages = [...messages];

    ChatLogger.i(`开始聊天请求，消息数量: ${processedMessages.length}`);

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
    // const data: any = {
    //   model: model || this._defaultModel,
    //   messages: processedMessages,
    //   stream: false, // 设置为非流式响应
    //   temperature: temperature || 1,
    //   top_p: top_p || 0.7,
    //   user_id: userId, // 添加用户ID
    //   single_message: true,
    // };

    const data: any = {
      user_input: processedMessages.findLast(
        (message) => message.role === "user"
      )?.content,
    };

    // 如果提供了用户Bio，添加到prompt_context中
    if (userBio && userBio.trim()) {
      data.prompt_context = {
        USER_BIO: userBio.trim(),
      };
    }

    ChatLogger.i(`请求数据: ${JSON.stringify(data)}`);

    // 使用动态host构建API URL
    const apiUrl = `https://${apiHost}/api/chat`;
    ChatLogger.i(`发送请求到API: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this._openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `API 请求失败: ${response.status} ${response.statusText}`
        );
      }

      const responseData = await response.json();

      // 提取AI响应内容
      if (responseData.choices && responseData.choices.length > 0) {
        const content = responseData.choices[0].message?.content || "";
        ChatLogger.i(`聊天响应完成，内容长度: ${content.length} ${content}`);
        return content;
      } else {
        throw new Error("无效的响应格式");
      }
    } catch (e: unknown) {
      ChatLogger.e("聊天请求失败", e);
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
}

// 导出单例实例
export const aiService = new AIService();
