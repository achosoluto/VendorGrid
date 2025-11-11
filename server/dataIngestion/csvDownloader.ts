import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import fetch from 'node-fetch';
import csv from 'csv-parser';

/**
 * Utility for downloading and processing CSV files from various Canadian government sources
 */
export class CSVDownloader {
  /**
   * Downloads a CSV file from the provided URL and saves it locally
   */
  async downloadCSV(url: string, localPath: string): Promise<void> {
    console.log(`Downloading CSV from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download CSV: ${response.status} - ${response.statusText}`);
    }
    
    // Ensure directory exists
    const directory = path.dirname(localPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    const fileStream = fs.createWriteStream(localPath);
    await finished(Readable.fromWeb(response.body as any).pipe(fileStream));
    
    console.log(`CSV downloaded successfully to: ${localPath}`);
  }

  /**
   * Streams and parses a CSV file from URL directly without saving to disk
   */
  async streamAndParseCSV<T = any>(url: string, options?: { headers?: boolean }): Promise<T[]> {
    console.log(`Streaming and parsing CSV from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} - ${response.statusText}`);
    }
    
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      const stream = Readable.from(response.body);
      
      stream
        .pipe(csv({ headers: options?.headers }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          console.log(`Parsed ${results.length} records from CSV`);
          resolve(results);
        })
        .on('error', reject);
    });
  }

  /**
   * Parses a locally saved CSV file
   */
  async parseLocalCSV<T = any>(localPath: string, options?: { headers?: boolean }): Promise<T[]> {
    if (!fs.existsSync(localPath)) {
      throw new Error(`CSV file does not exist: ${localPath}`);
    }
    
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      fs.createReadStream(localPath)
        .pipe(csv({ headers: options?.headers }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          console.log(`Parsed ${results.length} records from local CSV: ${localPath}`);
          resolve(results);
        })
        .on('error', reject);
    });
  }
  
  /**
   * Checks if a file exists at the given path
   */
  fileExists(localPath: string): boolean {
    return fs.existsSync(localPath);
  }
  
  /**
   * Gets file size in bytes
   */
  getFileSize(localPath: string): number {
    if (!this.fileExists(localPath)) {
      throw new Error(`File does not exist: ${localPath}`);
    }
    const stats = fs.statSync(localPath);
    return stats.size;
  }
}