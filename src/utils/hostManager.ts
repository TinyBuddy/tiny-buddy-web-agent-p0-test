/**
 * Host管理工具
 * 负责管理用户ID与API Host的对应关系
 */

'use client';

// 常量定义
export const HOSTS = {
  PRODUCTION: "agent.tinybuddy.fun",
  DEV: "web-dev-a4c3.up.railway.app",
  TEST_1: "web-test-1.up.railway.app",
  TEST_2: "web-test-2.up.railway.app",
} as const;

// 默认host
export const DEFAULT_HOST = HOSTS.PRODUCTION;

// localStorage key
const USER_HOST_MAP_KEY = 'tiny_buddy_user_host_map';

// 全局变量
let globalHostMap: Map<string, string> | null = null;

/**
 * 安全访问localStorage的工具函数
 */
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      console.error('[HostManager] 访问localStorage失败', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('[HostManager] 写入localStorage失败', e);
    }
  }
};

/**
 * 初始化host映射
 * @returns 初始化的host映射Map
 */
function initializeHostMap(): Map<string, string> {
  console.log('[HostManager] 初始化host映射');
  const hostMap = new Map<string, string>();
  
  // 保存空映射到localStorage
  safeLocalStorage.setItem(USER_HOST_MAP_KEY, JSON.stringify(Array.from(hostMap.entries())));
  
  globalHostMap = hostMap;
  return hostMap;
}

/**
 * 获取用户的API Host
 * @param userId 用户ID
 * @param forceRefresh 是否强制从localStorage刷新（默认为true）
 * @returns 用户对应的API Host
 */
export function getUserHost(userId: string, forceRefresh: boolean = true): string {
  // 在服务端返回默认host
  if (typeof window === 'undefined') {
    return DEFAULT_HOST;
  }

  // 如果不强制刷新且已有全局映射，直接从内存中获取
  if (!forceRefresh && globalHostMap) {
    return globalHostMap.get(userId) || DEFAULT_HOST;
  }

  // 从localStorage获取映射
  const mapStr = safeLocalStorage.getItem(USER_HOST_MAP_KEY);
  if (!mapStr) {
    return DEFAULT_HOST;
  }

  try {
    // 解析存储的映射
    const entries = JSON.parse(mapStr);
    const hostMap = new Map<string, string>(entries);
    globalHostMap = hostMap;

    // 返回用户对应的host或默认值
    return hostMap.get(userId) || DEFAULT_HOST;
  } catch (e) {
    console.error('[HostManager] 解析host映射失败', e);
    return DEFAULT_HOST;
  }
}

/**
 * 更新用户的API Host
 * @param userId 用户ID
 * @param host API Host
 * @returns 是否更新成功
 */
export function updateUserHost(userId: string, host: string): boolean {
  console.log(`[HostManager] 更新用户host: ${userId} -> ${host}`);

  try {
    // 获取当前映射
    let hostMap = globalHostMap;
    if (!hostMap) {
      const mapStr = safeLocalStorage.getItem(USER_HOST_MAP_KEY);
      hostMap = mapStr ? new Map<string, string>(JSON.parse(mapStr)) : new Map<string, string>();
    }

    // 更新映射
    hostMap.set(userId, host);
    globalHostMap = hostMap;

    // 保存到localStorage
    const mapStr = JSON.stringify(Array.from(hostMap.entries()));
    safeLocalStorage.setItem(USER_HOST_MAP_KEY, mapStr);

    console.log(`[HostManager] 更新host成功: ${userId} -> ${host}`);
    
    // 触发host更新事件
    dispatchHostUpdateEvent();
    
    return true;
  } catch (e) {
    console.error('[HostManager] 更新host失败', e);
    return false;
  }
}

/**
 * 触发host更新事件
 */
function dispatchHostUpdateEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hostUpdated'));
    console.log('[HostManager] 已触发hostUpdated事件');
  }
}

/**
 * 重置用户的API Host为默认值
 * @param userId 用户ID
 * @returns 是否重置成功
 */
export function resetUserHost(userId: string): boolean {
  return updateUserHost(userId, DEFAULT_HOST);
}

/**
 * 获取所有可用的API Host列表
 * @returns Host列表
 */
export function getAvailableHosts(): string[] {
  return Object.values(HOSTS);
}

/**
 * 调试函数：检查当前host映射状态
 */
export function debugCheckHostMap(): {
  globalMap: Map<string, string> | null;
  localStorageMap: Map<string, string> | null;
} {
  console.log('[HostManager] 调试检查host映射');
  
  let localStorageMap = null;
  
  if (typeof window !== 'undefined') {
    try {
      const mapStr = localStorage.getItem(USER_HOST_MAP_KEY);
      if (mapStr) {
        localStorageMap = new Map<string, string>(JSON.parse(mapStr));
      }
    } catch (e) {
      console.error('[HostManager] 调试检查时访问localStorage失败', e);
    }
  }
  
  return {
    globalMap: globalHostMap,
    localStorageMap
  };
} 