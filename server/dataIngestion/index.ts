
import { CanadianDataIngestionPipeline } from './ingestionPipeline';
import { storage } from '../storage';

export async function runCanadianIngestion(): Promise<void> {
  const pipeline = new CanadianDataIngestionPipeline();
  
  try {
    console.log('🇨🇦 Starting Canadian vendor data ingestion...');
    const results = await pipeline.ingestFromAllSources();
    
    console.log('\n📊 Ingestion Results:');
    console.log(`✅ Successfully processed: ${results.processed} vendors`);
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors encountered: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Canadian data ingestion completed!');
  } catch (error) {
    console.error('💥 Fatal error during ingestion:', error);
    throw error;
  }
}

// CLI runner - Check if module is run directly using a method compatible with ES modules
const isMain = 
  typeof process.argv[1] !== 'undefined' && 
  import.meta.url.replace('file://', '').includes(process.argv[1].replace(/\\/g, '/'));

if (isMain) {
  runCanadianIngestion()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Ingestion failed:', error);
      process.exit(1);
    });
}

export { CanadianDataIngestionPipeline } from './ingestionPipeline';
export { CanadianBusinessRegistryProcessor } from './canadianBusinessRegistryProcessor';
export { CSVDownloader } from './csvDownloader';
export { DataInjectionAgent } from './dataInjectionAgent';
export { SourceManager } from './sourceManager';
export { DataProcessingPipeline } from './dataProcessingPipeline';
export { MonitoringService } from './monitoringService';
export { runPublicDataDownload } from './publicDataDownloader';
