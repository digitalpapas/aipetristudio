/**
 * Safe storage utility functions to handle localStorage quota exceeded errors
 */

interface StorageData {
  updatedAt: string;
  [key: string]: any;
}

export class SafeStorage {
  private static MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit
  
  static safeSetItem(key: string, value: any, useSession = false): boolean {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Check if we're close to quota limit before setting
      if (!useSession && this.getStorageSize() + serializedValue.length > this.MAX_STORAGE_SIZE) {
        this.cleanupOldData();
      }
      
      storage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.warn(`Storage quota exceeded for key: ${key}`);
      
      if (!useSession) {
        // Try to free up space and retry once
        this.cleanupOldData();
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          return true;
        } catch (retryError) {
          console.warn(`Failed to store ${key} even after cleanup`);
        }
      }
      return false;
    }
  }

  static safeGetItem(key: string, useSession = false): string | null {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      return storage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get from storage: ${key}`);
      return null;
    }
  }

  static safeRemoveItem(key: string, useSession = false): boolean {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove from storage: ${key}`);
      return false;
    }
  }

  static getStorageSize(): number {
    let total = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += (localStorage[key].length + key.length);
        }
      }
    } catch (error) {
      console.warn('Failed to calculate storage size');
    }
    return total;
  }

  static cleanupOldData(): void {
    try {
      const keys = Object.keys(localStorage);
      const dataKeys: Array<{key: string, date: Date}> = [];
      
      keys.forEach(key => {
        try {
          // Try to parse stored data to check for timestamp
          const data = localStorage.getItem(key);
          if (data) {
            let parsedData: any;
            try {
              parsedData = JSON.parse(data);
            } catch {
              // If not JSON, check if it's old by key pattern
              if (key.includes('segment-analysis-') || key.includes('bookmarks-count-')) {
                dataKeys.push({ key, date: new Date(0) }); // Very old date for non-timestamped data
              }
              return;
            }
            
            if (parsedData && parsedData.updatedAt) {
              dataKeys.push({ key, date: new Date(parsedData.updatedAt) });
            } else if (key.includes('segment-analysis-') || key.includes('bookmarks-count-')) {
              // Remove non-timestamped analysis data
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted keys
          try {
            localStorage.removeItem(key);
          } catch (removeError) {
            console.warn(`Failed to remove corrupted key: ${key}`);
          }
        }
      });
      
      // Sort by date and remove oldest items if we have too many
      if (dataKeys.length > 50) {
        dataKeys.sort((a, b) => a.date.getTime() - b.date.getTime());
        const toRemove = dataKeys.slice(0, dataKeys.length - 30); // Keep only 30 most recent
        
        toRemove.forEach(item => {
          try {
            localStorage.removeItem(item.key);
          } catch (error) {
            console.warn(`Failed to remove old data: ${item.key}`);
          }
        });
      }
      
    } catch (error) {
      console.warn('Failed to cleanup old data:', error);
      
      // Last resort: clear all non-essential data
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('segment-analysis-') || key.includes('bookmarks-count-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (clearError) {
        console.warn('Failed to clear storage data');
      }
    }
  }

  /**
   * Store data with automatic timestamping
   */
  static setWithTimestamp(key: string, data: any, useSession = false): boolean {
    const timestampedData: StorageData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    return this.safeSetItem(key, timestampedData, useSession);
  }

  /**
   * Get data and return null if older than maxAge (in milliseconds)
   */
  static getWithExpiry(key: string, maxAge?: number, useSession = false): any {
    const data = this.safeGetItem(key, useSession);
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data);
      if (maxAge && parsed.updatedAt) {
        const age = Date.now() - new Date(parsed.updatedAt).getTime();
        if (age > maxAge) {
          this.safeRemoveItem(key, useSession);
          return null;
        }
      }
      return parsed;
    } catch (error) {
      return data; // Return raw string if not JSON
    }
  }
}