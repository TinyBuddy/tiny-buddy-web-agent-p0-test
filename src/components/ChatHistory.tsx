'use client';

import React, { useState } from 'react';
import { Message } from '@/types/chat';
import AISettingsModal from './AISettingsModal';
import { getUserId } from '@/utils/userIdManager';
import { getUserHost } from '@/utils/hostManager';

interface ChatHistoryProps {
  messages: Message[];
  onClear: () => void;
  onTogglePerformance: () => void;
  showPerformance: boolean;
  onToggleChatHistory: () => void;
  aiSettings: {
    temperature: number;
    top_p: number;
    model: string;
    voiceId: string;
  };
  onUpdateAiSettings: (settings: { temperature: number; top_p: number; model: string; voiceId: string }) => void;
}

/**
 * 聊天历史记录组件
 * 显示用户和助手之间的对话历史
 */
const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  messages, 
  onClear, 
  onTogglePerformance,
  showPerformance,
  onToggleChatHistory,
  aiSettings,
  onUpdateAiSettings
}) => {
  // 控制 AI 设置弹框的显示
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  // 复制状态，用于显示复制成功提示
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // 处理清除聊天历史并重置会话
  const handleClearChat = async () => {
    try {
      // 获取当前用户ID
      const userId = getUserId();
      // 获取当前用户的API Host
      const apiHost = getUserHost(userId);
      console.log(`[ChatHistory] 重置会话，用户ID: ${userId}, API Host: ${apiHost}`);
      
      // 调用重置会话API，使用动态获取的host
      const response = await fetch(`https://${apiHost}/api/session/${userId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`[ChatHistory] 重置会话失败: ${response.status} ${response.statusText}`);
      } else {
        console.log('[ChatHistory] 会话重置成功');
      }
    } catch (error) {
      console.error('[ChatHistory] 重置会话出错:', error);
    }
    
    // 调用原有的清除函数
    onClear();
  };

  // 格式化并复制聊天历史
  const handleCopyChat = () => {
    if (messages.length === 0) {
      alert('没有对话内容可复制');
      return;
    }

    try {
      // 格式化消息
      const formattedChat = messages.map(msg => {
        const role = msg.role === 'user' ? '🧑‍💻 User' : '🤖 Toy';
        return `${role}: ${msg.content}`;
      }).join('\n---\n');
      
      // 复制到剪贴板
      navigator.clipboard.writeText(formattedChat)
        .then(() => {
          console.log('[ChatHistory] 对话内容已复制到剪贴板');
          setCopyStatus('success');
          
          // 3秒后重置状态
          setTimeout(() => {
            setCopyStatus('idle');
          }, 3000);
        })
        .catch(err => {
          console.error('[ChatHistory] 复制失败:', err);
          setCopyStatus('error');
          
          // 3秒后重置状态
          setTimeout(() => {
            setCopyStatus('idle');
          }, 3000);
        });
    } catch (error) {
      console.error('[ChatHistory] 格式化或复制出错:', error);
      setCopyStatus('error');
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-1/3 min-w-[320px] max-w-[480px] bg-white dark:bg-gray-800 shadow-lg overflow-y-auto z-40 border-l border-gray-200 dark:border-gray-700 hidden md:block">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat History</h3>
          <div className="flex space-x-1">
            {/* AI 设置按钮 */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5"
              title="AI Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            
            {/* 切换性能指标按钮 */}
            <button
              onClick={onTogglePerformance}
              className={`bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5 ${
                showPerformance ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
              }`}
              title={showPerformance ? "Hide performance metrics" : "Show performance metrics"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </button>
            
            {/* 清除聊天历史按钮 */}
            <button
              onClick={handleClearChat}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5"
              title="Clear chat history"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
            
            {/* 复制聊天历史按钮 */}
            <button
              onClick={handleCopyChat}
              className={`bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5 relative ${
                copyStatus === 'success' ? 'text-green-500 dark:text-green-400' : 
                copyStatus === 'error' ? 'text-red-500 dark:text-red-400' : 
                'text-gray-500 dark:text-gray-400'
              }`}
              title="Copy chat history"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                />
              </svg>
              
              {/* 复制状态提示 */}
              {copyStatus !== 'idle' && (
                <span className="absolute -bottom-7 -right-1 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {copyStatus === 'success' ? '复制成功!' : '复制失败!'}
                </span>
              )}
            </button>
            
            {/* 关闭聊天历史按钮 */}
            <button
              onClick={onToggleChatHistory}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-1.5"
              title="Hide chat history"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="py-2 px-3 mb-200">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No messages yet</p>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`mb-3 p-2 rounded-lg text-xs ${
                message.role === 'user' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ml-2' 
                  : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 mr-2'
              }`}
            >
              <div className="font-medium mb-1 text-[10px]">
                {message.role === 'user' ? 'You:' : 'Buddy:'}
              </div>
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI 设置弹框 */}
      <AISettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={aiSettings}
        onSave={onUpdateAiSettings}
      />
    </div>
  );
};

export default ChatHistory;
