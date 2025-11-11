import { CanadianDataIngestionPipeline } from './ingestionPipeline';
import { CANADIAN_DATA_SOURCES, PROVINCIAL_SOURCES } from './canadianSources';
import type { DataSource } from './canadianSources';

export interface DataInjectionAgentConfig {
  pollingInterval: number; // in minutes
  batchSize: number;
  retryAttempts: number;
  retryDelay: number; // in seconds
  maxConcurrentSources: number;
}

export class DataInjectionAgent {
  private pipeline: CanadianDataIngestionPipeline;
  private config: DataInjectionAgentConfig;
  private activeSources: DataSource[];
  private isRunning: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<DataInjectionAgentConfig>) {
    this.pipeline = new CanadianDataIngestionPipeline();
    this.config = {
      pollingInterval: 60, // 1 hour
      batchSize: 1000,
      retryAttempts: 3,
      retryDelay: 30, // 30 seconds
      maxConcurrentSources: 3,
      ...config
    };
    
    // Combine federal and provincial sources
    this.activeSources = [...CANADIAN_DATA_SOURCES, ...PROVINCIAL_SOURCES];
  }

  /**
   * Starts the data injection agent with periodic polling
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Data Injection Agent is already running');
      return;
    }

    console.log('🚀 Starting Data Injection Agent...');
    this.isRunning = true;
    
    // Run initial import
    await this.runImportCycle();
    
    // Set up periodic polling
    this.pollingTimer = setInterval(async () => {
      await this.runImportCycle();
    }, this.config.pollingInterval * 60 * 1000);
    
    console.log(`✅ Data Injection Agent started with ${this.config.pollingInterval}-minute polling interval`);
  }

  /**
   * Stops the data injection agent
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Data Injection Agent is not running');
      return;
    }

    console.log('🛑 Stopping Data Injection Agent...');
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    this.isRunning = false;
    console.log('✅ Data Injection Agent stopped');
  }

  /**
   * Runs a single import cycle for all configured sources
   */
  private async runImportCycle(): Promise<void> {
    console.log('🔄 Starting data import cycle...');
    
    const results = {
      processed: 0,
      errors: 0,
      sourcesProcessed: 0
    };
    
    try {
      // Process sources concurrently up to the configured limit
      const sourceBatches = this.chunkArray(this.activeSources, this.config.maxConcurrentSources);
      
      for (const batch of sourceBatches) {
        const batchPromises = batch.map(source => this.processSourceWithRetry(source));
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const [index, result] of batchResults.entries()) {
          const source = batch[index];
          
          if (result.status === 'fulfilled') {
            results.processed += result.value.processed;
            results.sourcesProcessed++;
            console.log(`✅ Successfully processed ${source.name}: ${result.value.processed} records`);
          } else {
            results.errors++;
            console.error(`❌ Failed to process ${source.name}:`, result.reason);
          }
        }
      }
      
      console.log(`📊 Import cycle completed: ${results.processed} records processed, ${results.errors} errors, ${results.sourcesProcessed} sources`);
    } catch (error) {
      console.error('💥 Error during import cycle:', error);
      results.errors++;
    }
  }

  /**
   * Processes a single data source with retry logic
   */
  private async processSourceWithRetry(source: DataSource): Promise<{ processed: number; errors: string[] }> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${this.config.retryAttempts} for ${source.name}`);
        
        const result = await this.pipeline.ingestFromSource(source);
        
        if (attempt > 1) {
          console.log(`✅ ${source.name} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed for ${source.name}:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelay * 1000 * Math.pow(2, attempt - 1);
          console.log(`Waiting ${delay / 1000}s before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    // All attempts failed
    throw lastError;
  }

  /**
   * Helper to chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manually trigger an import cycle
   */
  async triggerImport(): Promise<void> {
    console.log('🔄 Manual import triggered...');
    await this.runImportCycle();
  }

  /**
   * Gets the current status of the agent
   */
  getStatus(): { isRunning: boolean; config: DataInjectionAgentConfig; activeSources: number } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      activeSources: this.activeSources.length
    };
  }

  /**
   * Updates the agent configuration
   */
  updateConfig(newConfig: Partial<DataInjectionAgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Data Injection Agent configuration updated');
  }
}