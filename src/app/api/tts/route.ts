import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { aiService } from "@/services/AIService";
import { TtsLogger } from "@/utils/logger";

/**
 * 处理文本转语音请求
 */
export async function POST(request: NextRequest) {
  try {
    TtsLogger.i("收到文本转语音请求");

    // 解析请求体
    const body = await request.json();
    const { text, voiceId, modelId } = body;

    if (!text) {
      TtsLogger.e("未提供文本内容");
      return NextResponse.json({ error: "未提供文本内容" }, { status: 400 });
    }

    TtsLogger.i(
      `文本长度: ${text.length}, voiceId: ${voiceId || "默认"}, modelId: ${
        modelId || "默认"
      }`
    );

    // 调用 AI 服务进行文本转语音
    const audioFilePath = await aiService.textToSpeech(text, voiceId, modelId);

    // 读取生成的音频文件
    const audioBuffer = await readFile(audioFilePath);

    TtsLogger.i(
      `文本转语音成功，返回音频文件，大小: ${audioBuffer.length} 字节`
    );

    // 返回音频数据
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="speech.mp3"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  } catch (error: any) {
    TtsLogger.e("文本转语音处理失败", error);
    return NextResponse.json(
      { error: error.message || "处理请求时出错" },
      { status: 500 }
    );
  }
}
