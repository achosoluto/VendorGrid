import fetch from 'node-fetch';
import { DataSource } from '../canadianSources';
import { DownloadResult } from './sourceManager';

/**
 * Handles downloading data from API sources
 */
export class ApiDownloader {
  private rateLimiters = new Map<string, { lastRequest: number; requestCount: number }>();
  
  async fetch(source: DataSource): Promise<DownloadResult> {
    try {
      // Check rate limits
      if (!this.checkRateLimit(source.name, source.rateLimit)) {
        throw new Error(`Rate limit exceeded for ${source.name}`);
      }
      
      const response = await fetch(source.url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Canadian-Data-Ingestion-System/1.0',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const recordsProcessed = Array.isArray(data) ? data.length : 1;
      
      // Update rate limiter
      this.updateRateLimit(source.name);
      
      return {
        sourceName: source.name,
        success: true,
        recordsProcessed,
        errors: [],
        downloadTime: 0 // Will be added by caller
      };
    } catch (error) {
      return {
        sourceName: source.name,
        success: false,
        recordsProcessed: 0,
        errors: [error.message],
        downloadTime: 0 // Will be added by caller
      };
    }
  }

  private checkRateLimit(sourceName: string, limitPerMinute: number): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(sourceName) || { lastRequest: 0, requestCount: 0 };

    // Reset count every minute
    if (now - limiter.lastRequest > 60000) {
      limiter.requestCount = 0;
    }

    if (limiter.requestCount >= limitPerMinute) {
      return false;
    }

    return true;
  }

  private updateRateLimit(sourceName: string): void {
    const now = Date.now();
    const limiter = this.rateLimiters.get(sourceName) || { lastRequest: 0, requestCount: 0 };

    // Reset count every minute
    if (now - limiter.lastRequest > 60000) {
      limiter.requestCount = 0;
    }

    limiter.requestCount++;
    limiter.lastRequest = now;
    this.rateLimiters.set(sourceName, limiter);
  }
}