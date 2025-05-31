/**
 * API Key 管理工具
 * 负责管理 OpenAI API Key 的存储和获取
 */

'use client';

// localStorage key
const OPENAI_API_KEY = 'tiny_buddy_openai_api_key';

// 全局变量
let globalApiKey = process.env.OPENAI_KEY;

/**
 * 安全访问localStorage的工具函数
 */
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      console.error('[ApiKeyManager] 访问localStorage失败', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('[ApiKeyManager] 写入localStorage失败', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('[ApiKeyManager] 删除localStorage项失败', e);
    }
  }
};

/**
 * 获取 OpenAI API Key
 * @param forceRefresh 是否强制从localStorage刷新（默认为true）
 * @returns OpenAI API Key或空字符串
 */
export function getOpenAIApiKey(forceRefresh: boolean = true): string {
  // 在服务端返回空字符串
  if (typeof window === 'undefined') {
    return process.env.OPENAI_KEY!;
  }

  // 如果不强制刷新且已有全局API Key，直接返回
  if (!forceRefresh && globalApiKey) {
    return globalApiKey;
  }

  // 从localStorage获取API Key
  const apiKey = safeLocalStorage.getItem(OPENAI_API_KEY);
  if (apiKey) {
    globalApiKey = apiKey;
    return apiKey;
  }

  return '';
}

/**
 * 更新 OpenAI API Key
 * @param apiKey 新的API Key
 * @returns 是否更新成功
 */
export function updateOpenAIApiKey(apiKey: string): boolean {
  console.log('[ApiKeyManager] 更新OpenAI API Key');

  try {
    if (apiKey.trim()) {
      // 保存API Key
      safeLocalStorage.setItem(OPENAI_API_KEY, apiKey.trim());
      globalApiKey = apiKey.trim();
      console.log('[ApiKeyManager] API Key更新成功');
    } else {
      // 如果API Key为空，则删除
      safeLocalStorage.removeItem(OPENAI_API_KEY);
      console.log('[ApiKeyManager] API Key已清除');
    }

    // 触发API Key更新事件
    dispatchApiKeyUpdateEvent();
    
    return true;
  } catch (e) {
    console.error('[ApiKeyManager] 更新API Key失败', e);
    return false;
  }
}

/**
 * 清除 OpenAI API Key
 * @returns 是否清除成功
 */
export function clearOpenAIApiKey(): boolean {
  return updateOpenAIApiKey('');
}

/**
 * 检查 OpenAI API Key 是否已设置
 * @returns 是否已设置API Key
 */
export function isOpenAIApiKeySet(): boolean {
  const apiKey = getOpenAIApiKey();
  return apiKey.length > 0;
}

/**
 * 触发API Key更新事件
 */
function dispatchApiKeyUpdateEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('apiKeyUpdated'));
    console.log('[ApiKeyManager] 已触发apiKeyUpdated事件');
  }
}

/**
 * 简单的格式检查 - 只检查是否以sk-开头
 * @param apiKey 要验证的API Key
 * @returns 是否符合基本格式
 */
export function validateOpenAIApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // 基本格式检查：必须以sk-开头且长度合理
  return apiKey.trim().startsWith('sk-') && apiKey.trim().length > 20;
}

/**
 * 通过API请求验证API Key是否有效
 * @param apiKey 要验证的API Key
 * @returns Promise<boolean> 是否为有效的API Key
 */
export async function validateOpenAIApiKeyByRequest(apiKey: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  // 首先做基本格式检查
  if (!validateOpenAIApiKeyFormat(apiKey)) {
    return {
      isValid: false,
      error: 'API Key格式无效：必须以sk-开头'
    };
  }

  try {
    // 使用最简单的API调用来验证 - 获取模型列表
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { isValid: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        error: `API验证失败: ${response.status} - ${errorData.error?.message || '未知错误'}`
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: `网络请求失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 验证API Key格式（保持向后兼容，但现在只做基本检查）
 * @param apiKey 要验证的API Key
 * @returns 是否为有效的API Key格式
 */
export function validateOpenAIApiKey(apiKey: string): boolean {
  return validateOpenAIApiKeyFormat(apiKey);
}

/**
 * 调试函数：检查当前API Key状态
 */
export function debugCheckApiKey(): {
  globalApiKey: string | null;
  localStorageApiKey: string | null;
  isValidFormat: boolean;
} {
  console.log('[ApiKeyManager] 调试检查API Key状态');
  
  let localStorageApiKey = null;
  
  if (typeof window !== 'undefined') {
    try {
      localStorageApiKey = localStorage.getItem(OPENAI_API_KEY);
    } catch (e) {
      console.error('[ApiKeyManager] 调试检查时访问localStorage失败', e);
    }
  }
  
  const isValidFormat = localStorageApiKey ? validateOpenAIApiKeyFormat(localStorageApiKey) : false;
  
  return {
    globalApiKey,
    localStorageApiKey,
    isValidFormat
  };
} 
