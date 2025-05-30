/**
 * 平台检测工具函数
 */

/**
 * 检测是否为移动设备
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}; 