
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
    name: 'Corporations Canada',
    url: 'https://open.canada.ca/data/en/dataset/0032ce54-c5dd-4b66-99a0-320a7b934e07',
    type: 'csv',
    rateLimit: 60,
    fields: {
      companyName: 'Corporation Name',
      businessNumber: 'Corporation Number',
      address: 'Registered Office Address',
      city: 'City',
      province: 'Province',
      postalCode: 'Postal Code'
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
    name: 'Statistics Canada Business Register',
    url: 'https://open.canada.ca/data/en/dataset/1fd4d789-0e86-4526-9cd3-3d06d4c4c5a3',
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
  }
];

export const PROVINCIAL_SOURCES = [
  {
    province: 'Ontario',
    name: 'Ontario Business Registry',
    url: 'https://data.ontario.ca/dataset/ontario-business-registry',
    type: 'csv' as const,
    rateLimit: 60
  },
  {
    province: 'British Columbia',
    name: 'BC Corporate Registry',
    url: 'https://www.bcregistry.gov.bc.ca/open-data',
    type: 'csv' as const,
    rateLimit: 60
  },
  {
    province: 'Quebec',
    name: 'Quebec Enterprise Registry',
    url: 'https://www.registreentreprises.gouv.qc.ca/en/',
    type: 'api' as const,
    rateLimit: 30
  }
];
