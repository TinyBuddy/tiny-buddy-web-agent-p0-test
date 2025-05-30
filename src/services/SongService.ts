import { Song, SongsResponse } from '@/types/song';
import axios from 'axios';

/**
 * 歌曲服务类，用于获取和管理歌曲信息
 */
export class SongService {
  private static instance: SongService;
  private songs: Song[] = [];
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): SongService {
    if (!SongService.instance) {
      SongService.instance = new SongService();
      SongService.instance.initialize();
    }
    return SongService.instance;
  }

  /**
   * 初始化服务，获取歌曲列表
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
        console.log('开始获取歌曲列表...');
        const response = await axios.get<SongsResponse>(
          'https://web-production-5934.up.railway.app/api/songs',
          {
            headers: {
              'accept': 'application/json'
            }
          }
        );
        
        this.songs = response.data.songs;
        this.isInitialized = true;
        console.log(`成功获取${this.songs.length}首歌曲信息`);
        resolve();
      } catch (error) {
        console.error('获取歌曲列表失败:', error);
        this.initPromise = null; // 重置Promise以便下次重试
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * 获取所有歌曲
   * @returns Song[] 歌曲列表
   */
  public getAllSongs(): Song[] {
    if (!this.isInitialized) {
      console.warn('歌曲服务尚未初始化，请先调用initialize()方法');
    }
    return [...this.songs]; // 返回副本，防止外部修改
  }

  /**
   * 根据ID获取歌曲
   * @param id 歌曲ID
   * @returns Song | undefined 找到的歌曲或undefined
   */
  public getSongById(id: string): Song | undefined {
    if (!this.isInitialized) {
      console.warn('歌曲服务尚未初始化，请先调用initialize()方法');
    }
    return this.songs.find(song => song.id === id);
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
export const songService = SongService.getInstance();
