import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/AIService';
import { ChatLogger } from '@/utils/logger';
import { Message } from '@/types/chat';

/**
 * 处理普通聊天请求
 */
export async function POST(request: NextRequest) {
  try {
    ChatLogger.i('收到聊天请求');
    
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
        userBio?: string
      },
      userId?: string,  // 添加用户ID类型
      userBio?: string,  // 添加用户Bio类型
      apiHost?: string  // 添加API Host类型
    };

    ChatLogger.i(`请求体: ${JSON.stringify(body)}`);
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      ChatLogger.e('未提供有效的消息数组');
      return NextResponse.json({ error: '未提供有效的消息数组' }, { status: 400 });
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

    try {
      // 调用AI服务进行聊天
      const response = await aiService.chat(
        messages,
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

      ChatLogger.i('聊天完成，响应长度:', response.length);
      
      return NextResponse.json({ 
        message: response,
        success: true 
      });
    } catch (error: any) {
      ChatLogger.e('AI聊天服务调用失败', error);
      return NextResponse.json(
        { error: error.message || '处理聊天请求时出错' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    ChatLogger.e('聊天请求处理失败', error);
    return NextResponse.json(
      { error: error.message || '处理请求时出错' },
      { status: 500 }
    );
  }
} 