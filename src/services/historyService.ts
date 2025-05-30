'use client';

import { Message } from '@/types/chat';
import { getUserHost } from '@/utils/hostManager';

/**
 * 获取指定用户的历史消息
 * @param userId 用户ID
 * @param host 可选的API Host，如果提供则优先使用
 * @returns 历史消息列表
 */
export async function fetchHistoryMessages(userId: string, host?: string): Promise<Message[]> {
  try {
    const apiHost = host || getUserHost(userId);
    const response = await fetch(`https://${apiHost}/api/session/${userId}/messages`);
    if (!response.ok) {
      throw new Error(`获取历史消息失败: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 过滤掉 system 消息，并转换为 Message 类型
    return data
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => ({
        id: msg.message_id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
  } catch (error) {
    console.error('获取历史消息出错:', error);
    return [];
  }
}
