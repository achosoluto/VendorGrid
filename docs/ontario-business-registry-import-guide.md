# Ontario Business Registry Data Import Guide

This guide explains how to import data from the Ontario Business Registry.

## Important Notice: Data Access Requirements

The Ontario Business Registry data is **not available as a public CSV download**. This data is protected and requires specific authorization for access. Business registry information is sensitive and contains details about registered businesses that are not meant for public bulk access without proper authorization.

## Proper Access Procedures

To obtain access to Ontario Business Registry data, you need to:

1. **Visit the Ontario Business Registry Partner Portal**:
   - Go to: https://www.obrpartner.mgcs.gov.on.ca/
   - This is the official partner access point for the Ontario Business Registry

2. **Apply for Partner Access**:
   - You may need to register as an official partner with the Ontario government
   - A "Company Key" or other authorization may be required
   - Contact information for partnership inquiries can typically be found on the partner portal

3. **Understand the Access Requirements**:
   - There may be business justification requirements
   - Terms of use and data privacy agreements will apply
   - Specific technical access procedures may be required

## Alternative Data Sources

If you need Canadian business data for development/testing purposes, consider:

1. **Statistics Canada Business Register** - This is already implemented in the system
2. **Open Corporates** - Provides business registry data through API (https://opencorporates.com/registers/197)
3. **Sample data** - Create a sample dataset for testing the import functionality

## Using a Local CSV File (for testing)

If you have obtained authorization and received a CSV file, you can import it directly:

```bash
# Using the local file import
npm run dev -- server/dataIngestion/ontarioBusinessRegistryImporter.ts /path/to/your/authorized/business-registry.csv
```

## Expected CSV Format

When you receive authorized access, the CSV is expected to contain columns with business information. Common expected fields include:
- Business Name
- Business Number (or Registration Number)
- Address
- City
- Province
- Postal Code
- Phone Number
- Email
- Website

## Troubleshooting

- If field names don't match exactly, the system will try common variations (uppercase, lowercase, with underscores, etc.)
- Ensure the CSV file has proper headers
- Large files may take time to process
- Check logs for any errors during processing

## Legal and Compliance Considerations

When working with business registry data:
- Ensure you have proper authorization for data access
- Comply with Ontario's privacy laws and regulations
- Respect data usage terms and conditions
- Maintain data security standards

## Next Steps

1. Contact the Ontario government through official channels to inquire about partnership or API access
2. If you already have authorized access to the data, use the local file import method
3. Consider using the existing Statistics Canada Business Register functionality as a starting point
4. The import system is ready to process the data once you have proper authorization