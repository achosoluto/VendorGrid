# Canadian Data Injection Agent

The Canadian Data Injection Agent is an automated system for regularly importing Canadian business registry data from government sources.

## Features

- **Automated Polling**: Periodically checks data sources for new information
- **Retry Logic**: Handles temporary failures with configurable retry attempts
- **Rate Limiting**: Respects API rate limits across all sources
- **Error Handling**: Comprehensive error reporting and handling
- **Concurrent Processing**: Processes multiple sources in parallel
- **Graceful Shutdown**: Properly handles system signals for clean shutdown

## Configuration

The agent can be configured with the following parameters:

- `pollingInterval`: How often to check for updates (in minutes, default: 60)
- `batchSize`: Number of records to process in each batch (default: 1000)
- `retryAttempts`: Number of retry attempts for failed requests (default: 3)
- `retryDelay`: Initial delay between retries (in seconds, default: 30)
- `maxConcurrentSources`: Maximum number of sources to process simultaneously (default: 3)

## Usage

### Running the Agent

```bash
# Run the data injection agent
npm run agent:data-injection
```

The agent will start and begin polling Canadian business registry sources according to the configured schedule.

### Using the Agent Programmatically

```typescript
import { DataInjectionAgent } from './server/dataIngestion/dataInjectionAgent';

const agent = new DataInjectionAgent({
  pollingInterval: 30, // Check every 30 minutes
  maxConcurrentSources: 2
});

// Start the agent
await agent.start();

// Stop the agent
await agent.stop();

// Manually trigger an import cycle
await agent.triggerImport();

// Check status
console.log(agent.getStatus());
```

## Supported Data Sources

The agent currently monitors these Canadian business registry sources:

- Statistics Canada Business Register
- Corporations Canada
- Ontario Business Registry (requires partnership access)
- BC Corporate Registry
- Quebec Enterprise Registry
- Other provincial registries

## Data Processing Flow

1. **Polling**: Agent checks configured sources at regular intervals
2. **Download**: Retrieves latest data from each source
3. **Validation**: Verifies data integrity and format
4. **Processing**: Maps fields and transforms data to internal format
5. **Storage**: Saves validated records to the database
6. **Provenance**: Tracks data source and import metadata

## Monitoring

The agent provides status information and logs for monitoring:

- Processed record counts
- Error counts and details
- Source-specific statistics
- Runtime configuration

## Error Handling

The agent implements robust error handling:

- Automatic retries for transient failures
- Exponential backoff for API rate limits
- Detailed error reporting
- Continues operation despite individual source failures

## Integration

The agent integrates seamlessly with the existing data import pipeline and uses the same data models and database schema as other import methods.