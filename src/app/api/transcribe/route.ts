import { aiService } from '@/services/AIService';
import { AsrLogger } from '@/utils/logger';
import fs from 'fs';
import { writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * 处理音频转文本请求
 */
export async function POST(request: NextRequest) {
  try {
    AsrLogger.i('收到音频转文本请求');
    
    // 确保请求是 multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      AsrLogger.e('请求内容类型错误', contentType);
      return NextResponse.json(
        { error: '请求必须是 multipart/form-data 格式' },
        { status: 400 }
      );
    }

    // 获取表单数据
    const formData = await request.formData();
    const audioFile = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;
    const lastSentence = formData.get('lastSentence') as string | null;

    if (!audioFile) {
      AsrLogger.e('未提供音频文件');
      return NextResponse.json(
        { error: '未提供音频文件' },
        { status: 400 }
      );
    }

    // 记录音频文件信息
    AsrLogger.i(`接收到音频文件: ${audioFile.name}, 类型: ${audioFile.type}, 大小: ${audioFile.size} 字节`);

    // 将文件保存到临时目录
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 创建临时文件，强制使用 webm 扩展名
    // 从 MIME 类型中确定正确的扩展名
    let fileExt = 'webm'; // 默认使用 webm
    if (audioFile.type) {
      // 从 MIME 类型中提取主要格式
      const mimeFormat = audioFile.type.split(';')[0].split('/')[1];
      if (mimeFormat && ['webm', 'wav', 'mp3', 'mpeg', 'mp4', 'mpga', 'm4a'].includes(mimeFormat)) {
        fileExt = mimeFormat;
      }
    }
    // 确保在临时目录中创建子文件夹
    const transcribeDir = join(tmpdir(), 'transcribe');
    if (!fs.existsSync(transcribeDir)) {
      fs.mkdirSync(transcribeDir, { recursive: true });
    }
    
    const tempFilePath = join(transcribeDir, `audio_${Date.now()}.${fileExt}`);
    await writeFile(tempFilePath, buffer);
    
    AsrLogger.i(`音频文件已保存到临时目录: ${tempFilePath}`);
    AsrLogger.i(`使用音频格式: ${fileExt}`);

    // 直接使用原始文件，不进行格式转换
    const finalFilePath = tempFilePath;

    // 调用 AI 服务进行转写
    const text = await aiService.transcribeAudio(finalFilePath, language || undefined, lastSentence || undefined);
    
    AsrLogger.i('音频转文本成功');
    return NextResponse.json({ text });
  } catch (error: any) {
    AsrLogger.e('音频转文本处理失败', error);
    return NextResponse.json(
      { error: error.message || '处理请求时出错' },
      { status: 500 }
    );
  }
}
