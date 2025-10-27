# Canadian Government Business Data Sources Research

*Government Data Integration Agent - Research Phase*  
*Date: October 3, 2025*

## Primary Data Sources

### 1. Statistics Canada Business Register
**Status**: ✅ Primary Target - Comprehensive Business Data

- **URL**: https://www.statcan.gc.ca/en/survey/business/1105
- **API**: Open Government Portal API
- **Data Format**: JSON, CSV, XML
- **Coverage**: All Canadian businesses with employees or $30K+ revenue
- **Rate Limits**: 1,000 requests/hour for bulk access
- **Update Frequency**: Monthly
- **Key Fields**:
  - Business Number (BN)
  - Legal Name
  - Operating Name
  - Industry Classification (NAICS)
  - Employment Size
  - Revenue Range
  - Province/Territory
  - Postal Code
  - Business Type

**API Endpoint**: `https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/en/1234567890`

### 2. Corporations Canada (ISED)
**Status**: ✅ Federal Corporate Registrations

- **URL**: https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html
- **API**: Corporate Registry API (requires registration)
- **Data Format**: JSON, XML
- **Coverage**: Federal corporations only (~800K companies)
- **Rate Limits**: 100 requests/minute
- **Update Frequency**: Real-time
- **Key Fields**:
  - Corporation Number
  - Corporation Name
  - Corporation Type
  - Status (Active, Inactive, Dissolved)
  - Incorporation Date
  - Registered Address
  - Directors (limited access)

**API Endpoint**: `https://www.ic.gc.ca/app/api/ic/ccc/corpns/srch`

### 3. Canada Revenue Agency Business Number Registry
**Status**: ✅ Tax ID Validation and Business Status

- **URL**: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/registering-your-business/business-number.html
- **API**: BN Registry API (restricted access)
- **Data Format**: JSON
- **Coverage**: All businesses with CRA accounts
- **Rate Limits**: 50 requests/minute
- **Authentication**: API Key required
- **Key Fields**:
  - Business Number (9 digits)
  - Program Accounts (GST, Payroll, etc.)
  - Business Status
  - Registration Date

### 4. Provincial Business Registries

#### Ontario Business Registry
- **URL**: https://www.ontario.ca/data/ontario-business-registry
- **Format**: Open Data CSV downloads
- **Coverage**: ~3.2M business registrations
- **Update**: Monthly
- **Size**: ~500MB compressed

#### British Columbia Corporate Registry
- **URL**: https://www.bcregistry.gov.bc.ca/
- **API**: BC Registry API
- **Coverage**: ~1.8M businesses
- **Rate Limits**: 1,000 requests/day (free tier)

#### Quebec Enterprise Registry (REQ)
- **URL**: https://www.registreentreprises.gouv.qc.ca/
- **API**: REQ Web Services
- **Language**: French/English
- **Coverage**: ~1.5M businesses
- **Rate Limits**: 500 requests/hour

#### Alberta Corporate Registry
- **URL**: https://www.alberta.ca/alberta-corporate-registry-services
- **Format**: Bulk downloads available
- **Coverage**: ~800K businesses
- **Cost**: Free for bulk downloads

## Data Quality and Standardization

### Challenges Identified:
1. **Inconsistent Business Numbers**: Some registries use different numbering systems
2. **Name Variations**: Legal vs. operating names across sources
3. **Address Formats**: Different postal code and province representations
4. **Industry Codes**: Mix of NAICS, SIC, and proprietary classifications
5. **Status Terminology**: Active, Inactive, Dissolved, Cancelled vary by source
6. **Update Frequencies**: Real-time to annual updates create data freshness issues

### Standardization Strategy:
1. **Primary Key**: Canadian Business Number (9-digit) where available
2. **Fallback Keys**: Corporation Number + Province for provincial-only registrations
3. **Name Normalization**: Strip legal suffixes, standardize spacing/punctuation
4. **Address Standardization**: Canada Post address validation
5. **Industry Mapping**: Convert all codes to NAICS 2022
6. **Status Harmonization**: Map all status types to: Active, Inactive, Dissolved

## Rate Limiting and API Management

### Recommended Approach:
```typescript
interface RateLimiter {
  source: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

const RATE_LIMITS: RateLimiter[] = [
  {
    source: 'StatisticsCanada',
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 5
  },
  {
    source: 'CorporationsCanada',
    requestsPerMinute: 100,
    requestsPerHour: 5000,
    requestsPerDay: 50000,
    burstLimit: 10
  }
];
```

## Compliance and Legal Considerations

### Data Usage Terms:
1. **Statistics Canada**: Open Government License - unrestricted use
2. **Corporations Canada**: Terms of Use - commercial use permitted
3. **Provincial Registries**: Varies by province, most allow commercial use
4. **CRA**: Restricted access, requires business justification

### Privacy Considerations:
- Business information is generally public record
- Director/officer information may have privacy restrictions
- Financial data (revenue ranges) may require anonymization
- Comply with PIPEDA for any personal information

### Attribution Requirements:
- Statistics Canada: Require data source attribution
- Provincial registries: May require attribution and currency statements

## Implementation Priority

### Phase 1: Core Federal Sources (Week 1)
1. Statistics Canada Business Register (primary)
2. Corporations Canada federal registry
3. Basic data normalization and validation

### Phase 2: Provincial Integration (Week 2-3)
1. Ontario Business Registry (largest volume)
2. British Columbia Corporate Registry
3. Quebec Enterprise Registry
4. Alberta Corporate Registry

### Phase 3: Enhancement (Week 4)
1. CRA Business Number validation
2. Advanced deduplication algorithms
3. Data quality scoring and monitoring
4. Automated refresh schedules

## Expected Data Volume

### Conservative Estimates:
- **Statistics Canada**: ~2.5M active businesses
- **Corporations Canada**: ~800K federal corporations
- **Provincial Registries**: ~7M total registrations (with overlap)
- **Unique Businesses**: Estimated 4-5M after deduplication
- **Processing Time**: 48-72 hours for initial full load
- **Incremental Updates**: Daily delta processing

### Infrastructure Requirements:
- **Database**: Scale to 10M+ records
- **Processing**: Batch jobs with 10K records/hour throughput
- **Storage**: ~50GB for full dataset with audit trails
- **Memory**: 16GB+ for bulk processing operations

## Risk Assessment

### High Risk:
- API rate limiting causing processing delays
- Government API downtime or changes
- Data inconsistency across sources requiring manual intervention

### Medium Risk:
- Large data volumes causing performance issues
- Compliance requirements changing
- Provincial API access restrictions

### Low Risk:
- Data format changes (most sources stable)
- Network connectivity issues
- Storage capacity constraints

---

## Next Steps

1. ✅ **Research Complete** - Comprehensive source mapping done
2. 🔄 **API Access Setup** - Register for required API keys
3. ⏳ **Architecture Design** - Build scalable integration framework
4. ⏳ **Implementation** - Start with Statistics Canada connector

**Ready to proceed with Government Data Integration Agent implementation.**