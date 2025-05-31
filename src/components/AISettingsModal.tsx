'use client';

import React, { useState, useEffect } from 'react';
import { DEFAULT_AI_MODEL, DEFAULT_TEMPERATURE, DEFAULT_TOP_P } from '@/constants/ai';
import { getUserId, updateUserId, resetUserId, debugCheckUserId, getUserIdList, updateUserIdList, getDefaultUserId } from '@/utils/userIdManager';
import { getAvailableHosts, getUserHost, updateUserHost, DEFAULT_HOST } from '@/utils/hostManager';
import { getOpenAIApiKey, updateOpenAIApiKey, clearOpenAIApiKey, validateOpenAIApiKey, validateOpenAIApiKeyByRequest, isOpenAIApiKeySet, debugCheckApiKey } from '@/utils/apiKeyManager';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    temperature: number;
    top_p: number;
    model: string;
    userBio?: string;
  };
  onSave: (settings: { temperature: number; top_p: number; model: string; userBio?: string }) => void;
}

/**
 * AI 设置弹框组件
 * 用于调整 AI 生成参数
 */
const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState({
    temperature: settings.temperature,
    top_p: settings.top_p,
    model: settings.model || DEFAULT_AI_MODEL,
    userBio: settings.userBio || `Jack is 3 years old boy. 
Hobby: He loves toy cars, building blocks, and singing songs. 
He likes Paw Patrol and anything with wheels.
He's friendly, a little shy at first, but warms up quickly and loves to laugh.`,
  });

  // 用户ID状态
  const [userId, setUserId] = useState<string>('');
  const [newUserId, setNewUserId] = useState<string>('');
  const [userIdList, setUserIdList] = useState<string[]>([]);
  const [userIdUpdateStatus, setUserIdUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Host状态
  const [availableHosts, setAvailableHosts] = useState<string[]>([]);
  const [currentHost, setCurrentHost] = useState<string>('');
  const [newHost, setNewHost] = useState<string>('');

  // API Key状态
  const [apiKey, setApiKey] = useState<string>('');
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [apiKeyUpdateStatus, setApiKeyUpdateStatus] = useState<'idle' | 'success' | 'error' | 'validating'>('idle');
  const [apiKeyValidationMessage, setApiKeyValidationMessage] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // 标签页状态
  const [activeTab, setActiveTab] = useState<'ai' | 'user' | 'host' | 'apikey'>('ai');

  // 同步设置
  useEffect(() => {
    if (isOpen) {
      setLocalSettings({
        temperature: settings.temperature,
        top_p: settings.top_p,
        model: settings.model || DEFAULT_AI_MODEL,
        userBio: settings.userBio || `Jack is 3 years old boy. 
Hobby: He loves toy cars, building blocks, and singing songs. 
He likes Paw Patrol and anything with wheels.
He's friendly, a little shy at first, but warms up quickly and loves to laugh.`,
      });
    }
  }, [isOpen, settings]);

  // 初始化用户ID
  useEffect(() => {
    if (isOpen) {
      const currentUserId = getUserId();
      setUserId(currentUserId);
      setNewUserId(currentUserId);
      const list = getUserIdList();
      setUserIdList(list);
      
      // 初始化Host信息
      const hosts = getAvailableHosts();
      setAvailableHosts(hosts);
      const userHost = getUserHost(currentUserId);
      setCurrentHost(userHost);
      setNewHost(userHost);

      // 初始化API Key信息
      const currentApiKey = getOpenAIApiKey();
      setApiKey(currentApiKey);
      setNewApiKey(currentApiKey);
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof typeof localSettings, value: number | string) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings({
      temperature: DEFAULT_TEMPERATURE,
      top_p: DEFAULT_TOP_P,
      model: DEFAULT_AI_MODEL,
      userBio: `Jack is 3 years old boy. 
Hobby: He loves toy cars, building blocks, and singing songs. 
He likes Paw Patrol and anything with wheels.
He's friendly, a little shy at first, but warms up quickly and loves to laugh.`,
    });
  };

  // 更新用户ID
  const handleUpdateUserId = () => {
    if (newUserId.trim() && newUserId !== userId) {
      try {
        updateUserId(newUserId.trim());
        setUserId(newUserId.trim());
        setUserIdUpdateStatus('success');
        
        // 更新用户列表
        const updatedList = getUserIdList();
        setUserIdList(updatedList);
        
        // 更新Host信息
        const userHost = getUserHost(newUserId.trim());
        setCurrentHost(userHost);
        setNewHost(userHost);
        
        setTimeout(() => setUserIdUpdateStatus('idle'), 3000);
      } catch (error) {
        console.error('更新用户ID失败:', error);
        setUserIdUpdateStatus('error');
        setTimeout(() => setUserIdUpdateStatus('idle'), 3000);
      }
    }
  };

  // 重置用户ID
  const handleResetUserId = () => {
    try {
      resetUserId();
      const defaultId = getDefaultUserId();
      setUserId(defaultId);
      setNewUserId(defaultId);
      setUserIdUpdateStatus('success');
      
      // 更新用户列表
      const updatedList = getUserIdList();
      setUserIdList(updatedList);
      
      // 重置Host
      setCurrentHost(DEFAULT_HOST);
      setNewHost(DEFAULT_HOST);
      
      setTimeout(() => setUserIdUpdateStatus('idle'), 3000);
    } catch (error) {
      console.error('重置用户ID失败:', error);
      setUserIdUpdateStatus('error');
      setTimeout(() => setUserIdUpdateStatus('idle'), 3000);
    }
  };

  // 从用户列表中选择用户ID
  const handleSelectUserId = (selectedUserId: string) => {
    setNewUserId(selectedUserId);
    
    // 自动更新Host信息
    const userHost = getUserHost(selectedUserId);
    setCurrentHost(userHost);
    setNewHost(userHost);
  };

  // 更新Host
  const handleUpdateHost = () => {
    if (newHost.trim() && newHost !== currentHost) {
      try {
        updateUserHost(userId, newHost.trim());
        setCurrentHost(newHost.trim());
        console.log(`Host已更新为: ${newHost.trim()}`);
      } catch (error) {
        console.error('更新Host失败:', error);
      }
    }
  };

  // 选择预设Host
  const handleSelectHost = (host: string) => {
    setNewHost(host);
  };

  // 更新API Key
  const handleUpdateApiKey = async () => {
    if (newApiKey.trim() !== apiKey) {
      try {
        // 基本格式验证
        if (newApiKey.trim() && !validateOpenAIApiKey(newApiKey.trim())) {
          setApiKeyUpdateStatus('error');
          setApiKeyValidationMessage('API Key格式无效：必须以sk-开头');
          setTimeout(() => {
            setApiKeyUpdateStatus('idle');
            setApiKeyValidationMessage('');
          }, 3000);
          return;
        }

        // 如果API Key不为空，进行API验证
        if (newApiKey.trim()) {
          setApiKeyUpdateStatus('validating');
          setApiKeyValidationMessage('正在验证API Key...');
          
          const validationResult = await validateOpenAIApiKeyByRequest(newApiKey.trim());
          
          if (!validationResult.isValid) {
            setApiKeyUpdateStatus('error');
            setApiKeyValidationMessage(validationResult.error || 'API Key验证失败');
            setTimeout(() => {
              setApiKeyUpdateStatus('idle');
              setApiKeyValidationMessage('');
            }, 5000);
            return;
          }
        }

        // 保存API Key
        updateOpenAIApiKey(newApiKey.trim());
        setApiKey(newApiKey.trim());
        setApiKeyUpdateStatus('success');
        setApiKeyValidationMessage(newApiKey.trim() ? 'API Key验证并保存成功' : 'API Key已清除');
        
        setTimeout(() => {
          setApiKeyUpdateStatus('idle');
          setApiKeyValidationMessage('');
        }, 3000);
      } catch (error) {
        console.error('更新API Key失败:', error);
        setApiKeyUpdateStatus('error');
        setApiKeyValidationMessage('更新失败，请检查网络连接');
        setTimeout(() => {
          setApiKeyUpdateStatus('idle');
          setApiKeyValidationMessage('');
        }, 3000);
      }
    }
  };

  // 验证当前API Key
  const handleValidateCurrentApiKey = async () => {
    if (!apiKey) {
      setApiKeyValidationMessage('没有API Key需要验证');
      return;
    }

    try {
      setApiKeyUpdateStatus('validating');
      setApiKeyValidationMessage('正在验证当前API Key...');
      
      const validationResult = await validateOpenAIApiKeyByRequest(apiKey);
      
      if (validationResult.isValid) {
        setApiKeyUpdateStatus('success');
        setApiKeyValidationMessage('当前API Key有效');
      } else {
        setApiKeyUpdateStatus('error');
        setApiKeyValidationMessage(validationResult.error || '当前API Key无效');
      }
      
      setTimeout(() => {
        setApiKeyUpdateStatus('idle');
        setApiKeyValidationMessage('');
      }, 5000);
    } catch (error) {
      console.error('验证API Key失败:', error);
      setApiKeyUpdateStatus('error');
      setApiKeyValidationMessage('验证失败，请检查网络连接');
      setTimeout(() => {
        setApiKeyUpdateStatus('idle');
        setApiKeyValidationMessage('');
      }, 3000);
    }
  };

  // 清除API Key
  const handleClearApiKey = () => {
    try {
      clearOpenAIApiKey();
      setApiKey('');
      setNewApiKey('');
      setApiKeyUpdateStatus('success');
      
      setTimeout(() => setApiKeyUpdateStatus('idle'), 3000);
    } catch (error) {
      console.error('清除API Key失败:', error);
      setApiKeyUpdateStatus('error');
      setTimeout(() => setApiKeyUpdateStatus('idle'), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'ai'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            AI Settings
          </button>
          <button
            onClick={() => setActiveTab('apikey')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'apikey'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            OpenAI API Key
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'user'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            User ID
          </button>
          <button
            onClick={() => setActiveTab('host')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'host'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            API Host
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* AI 设置标签页 */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* 模型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  模型 (Model)
                </label>
                <select
                  value={localSettings.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="anthropic/claude-3.5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="anthropic/claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="openai/gpt-4o">GPT-4O</option>
                  <option value="openai/gpt-4o-mini">GPT-4O Mini</option>
                  <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free)</option>
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature: {localSettings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={localSettings.temperature}
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Focused (0.0)</span>
                  <span>Balanced (1.0)</span>
                  <span>Creative (2.0)</span>
                </div>
              </div>

              {/* Top P */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top P: {localSettings.top_p}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localSettings.top_p}
                  onChange={(e) => handleInputChange('top_p', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Deterministic (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Diverse (1.0)</span>
                </div>
              </div>

              {/* User Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User Bio
                </label>
                <textarea
                  value={localSettings.userBio}
                  onChange={(e) => handleInputChange('userBio', e.target.value)}
                  rows={6}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Describe the user's personality, preferences, etc."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This helps the AI understand the user better and provide more personalized responses.
                </p>
              </div>
            </div>
          )}

          {/* OpenAI API Key标签页 */}
          {activeTab === 'apikey' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  当前API Key状态
                </label>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isOpenAIApiKeySet() ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    {isOpenAIApiKeySet() ? '已设置' : '未设置'}
                  </span>
                </div>
                {apiKey && (
                  <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2">
                    {showApiKey ? apiKey : `${apiKey.substring(0, 10)}${'*'.repeat(Math.max(0, apiKey.length - 10))}`}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  新API Key
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      className="w-full p-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="输入您的OpenAI API Key (sk-...)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleUpdateApiKey}
                      disabled={apiKeyUpdateStatus === 'validating'}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {apiKeyUpdateStatus === 'validating' ? '验证中...' : '更新'}
                    </button>
                    <button
                      onClick={handleValidateCurrentApiKey}
                      disabled={!apiKey || apiKeyUpdateStatus === 'validating'}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      验证
                    </button>
                    <button
                      onClick={handleClearApiKey}
                      disabled={apiKeyUpdateStatus === 'validating'}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      清除
                    </button>
                  </div>
                </div>
                
                {apiKeyUpdateStatus === 'success' && (
                  <p className="text-green-600 dark:text-green-400 text-sm mt-2">
                    ✅ {apiKeyValidationMessage || 'API Key更新成功'}
                  </p>
                )}
                {apiKeyUpdateStatus === 'error' && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                    ❌ {apiKeyValidationMessage || 'API Key格式无效或更新失败'}
                  </p>
                )}
                {apiKeyUpdateStatus === 'validating' && (
                  <p className="text-blue-600 dark:text-blue-400 text-sm mt-2">
                    🔄 {apiKeyValidationMessage || '正在验证...'}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  ⚠️ 安全提示
                </h4>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• API Key将保存在浏览器本地存储中</li>
                  <li>• 系统会通过OpenAI API验证密钥的真实有效性</li>
                  <li>• 请勿在公共设备上输入您的API Key</li>
                  <li>• 定期检查您的OpenAI使用情况和账单</li>
                  <li>• 如果怀疑泄露，请立即在OpenAI控制台重新生成</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  ℹ️ 如何获取API Key
                </h4>
                <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. 访问 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI API Keys 页面</a></li>
                  <li>2. 登录您的OpenAI账户</li>
                  <li>3. 点击"Create new secret key"按钮</li>
                  <li>4. 复制生成的API Key（以sk-开头）</li>
                  <li>5. 将API Key粘贴到上方输入框中</li>
                </ol>
              </div>

              <div>
                <button
                  onClick={() => debugCheckApiKey()}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  调试：检查API Key状态
                </button>
              </div>
            </div>
          )}

          {/* 用户ID标签页 */}
          {activeTab === 'user' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  当前用户ID
                </label>
                <p className="text-lg font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-center">
                  {userId}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  新用户ID
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="输入新的用户ID"
                  />
                  <button
                    onClick={handleUpdateUserId}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    更新
                  </button>
                </div>
                
                {userIdUpdateStatus === 'success' && (
                  <p className="text-green-600 dark:text-green-400 text-sm mt-2">
                    ✅ 用户ID更新成功
                  </p>
                )}
                {userIdUpdateStatus === 'error' && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                    ❌ 用户ID更新失败
                  </p>
                )}
              </div>

              <div>
                <button
                  onClick={handleResetUserId}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  重置用户ID为默认值
                </button>
              </div>

              {userIdList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    历史用户ID列表
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {userIdList.map((id) => (
                      <button
                        key={id}
                        onClick={() => handleSelectUserId(id)}
                        className={`w-full text-left p-2 rounded border ${
                          id === userId
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } transition-colors`}
                      >
                        <span className="font-mono text-sm">{id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <button
                  onClick={() => debugCheckUserId()}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  调试：检查用户ID状态
                </button>
              </div>
            </div>
          )}

          {/* API Host标签页 */}
          {activeTab === 'host' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  当前API Host
                </label>
                <p className="text-lg font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-center">
                  {currentHost}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  预设Host列表
                </label>
                <div className="space-y-2">
                  {availableHosts.map((host) => (
                    <button
                      key={host}
                      onClick={() => handleSelectHost(host)}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        host === currentHost
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="font-mono text-sm">{host}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  自定义Host
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newHost}
                    onChange={(e) => setNewHost(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="输入自定义Host"
                  />
                  <button
                    onClick={handleUpdateHost}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    更新
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;
