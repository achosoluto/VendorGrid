/**
 * Data Sanitization Utility
 * Provides functions to sanitize and validate data before database operations
 */

export class DataSanitization {
  /**
   * Sanitize string values for safe database insertion
   */
  static sanitizeForDatabase(input: string | null | undefined): string {
    if (!input) return input as string;
    
    // Escape special characters that could interfere with SQL
    return input
      .replace(/'/g, "''") // Escape single quotes for SQLite
      .replace(/\\/g, "\\\\") // Escape backslashes
      .trim();
  }

  /**
   * Validate string doesn't contain problematic characters
   */
  static validateSpecialCharacters(input: string): { isValid: boolean; error?: string } {
    if (!input) return { isValid: true };
    
    // Check for potentially problematic character sequences
    if (input.includes("';") || input.includes('";') || input.includes(');')) {
      return { 
        isValid: false, 
        error: 'Input contains potentially unsafe character sequences' 
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Sanitize business name specifically
   */
  static sanitizeBusinessName(name: string): string {
    if (!name) return name;
    
    // Sanitize the name for database storage
    return this.sanitizeForDatabase(name);
  }
  
  /**
   * Sanitize address specifically
   */
  static sanitizeAddress(address: string): string {
    if (!address) return address;
    
    // Sanitize the address for database storage
    return this.sanitizeForDatabase(address);
  }
  
  /**
   * Sanitize postal code specifically
   */
  static sanitizePostalCode(code: string): string {
    if (!code) return code;
    
    // Sanitize the postal code for database storage
    return this.sanitizeForDatabase(code);
  }
}