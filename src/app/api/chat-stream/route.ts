import { NextRequest } from 'next/server';
import { aiService } from '@/services/AIService';
import { ChatLogger } from '@/utils/logger';
import { Message } from '@/types/chat';

/**
 * 处理流式聊天请求
 */
export async function POST(request: NextRequest) {
  try {
    ChatLogger.i('收到流式聊天请求');
    
    // 解析请求体
    const body = await request.json();
    const { 
      messages, 
      model, 
      childIndex = 0, 
      toyIndex = 0,
      aiSettings = { temperature: 1.0, top_p: 0.7, model: 'anthropic/claude-3-7-sonnet' },
      userId,  // 从请求中获取用户ID
      userBio,  // 从请求中获取用户Bio
      apiHost  // 从请求中获取API Host
    } = body as { 
      messages: Message[], 
      model?: string,
      childIndex?: number,
      toyIndex?: number,
      aiSettings?: {
        temperature: number,
        top_p: number,
        model: string,
        voiceId?: string,
        userBio?: string
      },
      userId?: string,  // 添加用户ID类型
      userBio?: string,  // 添加用户Bio类型
      apiHost?: string  // 添加API Host类型
    };

    ChatLogger.i(`请求体: ${JSON.stringify(body)}`);
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      ChatLogger.e('未提供有效的消息数组');
      return new Response(
        JSON.stringify({ error: '未提供有效的消息数组' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    ChatLogger.i(`消息数量: ${messages.length}, 模型: ${model || '默认'}, 儿童角色: ${childIndex}, IP角色: ${toyIndex}, Temperature: ${aiSettings.temperature}, Top_p: ${aiSettings.top_p}`);
    
    // 如果请求中包含用户ID，记录下来
    if (userId) {
      ChatLogger.i(`请求中包含用户ID: ${userId}`);
    } else {
      ChatLogger.i(`请求中不包含用户ID，将使用服务器生成的ID`);
    }
    
    // 如果请求中包含用户Bio，记录下来
    const userBioToUse = userBio || aiSettings.userBio;
    if (userBioToUse) {
      ChatLogger.i(`请求中包含用户Bio: ${userBioToUse.substring(0, 50)}${userBioToUse.length > 50 ? '...' : ''}`);
    }

    // 创建一个 TransformStream 用于处理流式响应
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // 流状态标志
    let streamClosed = false;

    // 安全关闭流的函数
    const safeCloseStream = async () => {
      if (!streamClosed) {
        try {
          streamClosed = true;
          await writer.close();
        } catch (closeError) {
          ChatLogger.e('关闭流失败，可能流已经关闭', closeError);
          // 已经设置了标志，不需要再次尝试关闭
        }
      }
    };

    // 安全写入数据的函数
    const safeWriteToStream = async (data: any) => {
      if (!streamClosed) {
        try {
          await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          return true;
        } catch (e) {
          ChatLogger.e('写入流数据失败，可能流已经关闭', e);
          await safeCloseStream();
          return false;
        }
      }
      return false;
    };

    // 启动流式聊天
    aiService.chatStream(
      messages,
      // 处理每个文本块
      async (text: string, done: boolean, musicUrl?: string) => {
        try {
          // 构建 SSE 消息
          const data = {
            text,
            done,
            musicUrl
          };
          
          // 写入数据
          if (!(await safeWriteToStream(data))) {
            return; // 如果写入失败，直接返回
          }
          
          // 如果完成，关闭流
          if (done) {
            await safeCloseStream();
          }
        } catch (e) {
          ChatLogger.e('处理文本块失败', e);
          await safeWriteToStream({ error: '处理文本块失败', done: true });
          await safeCloseStream();
        }
      },
      // 完成回调
      (fullText: string) => {
        ChatLogger.i('聊天完成，总字数:', fullText.length);
      },
      // 使用请求中指定的模型或设置中的模型
      aiSettings.model || model,
      // 使用设置中的温度
      aiSettings.temperature,
      // 使用设置中的top_p
      aiSettings.top_p,
      // 传递用户ID
      userId,
      // 传递API Host
      apiHost,
      // 传递用户Bio
      userBioToUse,
    );
    
    // 返回流式响应
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    ChatLogger.e('流式聊天请求处理失败', error);
    return new Response(
      JSON.stringify({ error: error.message || '处理请求时出错' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
