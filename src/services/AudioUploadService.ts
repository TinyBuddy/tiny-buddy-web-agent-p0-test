import { ChatLogger } from '@/utils/logger';
import FormData from "form-data";
import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import axios, { AxiosInstance } from 'axios';
import { getUserHost } from '@/utils/hostManager';

class AudioUploadService {
  private static instance: AudioUploadService;
  private readonly _axios: AxiosInstance;

  private constructor() {
    this._axios = axios.create({
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  public static getInstance(): AudioUploadService {
    if (!AudioUploadService.instance) {
      AudioUploadService.instance = new AudioUploadService();
    }
    return AudioUploadService.instance;
  }
  
  public async initialize() {
    const transcribeDir = join(tmpdir(), "transcribe");
    if (!fs.existsSync(transcribeDir)) {
      fs.mkdirSync(transcribeDir, { recursive: true });
    }
  }
  
  public async getLatestAudioFile(userId: string, messageId: string, host:string) : Promise<string | undefined>{
    try {
      // 获取临时目录中的所有文件
      const transcribeDir = join(tmpdir(), "transcribe");
      const files = await fs.promises.readdir(transcribeDir);

      // 获取所有音频文件的详细信息
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = join(transcribeDir, file);
          const fileStat = await fs.promises.stat(filePath);
          return {
            name: file,
            path: filePath,
            createdAt: fileStat.birthtime || fileStat.mtime,
          };
        })
      );

      // 按创建时间降序排序，找出最新的文件
      fileStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const finalFile = fileStats[0];

      ChatLogger.i(`找到最新的音频文件: ${finalFile.name}`);

      // 创建表单数据
      const formData = new FormData();
      formData.append("audio_file", fs.createReadStream(finalFile.path));
      
      // 获取当前用户的API Host
      const apiHost = host;
      ChatLogger.i(`上传使用 HOST: ${apiHost}`);
      
      // 发送请求
      const response = await this._axios.post(
        `https://${apiHost}/api/session/${userId}/messages/${messageId}/sentiment`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      
      if (response.status === 200) {
        ChatLogger.i(`上传音频文件成功: ${finalFile.name}`);
        fs.unlinkSync(finalFile.path);
      }

      return response.data;
    } catch (error) {
      ChatLogger.e('获取最新音频文件失败', error);
      return undefined;
    }
  }
}

export default AudioUploadService.getInstance();
