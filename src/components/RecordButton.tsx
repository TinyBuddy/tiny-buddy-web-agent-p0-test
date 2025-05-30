'use client';

import React, { useState, useEffect } from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

/**
 * 录音按钮组件
 * 提供用户录音交互界面，带有现代化动效
 */
const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  isProcessing,
  onClick
}) => {
  const isDisabled = isProcessing;
  const [isPressed, setIsPressed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  // 用于录音时的动态波纹效果
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 1500);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // 添加键盘事件监听，支持空格键控制录音
  useEffect(() => {
    // 键盘事件处理函数
    const handleKeyDown = (event: KeyboardEvent) => {
      if(isDisabled) return;

      // 只有在空格键被按下且不在输入框中时触发录音控制
      if (event.code === 'Space' &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)) {

        console.log("空格键被按下");
        // 防止页面滚动
        event.preventDefault();
        // 触发录音按钮点击事件
        onClick();
      }
    };

    // 添加事件监听
    window.addEventListener('keydown', handleKeyDown);

    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClick, isDisabled]);

  return (
    <div className="relative flex flex-col items-center space-y-4">
      {/* 录音按钮 */}
      <button
        onClick={onClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        disabled={isDisabled}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-300 transform
          ${isRecording
            ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
            : isDisabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95'
          }
          ${isPressed && !isDisabled ? 'scale-95' : ''}
          shadow-lg
        `}
      >
        {/* 波纹效果 */}
        {(isRecording && showRipple) && (
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
        )}
        
        {/* 麦克风图标 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-8 h-8 text-white transition-transform duration-300 ${
            isRecording ? 'scale-110' : ''
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"
          />
        </svg>
        
        {/* 处理中的旋转指示器 */}
        {isProcessing && (
          <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
        )}
      </button>

      {/* 按钮说明文字 */}
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isRecording
            ? 'Recording... Click to stop'
            : isProcessing
            ? 'Processing...'
            : 'Click or press Space to record'
          }
        </p>
        {!isRecording && !isProcessing && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hold and speak, then release
          </p>
        )}
      </div>
    </div>
  );
};

export default RecordButton;
