import { DataSource } from './canadianSources';
import { FileDownloader } from './fileDownloader';
import { ApiDownloader } from './apiDownloader';
import { WebScraper } from './webScraper';
import { DataProcessingPipeline } from './dataProcessingPipeline';
import { RawBusinessData } from './canadianBusinessRegistryProcessor';
import { MonitoringService, DownloadStats } from './monitoringService';

export interface DownloadResult {
  sourceName: string;
  success: boolean;
  recordsProcessed: number;
  recordsSaved: number;
  errors: string[];
  downloadTime: number;
  dataSize?: number;
}

export interface SourceManagerConfig {
  maxConcurrentDownloads: number;
  retryAttempts: number;
  retryDelay: number; // in ms
  rateLimitDelay: number; // in ms
  userAgent: string;
}

export class SourceManager {
  private fileDownloader: FileDownloader;
  private apiDownloader: ApiDownloader;
  private webScraper: WebScraper;
  private dataProcessingPipeline: DataProcessingPipeline;
  private monitoringService: MonitoringService;
  private config: SourceManagerConfig;
  private activeDownloads: Set<string> = new Set();

  constructor(config?: Partial<SourceManagerConfig>) {
    this.config = {
      maxConcurrentDownloads: 3,
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimitDelay: 1000,
      userAgent: 'Canadian-Data-Ingestion-System/1.0',
      ...config
    };

    this.fileDownloader = new FileDownloader();
    this.apiDownloader = new ApiDownloader();
    this.webScraper = new WebScraper();
    this.dataProcessingPipeline = new DataProcessingPipeline();
    this.monitoringService = new MonitoringService();
  }

  /**
   * Downloads data from a single source based on its type
   */
  async downloadFromSource(source: DataSource): Promise<DownloadResult> {
    const startTime = Date.now();
    const sourceId = `${source.name}-${Date.now()}`;
    
    if (this.activeDownloads.has(sourceId)) {
      const errorResult: DownloadResult = {
        sourceName: source.name,
        success: false,
        recordsProcessed: 0,
        recordsSaved: 0,
        errors: [`Download already in progress for ${source.name}`],
        downloadTime: 0
      };
      
      // Record the error in monitoring
      this.recordDownloadStats(source, startTime, errorResult);
      return errorResult;
    }
    
    this.activeDownloads.add(sourceId);
    
    try {
      let result: DownloadResult;
      
      switch (source.type) {
        case 'csv':
        case 'xml':
        case 'json':
          result = await this.downloadFileSource(source);
          break;
        case 'api':
          result = await this.downloadApiSource(source);
          break;
        case 'web':
        default:
          result = await this.scrapeWebSource(source);
          break;
      }
      
      const downloadTime = Date.now() - startTime;
      // Update the download time in the result
      result.downloadTime = downloadTime;
      
      // Record stats for monitoring
      this.recordDownloadStats(source, startTime, result);
      
      return result;
      
    } catch (error) {
      const downloadTime = Date.now() - startTime;
      const errorResult: DownloadResult = {
        sourceName: source.name,
        success: false,
        recordsProcessed: 0,
        recordsSaved: 0,
        errors: [error.message],
        downloadTime,
      };
      
      // Record the error in monitoring
      this.recordDownloadStats(source, startTime, errorResult);
      
      return errorResult;
    } finally {
      this.activeDownloads.delete(sourceId);
    }
  }

  private recordDownloadStats(source: DataSource, startTime: number, result: DownloadResult): void {
    const stats: DownloadStats = {
      sourceName: source.name,
      timestamp: new Date(startTime),
      recordsProcessed: result.recordsProcessed,
      recordsSaved: result.recordsSaved,
      errors: result.errors.length,
      downloadTimeMs: result.downloadTime,
      dataSize: result.dataSize,
      success: result.success
    };
    
    this.monitoringService.recordStats(stats);
  }

  /**
   * Downloads data from multiple sources concurrently
   */
  async downloadFromMultipleSources(sources: DataSource[]): Promise<DownloadResult[]> {
    const results: DownloadResult[] = [];
    
    // Process sources in batches to respect maxConcurrentDownloads
    const batches = this.createBatches(sources, this.config.maxConcurrentDownloads);
    
    for (const batch of batches) {
      const batchPromises = batch.map(source => this.downloadFromSource(source));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const [index, result] of batchResults.entries()) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            sourceName: batch[index].name,
            success: false,
            recordsProcessed: 0,
            errors: [result.reason?.message || 'Unknown error'],
            downloadTime: 0
          });
        }
      }
      
      // Add delay between batches to be respectful to servers
      if (batches.length > 1) {
        await this.sleep(this.config.rateLimitDelay);
      }
    }
    
    return results;
  }

  /**
   * Downloads from all available public sources
   */
  async downloadFromAllPublicSources(): Promise<DownloadResult[]> {
    // These would be the actual public sources we identified
    // We'll import them from the Canadian sources file
    const { CANADIAN_DATA_SOURCES, PROVINCIAL_SOURCES } = await import('../canadianSources');
    
    // Filter for sources that don't require authentication
    const publicSources = [...CANADIAN_DATA_SOURCES, ...PROVINCIAL_SOURCES].filter(source => {
      // These are URLs we know don't require auth based on our research
      return source.url.includes('open.canada.ca') || 
             source.url.includes('data.ontario.ca') || 
             source.url.includes('statcan.gc.ca') ||
             source.url.includes('ised-isde.canada.ca');
    });
    
    console.log(`Found ${publicSources.length} public data sources to download from`);
    return await this.downloadFromMultipleSources(publicSources);
  }

  private async downloadFileSource(source: DataSource): Promise<DownloadResult> {
    return await this.withRetry(async () => {
      // Get the raw data from the file downloader
      const downloadResult = await this.fileDownloader.download(source);
      
      if (!downloadResult.success) {
        return downloadResult;
      }
      
      // In a real implementation, we would extract the actual raw business data from the file
      // For now, we'll return the download result and the save process would happen separately
      // since fileDownloader just counts records but doesn't extract the actual data
      
      return {
        ...downloadResult,
        recordsSaved: 0 // Actual saving would happen after data extraction
      };
    });
  }

  private async downloadApiSource(source: DataSource): Promise<DownloadResult> {
    return await this.withRetry(async () => {
      // For API sources, we need to fetch the data, process it, and save it
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

      const rawData = await response.json();
      const normalizedData = this.dataProcessingPipeline.normalizeData(Array.isArray(rawData) ? rawData : [rawData]);
      const validationResults = this.dataProcessingPipeline.validateData(normalizedData);
      
      // Save the valid records to the database
      const saveResult = await this.dataProcessingPipeline.saveToDatabase(validationResults.valid, source.name);
      
      return {
        sourceName: source.name,
        success: true,
        recordsProcessed: Array.isArray(rawData) ? rawData.length : 1,
        recordsSaved: saveResult.saved,
        errors: saveResult.errors,
        downloadTime: 0 // Will be added by caller
      };
    });
  }

  private async scrapeWebSource(source: DataSource): Promise<DownloadResult> {
    return await this.withRetry(async () => {
      // For web scraping, we need to get the data, process it, and save it
      const scrapedData = await this.webScraper.scrape(source);
      
      if (!scrapedData.success) {
        return scrapedData;
      }
      
      // In the web scraper implementation, we return record count but not actual data
      // We would need to update the web scraper to return actual scraped records
      // For now, returning the original result
      return scrapedData;
    });
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          console.log(`✅ Operation succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          await this.sleep(this.config.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}