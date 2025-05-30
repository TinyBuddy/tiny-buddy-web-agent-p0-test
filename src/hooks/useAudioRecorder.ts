'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioRecorderOptions {
  onRecordingComplete?: (blob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingError?: (error: Error) => void;
}

/**
 * 获取MediaRecorder支持的音频格式选项
 * 直接使用 WebM 格式，确保与 OpenAI API 兼容
 */
function getMediaRecorderOptions() {
  // 检查MediaRecorder是否可用
  if (typeof MediaRecorder === 'undefined') {
    console.warn('浏览器不支持MediaRecorder API');
    return {};
  }

  const options = { mimeType: '' };
  
  try {
    // 直接尝试使用 WebM 格式
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      console.log('浏览器支持 WebM 格式录音（带 opus 编码）');
      options.mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      console.log('浏览器支持 WebM 格式录音');
      options.mimeType = 'audio/webm';
    } else {
      console.log('浏览器不支持 WebM 格式，将使用浏览器默认格式');
      // 不指定 mimeType，让浏览器使用默认格式
    }
  } catch (e) {
    console.error('获取MediaRecorder选项时出错:', e);
  }
  
  console.log('最终选择的录音选项:', options);
  return options;
}

/**
 * 录音钩子函数
 * 提供录音相关功能，包括开始/停止录音、错误处理及浏览器兼容性
 */
export function useAudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingError
}: AudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const isRecordingRef = useRef<boolean>(false); // 使用ref跟踪真实录音状态
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  /**
   * 检查浏览器是否支持录音功能
   */
  const checkSupport = useCallback((): boolean => {
    // 检查navigator.mediaDevices是否存在
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('navigator.mediaDevices.getUserMedia 不支持');
      
      // 尝试添加mediaDevices polyfill
      if (!navigator.mediaDevices) {
        console.log('尝试添加mediaDevices polyfill');
        // @ts-ignore
        navigator.mediaDevices = {};
      }
      
      // 添加getUserMedia polyfill
      if (!navigator.mediaDevices.getUserMedia) {
        console.log('添加getUserMedia polyfill');
        
        navigator.mediaDevices.getUserMedia = function(constraints) {
          console.log('使用polyfill getUserMedia，约束:', constraints);
          
          // 获取老版本的getUserMedia
          const getUserMedia = 
            (navigator as any).getUserMedia ||
            (navigator as any).webkitGetUserMedia ||
            (navigator as any).mozGetUserMedia;
          
          if (!getUserMedia) {
            console.error('浏览器不支持任何版本的getUserMedia');
            return Promise.reject(new Error('getUserMedia在此浏览器中未实现'));
          }
          
          // 将旧的回调API包装为Promise
          return new Promise(function(resolve, reject) {
            getUserMedia.call(
              navigator,
              constraints,
              (stream: MediaStream) => resolve(stream),
              (error: Error) => reject(error)
            );
          });
        };
      }
      
      // 再次检查是否添加了polyfill
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('添加polyfill后仍不支持getUserMedia API');
        return false;
      }
    }
    
    return true;
  }, []);
  
  /**
   * 启动录音
   */
  const startRecording = useCallback(async () => {
    if (!checkSupport()) {
      const error = new Error('浏览器不支持录音功能');
      if (onRecordingError) onRecordingError(error);
      return;
    }
    
    // 重置录音块
    chunksRef.current = [];
    
    try {
      console.log('尝试获取音频权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      console.log('音频流已获取，正在配置MediaRecorder...');
      const options = getMediaRecorderOptions();
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // 提取处理录音完成的逻辑到单独函数，放在外部以避免闭包问题
      const finishRecording = (recorder: MediaRecorder) => {
        console.log('处理录音完成，数据块数量:', chunksRef.current.length);
        if (chunksRef.current.length === 0) {
          console.warn('没有录制到数据');
          if (onRecordingError) onRecordingError(new Error('没有录制到音频数据'));
          return;
        }
        
        // 获取实际使用的mimeType
        const mimeType = recorder.mimeType || 'audio/webm';
        console.log(`使用MIME类型: ${mimeType}`);
        
        const blob = new Blob(chunksRef.current, { type: mimeType });
        console.log('创建的Blob大小:', blob.size);
        if (onRecordingComplete) onRecordingComplete(blob);
        
        // 停止所有轨道
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        console.log('录音数据可用，大小:', event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      
      mediaRecorder.addEventListener('error', (event) => {
        console.error('录音错误:', event);
        if (onRecordingError) onRecordingError(new Error('录音过程中发生错误'));
      });
      
      mediaRecorder.addEventListener('stop', () => {
        console.log('录音停止事件触发，数据块数量:', chunksRef.current.length);
        
        // 延迟处理，确保所有dataavailable事件都已触发
        setTimeout(() => {
          console.log('开始处理录音数据，延迟后的数据块数量:', chunksRef.current.length);
          finishRecording(mediaRecorder);
        }, 300);
      });
      
      // 开始录音 - 对于iOS，使用timeslice参数
      try {
        // 在Safari上设置较大的时间片，解决一些兼容性问题
        const timeslice = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) ? 1000 : 100;
        // 标记录音已经开始
        isRecordingRef.current = true;
        setIsRecording(true);
        
        mediaRecorder.start(timeslice);
        console.log(`录音已开始，时间片大小: ${timeslice}ms，用户代理: ${navigator.userAgent}`);
      } catch (e) {
        console.error('启动录音时出错:', e);
        isRecordingRef.current = false;
        setIsRecording(false);
        if (onRecordingError) onRecordingError(new Error('启动录音失败'));
        return;
      }
      console.log('录音已开始');
      
      if (onRecordingStart) onRecordingStart();
    } catch (error) {
      console.error('启动录音失败:', error);
      if (onRecordingError) onRecordingError(error instanceof Error ? error : new Error('未知错误'));
    }
  }, [checkSupport, onRecordingComplete, onRecordingStart, onRecordingError]);
  
  /**
   * 停止录音
   */
  const stopRecording = useCallback(() => {
    console.log('停止录音调用，当前状态:', isRecording, isRecordingRef.current);
    // 使用ref来检查录音状态，避免状态延迟问题
    if (mediaRecorderRef.current && isRecordingRef.current) {
      console.log('正在停止录音...');
      console.log('当前录音状态:', mediaRecorderRef.current.state);
      try {
        // 立即请求数据
        if (mediaRecorderRef.current.state === 'recording') {
          try {
            console.log('停止前手动请求一次数据');
            mediaRecorderRef.current.requestData();
          } catch (e) {
            console.warn('手动请求最后数据失败:', e);
          }
          
          // 短暂延迟确保数据被收集
          setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              console.log('延迟后停止录音');
              mediaRecorderRef.current.stop();
              isRecordingRef.current = false;
              setIsRecording(false);
            } else {
              console.warn('录音可能已经停止或状态异常，当前状态:', 
                           mediaRecorderRef.current ? mediaRecorderRef.current.state : 'recorder不存在');
              // 确保状态一致
              isRecordingRef.current = false;
              setIsRecording(false);
            }
          }, 300);
        }
      } catch (error) {
        console.error('停止录音时出错:', error);
        isRecordingRef.current = false;
        setIsRecording(false);
        if (onRecordingError) onRecordingError(error instanceof Error ? error : new Error('停止录音时出错'));
      }
    }
  }, [onRecordingError]);
  
  // 清理函数
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecordingRef.current) {
        mediaRecorderRef.current.stop();
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  return {
    isRecording,
    startRecording,
    stopRecording
  };
}

export default useAudioRecorder;
