'use client';

import React, { useState, useEffect } from 'react';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  ttsStatus: string;
  onClick: () => void;
}

/**
 * 录音按钮组件
 * 提供用户录音交互界面，带有现代化动效
 */
const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  isProcessing,
  ttsStatus,
  onClick
}) => {
  const isDisabled = isProcessing || ttsStatus === 'playing';
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
  }, [onClick]);

  return (
    <div className="mb-8 flex flex-col items-center relative">
      {/* 录音状态下的波纹动画 */}
      {isRecording && (
        <>
          <div className={`absolute w-16 h-16 rounded-full bg-red-500 opacity-0 ${showRipple ? 'animate-ripple' : ''}`}></div>
          <div className="absolute w-16 h-16 rounded-full bg-red-500 opacity-0 animate-ripple-delay"></div>
          <div className="absolute w-16 h-16 rounded-full bg-red-500 opacity-0 animate-ripple-delay-long"></div>
        </>
      )}
      
      <button
        onClick={onClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => isPressed && setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        disabled={isDisabled}
        className={`
          w-16 h-16 rounded-full 
          flex items-center justify-center 
          shadow-lg 
          transition-all duration-300 ease-in-out
          ${isPressed ? 'scale-90' : 'scale-100'}
          ${isRecording 
            ? 'bg-gradient-to-br from-red-400 to-red-600 border-2 border-red-300' 
            : 'bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-blue-300 hover:from-blue-300 hover:to-blue-500'
          } 
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
        `}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className={`w-8 h-8 text-white transition-transform duration-300 ${isRecording ? 'scale-110' : ''}`}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d={isRecording 
              ? "M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" 
              : "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"}
          />
        </svg>
      </button>
    </div>
  );
};

export default RecordButton;
