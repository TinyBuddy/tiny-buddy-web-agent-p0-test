/**
 * 简单的日志工具类
 */
export class Logger {
  private prefix: string;
  
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * 输出信息日志
   */
  i(message: string, ...args: any[]) {
    console.info(`[${this.prefix}] [INFO] ${message}`, ...args);
  }

  /**
   * 输出调试日志
   */
  d(message: string, ...args: any[]) {
    console.debug(`[${this.prefix}] [DEBUG] ${message}`, ...args);
  }

  /**
   * 输出警告日志
   */
  w(message: string, ...args: any[]) {
    console.warn(`[${this.prefix}] [WARN] ${message}`, ...args);
  }

  /**
   * 输出错误日志
   */
  e(message: string, error?: any) {
    console.error(`[${this.prefix}] [ERROR] ${message}`, error || '');
  }
}

/**
 * TTS 专用日志记录器
 */
export const TtsLogger = new Logger('TTS');

/**
 * ASR 专用日志记录器
 */
export const AsrLogger = new Logger('ASR');

/**
 * Chat 专用日志记录器
 */
export const ChatLogger = new Logger('CHAT');
