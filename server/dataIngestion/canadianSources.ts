
export interface DataSource {
  name: string;
  url: string;
  type: 'api' | 'csv' | 'json';
  rateLimit: number; // requests per minute
  fields: {
    companyName: string;
    businessNumber: string; // Canadian equivalent of Tax ID
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
}

export const CANADIAN_DATA_SOURCES: DataSource[] = [
  {
    name: 'Statistics Canada Business Data',
    url: 'https://www150.statcan.gc.ca/n1/en/pub/21-26-0003/2023001/ODBus_2023.zip?st=YxUgJ0IE', // Actual public URL from Statistics Canada
    type: 'zip', // This is a ZIP file containing business data
    rateLimit: 60,
    fields: {
      companyName: 'business_name',
      businessNumber: 'business_number',
      address: 'business_address',
      city: 'city',
      province: 'province',
      postalCode: 'postal_code'
    }
  },
  {
    name: 'Corporations Canada Open Data',
    url: 'https://ised-isde.canada.ca/cc/lgcy/download/OPEN_DATA_SPLIT.zip', // Actual public URL for federal corporations
    type: 'zip',
    rateLimit: 60,
    fields: {
      companyName: 'corpName',
      businessNumber: 'corpNum',
      address: 'regOffAddr',
      city: 'city',
      province: 'province',
      postalCode: 'postalCd'
    }
  },
  {
    name: 'Canada Business Registry',
    url: 'https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/hm.html',
    type: 'api',
    rateLimit: 30,
    fields: {
      companyName: 'legalName',
      businessNumber: 'businessNumber',
      address: 'address',
      city: 'city',
      province: 'provinceTerritory',
      postalCode: 'postalCode'
    }
  },
  {
    name: 'OpenCorporates Canada API',
    url: 'https://api.opencorporates.com/v0.4/companies/search', // Example API endpoint
    type: 'api',
    rateLimit: 100, // Free tier limit
    fields: {
      companyName: 'company_name',
      businessNumber: 'company_number',
      address: 'registered_address',
      jurisdiction_code: 'CA' // Canada jurisdiction
    }
  }
];

export const PROVINCIAL_SOURCES: DataSource[] = [
  {
    name: 'Ontario Business Registry',
    // NOTE: Ontario Business Registry data requires official partnership/authorization
    // This is NOT a public data source. See docs/ontario-business-registry-import-guide.md
    url: 'https://www.obrpartner.mgcs.gov.on.ca/', // Partner portal URL
    type: 'api', // Access through partner API, not direct CSV
    rateLimit: 60,
    fields: {
      companyName: 'business_name',
      businessNumber: 'business_number',
      address: 'business_address',
      city: 'city',
      province: 'province',
      postalCode: 'postal_code'
    }
  },
  {
    name: 'Ontario Open Data - Business Licenses',
    url: 'https://data.ontario.ca/en/dataset/licence-and-registration-data/resource/dummy-csv-file.csv', // Placeholder - actual URL to be determined
    type: 'csv',
    rateLimit: 60,
    fields: {
      companyName: 'business_name',
      businessNumber: 'license_number',
      address: 'business_address',
      city: 'city',
      province: 'province',
      postalCode: 'postal_code'
    }
  },
  {
    name: 'BC Corporate Registry',
    url: 'https://www2.gov.bc.ca/gov/content/data/finding-and-sharing/data-distribution-services', // Actual BC data services
    type: 'csv',
    rateLimit: 60,
    fields: {
      companyName: 'business_name',
      businessNumber: 'business_number',
      address: 'business_address',
      city: 'city',
      province: 'province',
      postalCode: 'postal_code'
    }
  },
  {
    name: 'Quebec Enterprise Registry',
    url: 'https://www.registreentreprises.gouv.qc.ca/en/', // Placeholder URL
    type: 'api',
    rateLimit: 30,
    fields: {
      companyName: 'business_name',
      businessNumber: 'business_number',
      address: 'business_address',
      city: 'city',
      province: 'province',
      postalCode: 'postal_code'
    }
  }
];
