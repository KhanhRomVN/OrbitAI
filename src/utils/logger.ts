// src/utils/logger.ts
import * as vscode from "vscode";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  CRITICAL = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  file: string;
  message: string;
  data?: any;
}

export class Logger {
  private static outputChannel: vscode.OutputChannel | null = null;
  private static logLevel: LogLevel = LogLevel.DEBUG;

  static initialize(outputChannel: vscode.OutputChannel): void {
    this.outputChannel = outputChannel;
  }

  static setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private static formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private static log(
    level: LogLevel,
    levelName: string,
    file: string,
    message: string,
    data?: any
  ): void {
    if (level < this.logLevel) {
      return;
    }

    const timestamp = this.formatTimestamp();
    const logEntry: LogEntry = {
      timestamp,
      level: levelName,
      file,
      message,
      data,
    };

    const logMessage = this.formatLogMessage(logEntry);

    // Output to VS Code Output Channel
    if (this.outputChannel) {
      this.outputChannel.appendLine(logMessage);
    }

    // Also log to console for development
    console.log(logMessage);

    // Show critical errors as notifications
    if (level === LogLevel.CRITICAL) {
      vscode.window.showErrorMessage(`[OrbitAI Critical] ${message}`);
    }
  }

  private static formatLogMessage(entry: LogEntry): string {
    let message = `[${entry.timestamp}] [${entry.level}] [${entry.file}] ${entry.message}`;

    if (entry.data !== undefined) {
      try {
        const dataStr = JSON.stringify(entry.data, null, 2);
        message += `\nData: ${dataStr}`;
      } catch (error) {
        message += `\nData: [Cannot stringify data]`;
      }
    }

    return message;
  }

  static debug(file: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, "DEBUG", file, message, data);
  }

  static info(file: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, "INFO", file, message, data);
  }

  static warn(file: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, "WARN", file, message, data);
  }

  static critical(file: string, message: string, data?: any): void {
    this.log(LogLevel.CRITICAL, "CRITICAL", file, message, data);
  }

  static clear(): void {
    if (this.outputChannel) {
      this.outputChannel.clear();
    }
  }

  static show(): void {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }
}
