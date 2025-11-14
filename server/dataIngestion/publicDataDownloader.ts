import { SourceManager } from './sourceManager';
import { DataInjectionAgent } from './dataInjectionAgent';

export async function runPublicDataDownload(): Promise<void> {
  console.log('🚀 Starting Canadian Public Data Download System...');
  
  try {
    const sourceManager = new SourceManager();
    
    // Download from all public sources
    const results = await sourceManager.downloadFromAllPublicSources();
    
    console.log('\n📊 Download Results:');
    let totalProcessed = 0;
    let totalSaved = 0;
    let totalErrors = 0;
    
    for (const result of results) {
      console.log(`\n${result.sourceName}:`);
      console.log(`  Processed: ${result.recordsProcessed} records`);
      console.log(`  Saved: ${result.recordsSaved} records`);
      console.log(`  Errors: ${result.errors.length}`);
      console.log(`  Success: ${result.success ? '✅' : '❌'}`);
      
      totalProcessed += result.recordsProcessed;
      totalSaved += result.recordsSaved;
      totalErrors += result.errors.length;
    }
    
    console.log('\n📈 Overall Statistics:');
    console.log(`Total Records Processed: ${totalProcessed}`);
    console.log(`Total Records Saved: ${totalSaved}`);
    console.log(`Total Errors: ${totalErrors}`);
    
    // Show recent stats from monitoring
    const systemStats = sourceManager['monitoringService'].getSystemStats();
    console.log('\n📊 System Performance:');
    console.log(`Total Downloads: ${systemStats.totalDownloads}`);
    console.log(`Successful Downloads: ${systemStats.successfulDownloads}`);
    console.log(`Error Rate: ${(systemStats.errorRate * 100).toFixed(2)}%`);
    console.log(`Average Download Time: ${systemStats.averageDownloadTime.toFixed(2)}ms`);
    
    console.log('\n🎉 Canadian Public Data Download completed!');
  } catch (error) {
    console.error('💥 Error during download process:', error);
    throw error;
  }
}

// CLI runner - ES module compatible check
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = process.argv[1];

// Check if this script is being run directly
const isRunningDirectly = scriptPath && __filename.includes(scriptPath);

if (isRunningDirectly) {
  runPublicDataDownload()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Download failed:', error);
      process.exit(1);
    });
}

export { 
  SourceManager, 
  DataProcessingPipeline, 
  MonitoringService,
  DataInjectionAgent 
};