/**
 * 简单的日志记录工具
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private readonly tag: string;
  
  constructor(tag: string) {
    this.tag = tag;
  }
  
  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.tag}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, ...args);
        break;
      case 'info':
        console.info(logMessage, ...args);
        break;
      case 'warn':
        console.warn(logMessage, ...args);
        break;
      case 'error':
        console.error(logMessage, ...args);
        break;
    }
  }
  
  d(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }
  
  i(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }
  
  w(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }
  
  e(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

/**
 * ASR 专用日志记录器
 */
export const AsrLogger = new Logger('ASR');

/**
 * 聊天专用日志记录器  
 */
export const ChatLogger = new Logger('CHAT');
