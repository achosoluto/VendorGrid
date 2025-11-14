# Summary of Learnings and Critical Insights
**Document Date:** November 11, 2025

## Database Compatibility Issues
- **Cross-database schema incompatibility**: PostgreSQL-specific functions like `crypto.randomUUID()` are not compatible with SQLite, causing syntax errors
- **Drizzle ORM behavior differences**: The same ORM code can behave differently across database engines
- **Schema design considerations**: Functions that work in one database may not work in another, requiring database-agnostic approaches or conditional logic

## Application Architecture Insights
- **Hybrid database configuration**: The application's ability to auto-detect and work with either PostgreSQL or SQLite is a robust design feature
- **ID generation strategies**: For maximum compatibility, it's better to generate UUIDs in the application layer rather than in the database schema
- **Error handling importance**: Proper error handling is essential to catch and manage database-specific issues gracefully

## Testing and Development Learnings
- **Database-specific testing**: Always test with the actual target database since mock testing may not reveal all compatibility issues
- **Integration testing**: Database operations need to be tested against the real database, not just with mocks
- **Performance considerations**: Batch operations need proper monitoring and error handling for large datasets

## Data Ingestion Best Practices
- **Streaming vs batch processing**: For large datasets (like the ODBus with 446k+ records), streaming approaches are more memory efficient
- **Duplicate detection**: Important to handle potential duplicate records during bulk ingestion
- **Data validation**: Critical to validate data before insertion to prevent database errors
- **Progress tracking**: Essential for large datasets to monitor ingestion progress

## Schema and Migration Learnings
- **Primary key handling**: When removing default values from schema, all create operations need to explicitly provide values
- **Referential integrity**: All related tables needed to be updated when changing primary key generation patterns
- **Default values**: Need to be carefully considered for cross-database compatibility

## Performance Considerations
- **Batch processing**: Optimal batch size for SQLite appears to be around 1000 records for efficient processing
- **Memory management**: Streaming processing prevents memory overflow with large datasets
- **Database locking**: SQLite has different concurrency characteristics compared to PostgreSQL

## Error Handling and Resilience
- **Graceful degradation**: Systems should continue processing despite individual record failures
- **Constraint handling**: Unique constraints can cause failures during bulk operations, requiring duplicate detection/prevention
- **Error reporting**: Clear error messages help with debugging and issue resolution

## Data Quality Insights
- **Canadian business data**: Requires specific validation for postal codes, province codes, and business number formats
- **Special character handling**: Business names often contain special characters that need proper escaping
- **Data provenance tracking**: Important to maintain source attribution for data quality and compliance

These learnings provide valuable insights for future development, particularly when working with multi-database applications and large-scale data ingestion systems.