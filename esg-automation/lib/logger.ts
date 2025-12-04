/**
 * Structured logging utility
 * Provides consistent, structured logging across the application
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    // In production, only log INFO and above
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLog(level: string, message: string, meta?: Record<string, any>): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    return entry;
  }

  private output(level: LogLevel, levelName: string, message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.formatLog(levelName, message, meta);
    const logString = JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[${levelName}] ${message}`, meta || '');
        break;
      case LogLevel.INFO:
        console.info(`[${levelName}] ${message}`, meta || '');
        break;
      case LogLevel.WARN:
        console.warn(`[${levelName}] ${message}`, meta || '');
        break;
      case LogLevel.ERROR:
        console.error(`[${levelName}] ${message}`, meta || '');
        break;
    }

    // In production, also output structured JSON for log aggregation
    if (!this.isDevelopment && (level === LogLevel.ERROR || level === LogLevel.WARN)) {
      console.log(logString);
    }
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.output(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.output(LogLevel.INFO, 'INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.output(LogLevel.WARN, 'WARN', message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.output(LogLevel.ERROR, 'ERROR', message, meta);
  }

  // Contextual loggers for specific modules
  api(message: string, requestId?: string, meta?: Record<string, any>): void {
    this.info(`[API] ${message}`, { requestId, ...meta });
  }

  apiError(message: string, requestId?: string, meta?: Record<string, any>): void {
    this.error(`[API ERROR] ${message}`, { requestId, ...meta });
  }

  llm(message: string, provider?: string, meta?: Record<string, any>): void {
    this.info(`[LLM] ${message}`, { provider, ...meta });
  }

  llmError(message: string, provider?: string, meta?: Record<string, any>): void {
    this.error(`[LLM ERROR] ${message}`, { provider, ...meta });
  }

  fileProcessing(message: string, fileName?: string, meta?: Record<string, any>): void {
    this.info(`[FILE] ${message}`, { fileName, ...meta });
  }

  fileProcessingError(message: string, fileName?: string, meta?: Record<string, any>): void {
    this.error(`[FILE ERROR] ${message}`, { fileName, ...meta });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, meta?: Record<string, any>) => logger.debug(message, meta),
  info: (message: string, meta?: Record<string, any>) => logger.info(message, meta),
  warn: (message: string, meta?: Record<string, any>) => logger.warn(message, meta),
  error: (message: string, meta?: Record<string, any>) => logger.error(message, meta),
  api: (message: string, requestId?: string, meta?: Record<string, any>) => logger.api(message, requestId, meta),
  apiError: (message: string, requestId?: string, meta?: Record<string, any>) => logger.apiError(message, requestId, meta),
  llm: (message: string, provider?: string, meta?: Record<string, any>) => logger.llm(message, provider, meta),
  llmError: (message: string, provider?: string, meta?: Record<string, any>) => logger.llmError(message, provider, meta),
  fileProcessing: (message: string, fileName?: string, meta?: Record<string, any>) => logger.fileProcessing(message, fileName, meta),
  fileProcessingError: (message: string, fileName?: string, meta?: Record<string, any>) => logger.fileProcessingError(message, fileName, meta),
};
