/**
 * 聊天消息类型定义
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
}

/**
 * 聊天状态类型定义
 */
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error?: string;
}
