import axios from 'axios';
import { SoundEffect, SoundEffectsResponse } from '@/types/soundEffect';

/**
 * 音效服务类，用于获取和管理音效信息
 */
export class SoundEffectService {
  private static instance: SoundEffectService;
  private soundEffects: SoundEffect[] = [];
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): SoundEffectService {
    if (!SoundEffectService.instance) {
      SoundEffectService.instance = new SoundEffectService();
      SoundEffectService.instance.initialize();
    }
    return SoundEffectService.instance;
  }

  /**
   * 初始化服务，获取音效列表
   * @returns Promise<void>
   */
  public async initialize(): Promise<void> {
    // 如果已经初始化或正在初始化中，则返回已有的Promise
    if (this.isInitialized) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    // 创建初始化Promise
    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        console.log('开始获取音效列表...');
        const response = await axios.get<SoundEffectsResponse>(
          'https://web-production-5934.up.railway.app/api/sound_effects',
          {
            headers: {
              'accept': 'application/json'
            }
          }
        );
        
        this.soundEffects = response.data.sound_effects;
        this.isInitialized = true;
        console.log(`成功获取${this.soundEffects.length}个音效信息`);
        resolve();
      } catch (error) {
        console.error('获取音效列表失败:', error);
        this.initPromise = null; // 重置Promise以便下次重试
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * 获取所有音效
   * @returns SoundEffect[] 音效列表
   */
  public getAllSoundEffects(): SoundEffect[] {
    if (!this.isInitialized) {
      console.warn('音效服务尚未初始化，请先调用initialize()方法');
    }
    return [...this.soundEffects]; // 返回副本，防止外部修改
  }

  /**
   * 根据ID获取音效
   * @param id 音效ID
   * @returns SoundEffect | undefined 找到的音效或undefined
   */
  public getSoundEffectById(id: string): SoundEffect | undefined {
    if (!this.isInitialized) {
      console.warn('音效服务尚未初始化，请先调用initialize()方法');
    }
    return this.soundEffects.find(soundEffect => soundEffect.id === id);
  }

  /**
   * 检查服务是否已初始化
   * @returns boolean
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// 创建全局单例实例
export const soundEffectService = SoundEffectService.getInstance();
