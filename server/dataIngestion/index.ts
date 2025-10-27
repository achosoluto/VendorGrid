
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

// CLI runner
if (require.main === module) {
  runCanadianIngestion()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Ingestion failed:', error);
      process.exit(1);
    });
}
