'use client';

import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';

interface ChatStateOptions {
  initialMessages?: Message[];
}

/**
 * 聊天状态管理钩子函数
 * 处理消息状态和交互逻辑
 */
export default function useChatState({
  initialMessages = []
}: ChatStateOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  /**
   * 添加用户消息
   */
  const addUserMessage = useCallback((content: string) => {
    const userMessage: Message = {
      role: 'user',
      content
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentUserMessage(content);
  }, []);
  
  /**
   * 添加助手消息
   */
  const addAssistantMessage = useCallback((content: string) => {
    const assistantMessage: Message = {
      role: 'assistant',
      content
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setCurrentAssistantMessage(content);
  }, []);
  
  /**
   * 更新当前助手消息(用于流式响应)
   */
  const updateCurrentAssistantMessage = useCallback((content: string) => {
    setCurrentAssistantMessage(content);
    
    // 更新消息数组中的最后一条助手消息
    setMessages(prev => {
      // 创建消息数组的副本
      const newMessages = [...prev];
      
      // 查找最后一条助手消息
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === 'assistant') {
          // 更新消息内容
          newMessages[i] = {
            ...newMessages[i],
            content: content
          };
          return newMessages;
        }
      }
      
      // 如果没有找到助手消息，添加一条新的
      return [...newMessages, { role: 'assistant', content }];
    });
  }, []);
  
  /**
   * 清空聊天历史
   */
  const clearMessages = () => {
    setMessages([]);
    setCurrentUserMessage('');
    setCurrentAssistantMessage('');
  };

  /**
   * 重置聊天消息列表
   */
  const resetChatMessages = () => {
    setMessages([]);
    setCurrentUserMessage('');
    setCurrentAssistantMessage('');
    setIsProcessing(false);
  };

  /**
   * 添加消息到列表
   * @param message 消息对象
   */
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  return {
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
  };
}
