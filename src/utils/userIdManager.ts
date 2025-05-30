/**
 * 用户ID管理工具
 * 负责生成、获取和存储用户唯一标识符
 */

'use client';

// 全局变量
let globalUserId: string | null = null;
let globalUserIdList: string[] = [];
let globalDefaultId: string | null = null;

// 常量
const USER_ID_KEY = 'tiny_buddy_user_id';
const USER_ID_LIST_KEY = 'tiny_buddy_user_id_list';
const DEFAULT_ID_PREFIX = 'tb_default_';

/**
 * 安全访问localStorage，避免服务器端渲染错误
 */
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      console.error('[UserIdManager] 访问localStorage失败', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('[UserIdManager] 写入localStorage失败', e);
    }
  }
};

/**
 * 生成默认用户ID
 * @returns 新生成的默认用户ID
 */
function generateDefaultUserId(): string {
  // 在服务端返回空字符串，避免生成随机ID
  if (typeof window === 'undefined') {
    return '';
  }

  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${DEFAULT_ID_PREFIX}${timestamp}_${randomPart}`;
}

/**
 * 获取默认用户ID
 * 如果已存在默认ID则使用已有的，否则生成新的
 * @returns 默认用户ID
 */
export function getDefaultUserId(): string {
  // 如果已有缓存的默认ID，直接返回
  if (globalDefaultId) {
    return globalDefaultId;
  }

  // 在服务端返回空字符串
  if (typeof window === 'undefined') {
    return '';
  }

  // 从localStorage获取ID列表
  const userIdListStr = safeLocalStorage.getItem(USER_ID_LIST_KEY);
  if (userIdListStr) {
    const idList = userIdListStr.split('|');
    const existingDefaultId = idList.find(id => id.startsWith(DEFAULT_ID_PREFIX));
    if (existingDefaultId) {
      globalDefaultId = existingDefaultId;
      return existingDefaultId;
    }
  }

  // 生成新的默认ID
  const defaultId = generateDefaultUserId();
  if (defaultId) {
    globalDefaultId = defaultId;
  }
  return defaultId;
}

/**
 * 初始化用户ID列表
 * 创建只包含默认ID的列表
 * @returns 用户ID列表
 */
function initializeUserIdList(): string[] {
  console.log('[UserIdManager] 初始化用户ID列表');
  
  // 创建只包含默认ID的列表
  const defaultId = generateDefaultUserId();
  globalDefaultId = defaultId; // 设置全局默认ID
  const idList = [defaultId];
  
  // 存储ID列表
  const idListStr = idList.join('|');
  safeLocalStorage.setItem(USER_ID_LIST_KEY, idListStr);
  
  // 如果在客户端环境，直接保存到原生localStorage作为备份
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(USER_ID_LIST_KEY, idListStr);
    } catch (e) {
      console.error('[UserIdManager] 直接保存ID列表到localStorage失败', e);
    }
  }
  
  globalUserIdList = idList;
  return idList;
}

/**
 * 获取用户ID列表
 * 如果不存在则创建新的列表
 * @param forceRefresh 是否强制从localStorage刷新列表（默认为true）
 * @returns 用户ID列表
 */
export function getUserIdList(forceRefresh: boolean = true): string[] {
  console.log(`[UserIdManager] getUserIdList 被调用，forceRefresh=${forceRefresh}`);
  
  // 如果不强制刷新且已有全局列表，直接返回
  if (!forceRefresh && globalUserIdList.length > 0) {
    console.log(`[UserIdManager] 使用缓存的ID列表`);
    return globalUserIdList;
  }
  
  // 从localStorage获取最新ID列表
  let userIdListStr = safeLocalStorage.getItem(USER_ID_LIST_KEY);
  
  // 如果不存在，初始化新列表并保存
  if (!userIdListStr) {
    return initializeUserIdList();
  }
  
  // 解析ID列表
  const idList = userIdListStr.split('|');
  
  // 确保列表中至少包含默认ID
  const defaultId = getDefaultUserId();
  if (!idList.includes(defaultId)) {
    idList.unshift(defaultId);
    // 更新存储
    const updatedListStr = idList.join('|');
    safeLocalStorage.setItem(USER_ID_LIST_KEY, updatedListStr);
  }
  
  // 更新全局变量
  globalUserIdList = idList;
  return idList;
}

/**
 * 获取用户ID，如果不存在则创建新的
 * 每次调用都会检查localStorage确保获取最新的ID
 * @param forceRefresh 是否强制从localStorage刷新ID（默认为true）
 * @returns 用户ID
 */
export function getUserId(forceRefresh: boolean = true): string {
  // 在服务端返回空字符串
  if (typeof window === 'undefined') {
    return '';
  }

  // 如果不强制刷新且已有全局ID，直接返回
  if (!forceRefresh && globalUserId) {
    return globalUserId;
  }

  // 从localStorage获取ID
  let userId = safeLocalStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // 如果没有用户ID，从ID列表中获取第一个ID或生成默认ID
    const idList = getUserIdList();
    if (idList.length > 0) {
      userId = idList[0];
    } else {
      userId = getDefaultUserId();
    }

    // 保存新的用户ID
    if (userId) {
      safeLocalStorage.setItem(USER_ID_KEY, userId);
      globalUserId = userId;
    }
  } else {
    globalUserId = userId;
  }

  return userId || '';
}

/**
 * 触发用户ID更新事件
 */
function dispatchUserIdUpdateEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('userIdUpdated'));
  }
}

/**
 * 检查列表中是否已存在默认用户ID
 * @param idList 用户ID列表
 * @returns 存在的默认用户ID，如果不存在则返回null
 */
function findExistingDefaultId(idList: string[]): string | null {
  return idList.find(id => id.startsWith(DEFAULT_ID_PREFIX)) || null;
}

/**
 * 更新用户ID
 * @param newUserId 新的用户ID
 * @returns 是否更新成功
 */
export function updateUserId(newUserId: string): boolean {
  console.log(`[UserIdManager] 尝试更新用户ID: ${globalUserId} -> ${newUserId}`);
  
  try {
    safeLocalStorage.setItem(USER_ID_KEY, newUserId);
    globalUserId = newUserId;
    console.log(`[UserIdManager] 更新用户ID成功: ${newUserId}`);
    dispatchUserIdUpdateEvent();
    return true;
  } catch (e) {
    console.error('[UserIdManager] 更新用户ID失败', e);
    return false;
  }
}

/**
 * 重置用户ID为默认ID
 * @returns 默认用户ID
 */
export function resetUserId(): string {
  const defaultId = getDefaultUserId();
  console.log(`[UserIdManager] 重置用户ID: ${globalUserId} -> ${defaultId}`);
  safeLocalStorage.setItem(USER_ID_KEY, defaultId);
  globalUserId = defaultId;
  dispatchUserIdUpdateEvent();
  return defaultId;
}

/**
 * 调试函数：检查当前用户ID的状态
 * 返回全局变量和localStorage中的值
 */
export function debugCheckUserId(): { 
  globalId: string | null; 
  localStorageId: string | null; 
  directLocalStorageId: string | null;
  userIdList: string[];
} {
  console.log('[UserIdManager] 调试检查用户ID');
  
  let localStorageId = null;
  let directLocalStorageId = null;
  let userIdList: string[] = [];
  
  if (typeof window !== 'undefined') {
    try {
      localStorageId = safeLocalStorage.getItem(USER_ID_KEY);
      directLocalStorageId = localStorage.getItem(USER_ID_KEY);
      
      const listStr = localStorage.getItem(USER_ID_LIST_KEY);
      if (listStr) {
        userIdList = listStr.split('|');
      }
    } catch (e) {
      console.error('[UserIdManager] 调试检查时访问localStorage失败', e);
    }
  }
  
  return {
    globalId: globalUserId,
    localStorageId,
    directLocalStorageId,
    userIdList
  };
}

/**
 * 更新用户ID列表
 * @param newList 新的用户ID列表
 * @returns 是否更新成功
 */
export function updateUserIdList(newList: string[]): boolean {
  console.log(`[UserIdManager] 尝试更新用户ID列表: ${newList.join(', ')}`);
  
  if (!Array.isArray(newList)) {
    console.error('[UserIdManager] 更新失败: 无效的列表格式');
    return false;
  }
  
  try {
    // 将列表转换为字符串
    const listStr = newList.join('|');
    
    // 更新localStorage
    safeLocalStorage.setItem(USER_ID_LIST_KEY, listStr);
    
    // 直接尝试使用原生localStorage作为备份方案
    if (typeof window !== 'undefined') {
      try {
        console.log(`[UserIdManager] 直接使用原生localStorage更新列表: ${USER_ID_LIST_KEY} = ${listStr}`);
        localStorage.setItem(USER_ID_LIST_KEY, listStr);
        
        // 验证更新
        const storedValue = localStorage.getItem(USER_ID_LIST_KEY);
        console.log(`[UserIdManager] 验证localStorage更新: ${storedValue}`);
        
        if (storedValue !== listStr) {
          console.error(`[UserIdManager] localStorage更新验证失败: ${storedValue} !== ${listStr}`);
        }
      } catch (e) {
        console.error('[UserIdManager] 直接使用localStorage更新列表失败', e);
      }
    }
    
    // 更新全局变量
    globalUserIdList = newList;
    console.log(`[UserIdManager] 用户ID列表更新成功: ${newList.join(', ')}`);
    return true;
  } catch (e) {
    console.error('[UserIdManager] 更新用户ID列表失败', e);
    return false;
  }
}
