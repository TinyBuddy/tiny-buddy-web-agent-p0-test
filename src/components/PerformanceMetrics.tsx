'use client';

import React, { useState, useEffect } from 'react';
import { PerformanceMetrics as PerformanceMetricsType } from '@/types/performance';

interface PerformanceMetricsProps {
  metrics: PerformanceMetricsType;
  formatTime: (time: number) => string;
}

/**
 * 客户端时间组件
 */
const ClientTime: React.FC = () => {
  const [time, setTime] = useState<string>("");
  
  useEffect(() => {
    // 初始设置
    setTime(new Date().toLocaleTimeString());
    
    // 每秒更新一次
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return <>{time}</>;
};

/**
 * 性能指标显示组件
 * 显示ASR、AI请求和TTS的处理时间
 */
const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics, formatTime }) => {
  const totalTime = metrics.asrTime + metrics.aiRequestTime + metrics.ttsTime;
  
  const getPercentage = (value: number) => {
    return Math.round(value / totalTime * 100 || 0);
  };
  
  return (
    <div className="fixed top-2 right-2 md:top-auto md:bottom-4 md:right-4 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-2 md:p-3 text-xs font-mono z-50 max-w-[150px] md:max-w-xs opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex justify-between items-center mb-1 border-b pb-1">
        <h3 className="text-xs md:text-sm font-bold">Performance</h3>
        <div className="text-[10px] md:text-xs text-gray-500">
          <ClientTime />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-x-1 md:gap-x-2 gap-y-0.5 md:gap-y-1">
        <span className="text-gray-600 text-[10px] md:text-xs">ASR:</span>
        <span className="text-right text-[10px] md:text-xs">{formatTime(metrics.asrTime)}</span>
        
        <span className="text-gray-600 text-[10px] md:text-xs">AI:</span>
        <span className="text-right text-[10px] md:text-xs">{formatTime(metrics.aiRequestTime)}</span>
        
        <span className="text-gray-600 text-[10px] md:text-xs">TTS:</span>
        <span className="text-right text-[10px] md:text-xs">{formatTime(metrics.ttsTime)}</span>
        
        <span className="text-gray-600 text-[10px] md:text-xs">Total:</span>
        <span className="text-right font-bold text-[10px] md:text-xs">
          {formatTime(totalTime)}
        </span>
      </div>
      
      {/* 在桌面端显示详细百分比，移动端只显示进度条 */}
      <div className="mt-1 md:mt-2 pt-1 border-t text-[10px] md:text-xs text-gray-500">
        <div className="hidden md:flex justify-between">
          <span>ASR:</span>
          <span>{getPercentage(metrics.asrTime)}%</span>
        </div>
        <div className="hidden md:flex justify-between">
          <span title="从发送请求到收到第一个数据的时间">AI:</span>
          <span>{getPercentage(metrics.aiRequestTime)}%</span>
        </div>
        <div className="hidden md:flex justify-between">
          <span>TTS:</span>
          <span>{getPercentage(metrics.ttsTime)}%</span>
        </div>
        
        <div className="w-full h-1.5 md:h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
          <div className="flex h-full">
            <div 
              className="bg-blue-400" 
              style={{ width: `${getPercentage(metrics.asrTime)}%` }}
              title="ASR Time"
            />
            <div 
              className="bg-green-400" 
              style={{ width: `${getPercentage(metrics.aiRequestTime)}%` }}
              title="Time to First Chunk (从发送请求到收到第一个数据的时间)"
            />
            <div 
              className="bg-purple-400" 
              style={{ width: `${getPercentage(metrics.ttsTime)}%` }}
              title="TTS Time"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
