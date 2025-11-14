# Publicly Available Canadian Business Data Sources

This document lists all publicly available Canadian business registry data sources that can be accessed without special authorization.

## Federal Sources

### 1. Corporations Canada Open Data
- **URL**: https://ised-isde.canada.ca/cc/lgcy/download/OPEN_DATA_SPLIT.zip
- **Format**: XML
- **Content**: Federal corporations registered under Canada Business Corporations Act (CBCA)
- **Update Frequency**: Weekly
- **License**: Open Government Licence - Canada
- **Fields**: Corporation name, number, registered office address, status, etc.

### 2. Statistics Canada Business Register
- **Info URL**: https://open.canada.ca/data/en/dataset/1fd4d789-0e86-4526-9cd3-3d06d4c4c5a3
- **Content**: Comprehensive business population data
- **Format**: CSV (when available)
- **Update Frequency**: Monthly

### 3. OpenCorporates Canada API
- **URL**: https://api.opencorporates.com/v0.4/companies/search
- **Format**: JSON
- **API Access**: Free tier available with generous rate limits
- **Content**: Canadian company data across provinces with director information
- **Note**: Registration required for API key

## Provincial Sources

### Ontario
- **Ontario Open Data - Business Licenses**: Available in CSV format
- **Vendor of Record Program**: Enterprise-wide data on procurement opportunities
- **Note**: Full business registry data requires partnership authorization

### British Columbia
- **Data Distribution Services**: Various business datasets available
- **Lobbying Registration Data**: Available in CSV format
- **Corporate Registry**: Limited public access, more data available through account registration

## Data Processing Capabilities

The system is capable of processing:
- CSV files
- JSON APIs
- XML files (Federal Corporations data)
- ZIP archives containing structured data

## Rate Limits & Best Practices

- Respect rate limits specified in each source configuration
- Implement proper error handling for transient failures
- Use exponential backoff for retry logic
- Monitor data freshness to balance between updates and API limits

## Implementation Notes

The Data Injection Agent is configured to work with all these sources and will automatically:
- Poll data sources according to configured intervals
- Handle authentication and rate limiting
- Process different data formats (CSV, JSON, XML)
- Store validated data in the database
- Track data provenance for each record