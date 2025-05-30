'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_TTS_VOICE_ID, DEFAULT_AI_MODEL, DEFAULT_TEMPERATURE, DEFAULT_TOP_P } from '@/constants/ai';
import { getUserId, updateUserId, resetUserId, debugCheckUserId, getUserIdList, updateUserIdList, getDefaultUserId } from '@/utils/userIdManager';
import { getAvailableHosts, getUserHost, updateUserHost, DEFAULT_HOST } from '@/utils/hostManager';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    temperature: number;
    top_p: number;
    model: string;
    voiceId: string;
    userBio?: string;
  };
  onSave: (settings: { temperature: number; top_p: number; model: string; voiceId: string; userBio?: string }) => void;
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
    voiceId: settings.voiceId || DEFAULT_TTS_VOICE_ID,
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

  // 测试音频状态
  const [testAudioStatus, setTestAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 用户Bio状态
  const [bioInitStatus, setBioInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Host状态
  const [selectedHost, setSelectedHost] = useState<string>(DEFAULT_HOST);

  // 当外部设置变化时更新本地状态
  useEffect(() => {
    if (isOpen) {
      setLocalSettings({
        temperature: settings.temperature,
        top_p: settings.top_p,
        model: settings.model || DEFAULT_AI_MODEL,
        voiceId: settings.voiceId || DEFAULT_TTS_VOICE_ID,
        userBio: settings.userBio || `Jack is 3 years old boy. 
Hobby: He loves toy cars, building blocks, and singing songs. 
He likes Paw Patrol and anything with wheels.
He's friendly, a little shy at first, but warms up quickly and loves to laugh.`,
      });
      
      // 获取用户ID和用户ID列表
      const currentUserId = getUserId(true);
      const idList = getUserIdList(true);
      const defaultId = getDefaultUserId(); // 这里会优先使用已存在的默认ID

      // 确保列表中包含默认ID
      if (!idList.includes(defaultId)) {
        idList.unshift(defaultId);
        updateUserIdList(idList);
      }

      setUserId(currentUserId || defaultId);
      setUserIdList(idList);
      
      // 重置测试音频状态
      setTestAudioStatus('idle');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // 获取当前用户的host配置
      const currentHost = getUserHost(currentUserId);
      setSelectedHost(currentHost);
    }
  }, [isOpen, settings]);

  // 处理温度滑块变化
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalSettings((prev) => ({
      ...prev,
      temperature: value,
    }));
  };

  // 处理 top_p 滑块变化
  const handleTopPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalSettings((prev) => ({
      ...prev,
      top_p: value,
    }));
  };

  // 处理模型名称变化
  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSettings((prev) => ({
      ...prev,
      model: value,
    }));
  };

  // 处理 voiceId 变化
  const handleVoiceIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSettings((prev) => ({
      ...prev,
      voiceId: value,
    }));
    // 重置测试音频状态
    setTestAudioStatus('idle');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  // 处理用户Bio变化
  const handleUserBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalSettings((prev) => ({
      ...prev,
      userBio: value,
    }));
  };

  // 处理用户ID变更
  const handleUserIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log(`[AISettingsModal] 选择用户ID: ${selectedId}`);
    
    if (selectedId && selectedId !== userId) {
      console.log(`[AISettingsModal] 调用 updateUserId("${selectedId}")`);
      const success = updateUserId(selectedId);
      console.log(`[AISettingsModal] updateUserId 返回结果: ${success}`);
      
      if (success) {
        setUserId(selectedId);
        setUserIdUpdateStatus('success');
        
        // 直接检查localStorage是否已更新
        if (typeof window !== 'undefined') {
          const storedId = localStorage.getItem('tiny_buddy_user_id');
          console.log(`[AISettingsModal] 保存后检查localStorage: ${storedId}`);
          
          // 如果localStorage中的值与期望的不一致，尝试再次写入
          if (storedId !== selectedId) {
            console.warn(`[AISettingsModal] localStorage中的ID (${storedId}) 与期望值 (${selectedId}) 不一致，尝试再次写入`);
            localStorage.setItem('tiny_buddy_user_id', selectedId);
            
            // 再次检查
            setTimeout(() => {
              const recheckId = localStorage.getItem('tiny_buddy_user_id');
              console.log(`[AISettingsModal] 再次检查localStorage: ${recheckId}`);
            }, 100);
          }
        }
        
        // 确保所有API请求都使用新的用户ID
        updateClientApiRequests(selectedId);
        
        // 3秒后重置状态
        setTimeout(() => {
          setUserIdUpdateStatus('idle');
        }, 3000);
      } else {
        console.error('[AISettingsModal] 更新用户ID失败');
        setUserIdUpdateStatus('error');
      }
    }
  };

  // 处理添加新用户ID
  const handleAddUserId = () => {
    if (newUserId && !userIdList.includes(newUserId)) {
      const updatedList = [...userIdList, newUserId];
      const success = updateUserIdList(updatedList);
      
      if (success) {
        setUserIdList(updatedList);
        setNewUserId('');
        
        // 自动激活新添加的ID
        const updateSuccess = updateUserId(newUserId);
        if (updateSuccess) {
          setUserId(newUserId);
          setUserIdUpdateStatus('success');
          console.log(`[AISettingsModal] 添加并激活新用户ID成功: ${newUserId}`);
        } else {
          console.error(`[AISettingsModal] 激活新用户ID失败: ${newUserId}`);
          setUserIdUpdateStatus('error');
        }
      } else {
        console.error(`[AISettingsModal] 添加新用户ID失败: ${newUserId}`);
        setUserIdUpdateStatus('error');
      }
    }
  };

  // 处理删除用户ID
  const handleDeleteUserId = (idToDelete: string) => {
    const defaultId = getDefaultUserId();
    if (idToDelete === defaultId) {
      console.log('[AISettingsModal] 默认用户ID不能删除');
      return;
    }

    const updatedList = userIdList.filter(id => id !== idToDelete);
    const success = updateUserIdList(updatedList);
    
    if (success) {
      setUserIdList(updatedList);
      // 如果删除的是当前选中的ID，切换到默认用户
      if (idToDelete === userId) {
        updateUserId(defaultId);
        setUserId(defaultId);
      }
      console.log(`[AISettingsModal] 删除用户ID成功: ${idToDelete}`);
    }
  };

  // 确保所有客户端API请求都使用新的用户ID
  const updateClientApiRequests = (newUserId: string) => {
    console.log(`[AISettingsModal] 更新客户端API请求，使用新的用户ID: ${newUserId}`);
    
    // 在这里可以更新任何需要使用用户ID的客户端状态或缓存
    // 例如，可以在localStorage中存储一个标志，表示用户ID已更新
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tiny_buddy_user_id_updated', Date.now().toString());
        console.log('[AISettingsModal] 已设置用户ID更新标志');
      } catch (e) {
        console.error('[AISettingsModal] 设置用户ID更新标志失败', e);
      }
    }
  };

  // 重置用户ID
  const handleUserIdReset = () => {
    if (confirm('确定要重置用户ID吗？这将生成一个全新的ID。')) {
      const newId = resetUserId();
      setUserId(newId);
      
      // 刷新ID列表
      const idList = getUserIdList(true);
      setUserIdList(idList);
      
      setUserIdUpdateStatus('success');
      
      // 3秒后重置状态
      setTimeout(() => {
        setUserIdUpdateStatus('idle');
      }, 3000);
    }
  };

  // 调试检查用户ID
  const handleDebugCheckUserId = () => {
    const result = debugCheckUserId();
    console.log('[AISettingsModal] 调试检查用户ID结果:', result);
    
    // 显示结果
    alert(`用户ID状态:\n全局变量: ${result.globalId || '无'}\nLocalStorage(安全): ${result.localStorageId || '无'}\nLocalStorage(直接): ${result.directLocalStorageId || '无'}`);
  };

  // 测试 voiceId
  const testVoiceId = async () => {
    if (!localSettings.voiceId) {
      alert('请输入 Voice ID');
      return;
    }

    try {
      setTestAudioStatus('loading');

      // 创建测试文本（中英文混合）
      const testText = '你好 Hello，这是一段测试语音 This is a test audio，用于验证 Voice ID 的发音效果 to verify the pronunciation effect.';

      // 调用 TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          voiceId: localSettings.voiceId,
          format: 'mp3',
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS 请求失败: ${response.status} ${response.statusText}`);
      }

      // 获取音频数据
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 播放音频
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      } else {
        audioRef.current.src = audioUrl;
      }

      audioRef.current.onended = () => {
        setTestAudioStatus('idle');
      };

      audioRef.current.play();
      setTestAudioStatus('playing');
    } catch (error) {
      console.error('测试语音失败:', error);
      setTestAudioStatus('error');
    }
  };

  // 初始化用户Bio
  const initializeUserBio = async () => {
    if (!userId) {
      alert('请先选择用户ID');
      return;
    }

    try {
      setBioInitStatus('loading');
      // 获取当前用户的API Host
      const apiHost = getUserHost(userId);
      const response = await fetch(`https://${apiHost}/api/session/${userId}/initialize_impression`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_impression: localSettings.userBio
        }),
      });

      if (!response.ok) {
        throw new Error(`初始化失败: ${response.status} ${response.statusText}`);
      }

      setBioInitStatus('success');
      // 3秒后重置状态
      setTimeout(() => {
        setBioInitStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('初始化Bio失败:', error);
      setBioInitStatus('error');
      // 3秒后重置状态
      setTimeout(() => {
        setBioInitStatus('idle');
      }, 3000);
    }
  };

  // 处理host变更
  const handleHostChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHost = e.target.value;
    console.log(`[AISettingsModal] 选择新host: ${newHost}`);
    
    if (newHost && newHost !== selectedHost) {
      const currentUserId = getUserId();
      updateUserHost(currentUserId, newHost);
      setSelectedHost(newHost);
    }
  };

  // 保存设置
  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  // 重置为默认值
  const handleReset = () => {
    setLocalSettings({
      temperature: DEFAULT_TEMPERATURE,
      top_p: DEFAULT_TOP_P,
      model: DEFAULT_AI_MODEL,
      voiceId: DEFAULT_TTS_VOICE_ID,
      userBio: '',
    });
    // 重置测试音频状态
    setTestAudioStatus('idle');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 半透明背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={onClose}
      ></div>

      {/* 弹框内容 */}
      <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96 md:w-[450px] max-w-[95vw]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            AI Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 用户ID管理区域 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">用户 ID</label>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={userId}
                onChange={handleUserIdChange}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {userIdList.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              {userId !== getDefaultUserId() && (
                <button
                  onClick={() => handleDeleteUserId(userId)}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-700 focus:outline-none"
                  title="删除当前用户ID"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="输入新用户ID"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddUserId}
                disabled={!newUserId || userIdList.includes(newUserId)}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
            {userIdUpdateStatus === 'success' && (
              <p className="text-sm text-green-600">用户ID更新成功</p>
            )}
            {userIdUpdateStatus === 'error' && (
              <p className="text-sm text-red-600">用户ID更新失败</p>
            )}
          </div>
        </div>

        {/* API Host配置区域 */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <label className="block text-sm font-medium mb-2">API Host</label>
          <div className="flex flex-col gap-2">
            <select
              value={selectedHost}
              onChange={handleHostChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getAvailableHosts().map((host) => (
                <option key={host} value={host}>
                  {host}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              选择API请求的服务器地址，不同环境有不同服务器。
            </p>
          </div>
        </div>

        {/* 用户Bio设置 */}
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            用户个人简介 (Bio)
          </label>
          <textarea
            value={localSettings.userBio}
            onChange={handleUserBioChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="请输入用户的个人简介，例如：Tim is a curious and energetic five-year-old boy with a love for music..."
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              用户的个人简介，帮助AI更好地理解用户的背景和兴趣。
            </p>
            <button
              onClick={initializeUserBio}
              disabled={bioInitStatus === 'loading'}
              className={`px-3 py-1 rounded-md text-sm ${
                bioInitStatus === 'loading'
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800'
              }`}
            >
              {bioInitStatus === 'loading' ? '初始化中...' : '初始化'}
            </button>
          </div>
          {bioInitStatus === 'success' && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Bio初始化成功！
            </p>
          )}
          {bioInitStatus === 'error' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Bio初始化失败，请重试。
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model
          </label>
          <input
            type="text"
            value={localSettings.model}
            onChange={handleModelChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="输入模型名称，如 anthropic/claude-3-7-sonnet"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            使用的 AI 模型。不同的模型有不同的能力和特点。
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Voice ID
          </label>
          <div className="flex items-center">
            <input
              type="text"
              value={localSettings.voiceId}
              onChange={handleVoiceIdChange}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="输入 ElevenLabs Voice ID"
            />
            <button
              onClick={testVoiceId}
              disabled={testAudioStatus === 'loading' || testAudioStatus === 'playing'}
              className={`px-3 py-2 rounded-r-md text-sm ${
                testAudioStatus === 'idle'
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800'
                  : testAudioStatus === 'loading'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : testAudioStatus === 'playing'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
            >
              {testAudioStatus === 'idle'
                ? '测试'
                : testAudioStatus === 'loading'
                ? '加载中...'
                : testAudioStatus === 'playing'
                ? '播放中...'
                : '错误'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ElevenLabs 的声音 ID，用于文本转语音。
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Temperature: {localSettings.temperature.toFixed(1)}
          </label>
          <div className="flex items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">0.0</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localSettings.temperature}
              onChange={handleTemperatureChange}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">2.0</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            控制生成文本的随机性。较低的值使输出更确定，较高的值使输出更多样化。
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Top P: {localSettings.top_p.toFixed(1)}
          </label>
          <div className="flex items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">0.0</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.top_p}
              onChange={handleTopPChange}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">1.0</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            控制生成文本的多样性。较低的值使输出更保守，较高的值使输出更多样化。
          </p>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
          >
            重置默认值
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            保存设置
          </button>
        </div>
      </div>
    </>
  );
};

export default AISettingsModal;
