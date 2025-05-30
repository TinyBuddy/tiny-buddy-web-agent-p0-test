'use client';

import React from 'react';
import Image from 'next/image';

interface StatusDisplayProps {
  statusText: string;
  isRecording: boolean;
  isTranscribing: boolean;
  isProcessing: boolean;
}

/**
 * 状态显示组件
 * 展示当前应用状态和加载动画
 */
const StatusDisplay: React.FC<StatusDisplayProps> = ({
  statusText,
  isRecording,
  isTranscribing,
  isProcessing,
}) => {
  // 根据当前状态确定文本颜色
  const getTextColorClass = () => {
    if (isRecording) return 'text-red-500';
    if (isTranscribing) return 'text-yellow-500';
    if (isProcessing) return 'text-blue-500';
    return 'text-gray-600 dark:text-gray-400';
  };
  
  // 是否显示加载指示器
  const showLoadingIndicator = isTranscribing || isProcessing;
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-40 h-40 relative mb-8">
        <Image 
          src="/images/avatar.png" 
          alt="Assistant" 
          width={160} 
          height={160}
          className="object-contain transition-all duration-300"
          priority
        />
      </div>
      
      {/* 状态文本 */}
      <div className="mb-8 text-center">
        <p className={`text-sm font-medium transition-all duration-300 ${getTextColorClass()}`}>
          {/* 加载指示器 */}
          {showLoadingIndicator && (
            <span className="inline-flex items-center mr-2">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
          )}
          {statusText}
        </p>
      </div>
    </div>
  );
};

export default StatusDisplay;
