import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { DataSource } from '../canadianSources';
import { DownloadResult } from './sourceManager';

/**
 * Handles web scraping for sources that don't provide direct downloads
 */
export class WebScraper {
  private rateLimiters = new Map<string, { lastRequest: number; requestCount: number }>();

  async scrape(source: DataSource): Promise<DownloadResult> {
    try {
      // Check rate limits
      if (!this.checkRateLimit(source.name, 10)) { // Default to 10 requests per minute for scraping
        throw new Error(`Rate limit exceeded for ${source.name}`);
      }

      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Canadian-Data-Ingestion-System/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Use JSDOM to parse the HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Extract data based on the source configuration
      const records = this.extractDataFromDOM(document, source);
      const recordsProcessed = records.length;
      
      // Update rate limiter
      this.updateRateLimit(source.name);
      
      return {
        sourceName: source.name,
        success: true,
        recordsProcessed,
        errors: [],
        downloadTime: 0 // Will be added by caller
      };
    } catch (error) {
      return {
        sourceName: source.name,
        success: false,
        recordsProcessed: 0,
        errors: [error.message],
        downloadTime: 0 // Will be added by caller
      };
    }
  }

  /**
   * Advanced scraping method for paginated content
   */
  async scrapePaginated(source: DataSource, maxPages: number = 5): Promise<DownloadResult> {
    try {
      let allRecords: any[] = [];
      let currentPage = 1;
      
      while (currentPage <= maxPages) {
        // Check rate limits
        if (!this.checkRateLimit(source.name, 5)) { // More conservative rate for paginated scraping
          throw new Error(`Rate limit exceeded for ${source.name}`);
        }
        
        const pageUrl = this.buildPageUrl(source.url, currentPage);
        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Canadian-Data-Ingestion-System/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            // No more pages
            break;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        const pageRecords = this.extractDataFromDOM(document, source);
        allRecords = allRecords.concat(pageRecords);
        
        // If no records found on this page, assume no more pages
        if (pageRecords.length === 0) {
          break;
        }
        
        // Update rate limiter
        this.updateRateLimit(source.name);
        
        currentPage++;
      }
      
      return {
        sourceName: source.name,
        success: true,
        recordsProcessed: allRecords.length,
        errors: [],
        downloadTime: 0 // Will be added by caller
      };
    } catch (error) {
      return {
        sourceName: source.name,
        success: false,
        recordsProcessed: 0,
        errors: [error.message],
        downloadTime: 0 // Will be added by caller
      };
    }
  }

  private extractDataFromDOM(document: Document, source: DataSource): any[] {
    // This is a simplified extraction - in a real implementation, this would be more sophisticated
    // and tailored to each specific website's structure
    
    const records: any[] = [];
    
    // Look for common patterns for business data on web pages
    
    // If specific selectors are defined in the source config, use them
    if (source.type === 'web' && (source as any).selectors) {
      const selectors: { [key: string]: string } = (source as any).selectors;
      
      // Find all business entries based on a container selector
      const containerSelector = selectors.container || 'div, li, tr';
      const containers = document.querySelectorAll(containerSelector);
      
      for (const container of Array.from(containers)) {
        const record: any = {};
        
        // Extract each field using its specific selector
        for (const [field, selector] of Object.entries(selectors)) {
          if (field !== 'container') {
            const element = container.querySelector(selector);
            if (element) {
              record[field] = element.textContent?.trim() || '';
            }
          }
        }
        
        if (Object.keys(record).length > 0) {
          records.push(record);
        }
      }
    } else {
      // Generic extraction looking for common business data patterns
      records.push(...this.extractGenericBusinessData(document));
    }
    
    return records;
  }

  private extractGenericBusinessData(document: Document): any[] {
    const records: any[] = [];
    
    // Look for elements that might contain business information
    // Common patterns on business registry pages
    
    // Look for table rows that might contain business data
    const rows = document.querySelectorAll('tr');
    for (const row of Array.from(rows)) {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 3) { // At least name, number, and location
        const record: any = {};
        const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
        
        // Try to map generic cells to business fields based on common patterns
        if (cellTexts.length >= 1) record.companyName = cellTexts[0];
        if (cellTexts.length >= 2) record.businessNumber = cellTexts[1];
        if (cellTexts.length >= 3) record.address = cellTexts[2];
        
        records.push(record);
      }
    }
    
    // Also look for definition lists or other common patterns
    const definitions = document.querySelectorAll('dl');
    for (const dl of Array.from(definitions)) {
      const record: any = {};
      const dtElements = dl.querySelectorAll('dt');
      const ddElements = dl.querySelectorAll('dd');
      
      for (let i = 0; i < Math.min(dtElements.length, ddElements.length); i++) {
        const key = dtElements[i].textContent?.trim().toLowerCase() || '';
        const value = ddElements[i].textContent?.trim() || '';
        
        // Map common keys to business fields
        if (key.includes('name') || key.includes('company')) {
          record.companyName = value;
        } else if (key.includes('number') || key.includes('id')) {
          record.businessNumber = value;
        } else if (key.includes('address') || key.includes('location')) {
          record.address = value;
        } else if (key.includes('city')) {
          record.city = value;
        }
      }
      
      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    }
    
    return records;
  }

  private buildPageUrl(baseUrl: string, pageNumber: number): string {
    // Simple pagination builder - in real implementation, this would be more sophisticated
    // and specific to each site's pagination pattern
    if (baseUrl.includes('?')) {
      return `${baseUrl}&page=${pageNumber}`;
    } else {
      return `${baseUrl}?page=${pageNumber}`;
    }
  }

  private checkRateLimit(sourceName: string, limitPerMinute: number): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(sourceName) || { lastRequest: 0, requestCount: 0 };

    // Reset count every minute
    if (now - limiter.lastRequest > 60000) {
      limiter.requestCount = 0;
    }

    if (limiter.requestCount >= limitPerMinute) {
      return false;
    }

    return true;
  }

  private updateRateLimit(sourceName: string): void {
    const now = Date.now();
    const limiter = this.rateLimiters.get(sourceName) || { lastRequest: 0, requestCount: 0 };

    // Reset count every minute
    if (now - limiter.lastRequest > 60000) {
      limiter.requestCount = 0;
    }

    limiter.requestCount++;
    limiter.lastRequest = now;
    this.rateLimiters.set(sourceName, limiter);
  }
}