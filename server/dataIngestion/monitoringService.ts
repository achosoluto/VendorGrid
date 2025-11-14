import fs from 'fs';
import path from 'path';

export interface DownloadStats {
  sourceName: string;
  timestamp: Date;
  recordsProcessed: number;
  recordsSaved: number;
  errors: number;
  downloadTimeMs: number;
  dataSize?: number;
  success: boolean;
}

export interface SystemStats {
  totalDownloads: number;
  successfulDownloads: number;
  failedDownloads: number;
  totalRecordsProcessed: number;
  totalRecordsSaved: number;
  errorRate: number;
  averageDownloadTime: number;
  sources: {
    [sourceName: string]: {
      total: number;
      successful: number;
      failed: number;
      lastRun: Date;
      averageTime: number;
    }
  };
}

export class MonitoringService {
  private stats: DownloadStats[] = [];
  private logFile: string;
  private maxStats: number;

  constructor(logFile?: string, maxStats: number = 1000) {
    this.logFile = logFile || path.join(process.cwd(), 'logs', 'download-stats.json');
    this.maxStats = maxStats;
    
    // Ensure logs directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Records download statistics
   */
  recordStats(stats: DownloadStats): void {
    this.stats.push(stats);
    
    // Keep only the most recent stats to prevent memory issues
    if (this.stats.length > this.maxStats) {
      this.stats = this.stats.slice(-this.maxStats);
    }
    
    // Log to file as well
    this.logToFile(stats);
  }

  /**
   * Gets system-wide statistics
   */
  getSystemStats(): SystemStats {
    const totalDownloads = this.stats.length;
    const successfulDownloads = this.stats.filter(s => s.success).length;
    const failedDownloads = totalDownloads - successfulDownloads;
    const totalRecordsProcessed = this.stats.reduce((sum, stat) => sum + stat.recordsProcessed, 0);
    const totalRecordsSaved = this.stats.reduce((sum, stat) => sum + stat.recordsSaved, 0);
    const totalDownloadTime = this.stats.reduce((sum, stat) => sum + stat.downloadTimeMs, 0);
    
    const errorRate = totalDownloads > 0 ? failedDownloads / totalDownloads : 0;
    const averageDownloadTime = totalDownloads > 0 ? totalDownloadTime / totalDownloads : 0;
    
    // Per-source statistics
    const sources: SystemStats['sources'] = {};
    
    for (const stat of this.stats) {
      if (!sources[stat.sourceName]) {
        sources[stat.sourceName] = {
          total: 0,
          successful: 0,
          failed: 0,
          lastRun: new Date(0),
          averageTime: 0
        };
      }
      
      const sourceStats = sources[stat.sourceName];
      sourceStats.total++;
      sourceStats.lastRun = stat.timestamp;
      
      if (stat.success) {
        sourceStats.successful++;
      } else {
        sourceStats.failed++;
      }
    }
    
    // Calculate average times per source
    for (const [sourceName, sourceStats] of Object.entries(sources)) {
      const sourceRuns = this.stats.filter(s => s.sourceName === sourceName);
      const totalTime = sourceRuns.reduce((sum, stat) => sum + stat.downloadTimeMs, 0);
      sourceStats.averageTime = sourceRuns.length > 0 ? totalTime / sourceRuns.length : 0;
    }
    
    return {
      totalDownloads,
      successfulDownloads,
      failedDownloads,
      totalRecordsProcessed,
      totalRecordsSaved,
      errorRate,
      averageDownloadTime,
      sources
    };
  }

  /**
   * Gets statistics for a specific time period
   */
  getStatsForPeriod(startDate: Date, endDate: Date = new Date()): DownloadStats[] {
    return this.stats.filter(stat => 
      stat.timestamp >= startDate && stat.timestamp <= endDate
    );
  }

  /**
   * Gets the most recent stats
   */
  getRecentStats(count: number = 10): DownloadStats[] {
    return this.stats.slice(-count).reverse();
  }

  /**
   * Gets error statistics
   */
  getErrorStats(): { [sourceName: string]: string[] } {
    const errorStats: { [sourceName: string]: string[] } = {};
    
    for (const stat of this.stats) {
      if (stat.errors > 0) {
        if (!errorStats[stat.sourceName]) {
          errorStats[stat.sourceName] = [];
        }
      }
    }
    
    return errorStats;
  }

  /**
   * Logs the download stats to a file
   */
  private logToFile(stats: DownloadStats): void {
    const logEntry = {
      timestamp: stats.timestamp.toISOString(),
      source: stats.sourceName,
      success: stats.success,
      recordsProcessed: stats.recordsProcessed,
      recordsSaved: stats.recordsSaved,
      errors: stats.errors,
      downloadTimeMs: stats.downloadTimeMs,
      dataSize: stats.dataSize
    };
    
    // Append to the log file
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Loads stats from the log file
   */
  loadFromLogFile(): void {
    if (!fs.existsSync(this.logFile)) {
      return;
    }
    
    const logContent = fs.readFileSync(this.logFile, 'utf-8');
    const lines = logContent.split('\n').filter(line => line.trim() !== '');
    
    this.stats = [];
    
    for (const line of lines) {
      try {
        const logEntry = JSON.parse(line);
        this.stats.push({
          sourceName: logEntry.source,
          timestamp: new Date(logEntry.timestamp),
          recordsProcessed: logEntry.recordsProcessed,
          recordsSaved: logEntry.recordsSaved,
          errors: logEntry.errors || (Array.isArray(logEntry.errorMessages) ? logEntry.errorMessages.length : 0),
          downloadTimeMs: logEntry.downloadTimeMs,
          dataSize: logEntry.dataSize,
          success: logEntry.success
        });
      } catch (error) {
        console.error('Error parsing log entry:', line, error);
      }
    }
  }
}