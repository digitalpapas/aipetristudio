/**
 * Safe localStorage wrapper with quota management and cleanup
 */

interface StorageItem {
  value: any;
  timestamp: number;
  expires?: number;
}

class SafeStorage {
  private maxSizeBytes = 4 * 1024 * 1024; // 4MB limit to stay safe
  private cleanupThreshold = 0.8; // Cleanup when 80% full

  /**
   * Estimate localStorage usage in bytes
   */
  private getStorageSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Get all storage items with metadata
   */
  private getAllItems(): Array<{key: string; item: StorageItem; size: number}> {
    const items: Array<{key: string; item: StorageItem; size: number}> = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        try {
          const rawValue = localStorage[key];
          let item: StorageItem;
          
          // Try to parse as our wrapped format first
          try {
            const parsed = JSON.parse(rawValue);
            if (parsed && typeof parsed === 'object' && 'timestamp' in parsed) {
              item = parsed as StorageItem;
            } else {
              // Legacy format - wrap it
              item = {
                value: parsed,
                timestamp: Date.now()
              };
            }
          } catch {
            // Raw string - wrap it
            item = {
              value: rawValue,
              timestamp: Date.now()
            };
          }
          
          items.push({
            key,
            item,
            size: rawValue.length + key.length
          });
        } catch (e) {
          console.warn('Failed to process storage item:', key, e);
        }
      }
    }
    
    return items;
  }

  /**
   * Clean up old and expired items
   */
  private cleanup(): void {
    try {
      const items = this.getAllItems();
      const now = Date.now();
      let cleanedUp = false;

      // Remove expired items first
      items.forEach(({key, item}) => {
        if (item.expires && now > item.expires) {
          try {
            localStorage.removeItem(key);
            cleanedUp = true;
            console.log('Removed expired item:', key);
          } catch (e) {
            console.warn('Failed to remove expired item:', key);
          }
        }
      });

      // If still over threshold, remove oldest items
      const currentSize = this.getStorageSize();
      if (currentSize > this.maxSizeBytes * this.cleanupThreshold) {
        const remainingItems = this.getAllItems()
          .sort((a, b) => a.item.timestamp - b.item.timestamp); // Oldest first

        const targetSize = this.maxSizeBytes * 0.6; // Clean to 60%
        let currentSizeAfterCleanup = currentSize;

        for (const {key, size} of remainingItems) {
          if (currentSizeAfterCleanup <= targetSize) break;
          
          // Don't remove critical items
          if (this.isCriticalKey(key)) continue;

          try {
            localStorage.removeItem(key);
            currentSizeAfterCleanup -= size;
            cleanedUp = true;
            console.log('Removed old item to free space:', key);
          } catch (e) {
            console.warn('Failed to remove item during cleanup:', key);
          }
        }
      }

      if (cleanedUp) {
        console.log('Storage cleanup completed. New size:', this.getStorageSize(), 'bytes');
      }
    } catch (e) {
      console.error('Storage cleanup failed:', e);
    }
  }

  /**
   * Check if a key is critical and shouldn't be auto-removed
   */
  private isCriticalKey(key: string): boolean {
    const criticalPrefixes = [
      'auth-', 
      'user-',
      'pendingEmail',
      'last-segment-key'
    ];
    
    return criticalPrefixes.some(prefix => key.startsWith(prefix));
  }

  /**
   * Safely set an item with automatic cleanup
   */
  setItem(key: string, value: any, expiresIn?: number): boolean {
    try {
      const item: StorageItem = {
        value,
        timestamp: Date.now()
      };

      if (expiresIn) {
        item.expires = Date.now() + expiresIn;
      }

      const serialized = JSON.stringify(item);
      
      // Try to set the item
      try {
        localStorage.setItem(key, serialized);
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded, attempting cleanup...');
          
          // Cleanup and try again
          this.cleanup();
          
          try {
            localStorage.setItem(key, serialized);
            console.log('Successfully stored after cleanup:', key);
            return true;
          } catch (e2) {
            console.error('Still failed to store after cleanup:', key, e2);
            return false;
          }
        } else {
          console.error('Failed to store item:', key, e);
          return false;
        }
      }
    } catch (e) {
      console.error('Failed to serialize item:', key, e);
      return false;
    }
  }

  /**
   * Safely get an item
   */
  getItem(key: string): any {
    try {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null) return null;

      try {
        const parsed = JSON.parse(rawValue);
        
        // Check if it's our wrapped format
        if (parsed && typeof parsed === 'object' && 'timestamp' in parsed) {
          const item = parsed as StorageItem;
          
          // Check if expired
          if (item.expires && Date.now() > item.expires) {
            localStorage.removeItem(key);
            return null;
          }
          
          return item.value;
        } else {
          // Legacy format - return as is
          return parsed;
        }
      } catch {
        // Raw string value
        return rawValue;
      }
    } catch (e) {
      console.warn('Failed to get storage item:', key, e);
      return null;
    }
  }

  /**
   * Remove an item
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove item:', key, e);
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  getInfo(): {size: number; maxSize: number; usage: number} {
    const size = this.getStorageSize();
    return {
      size,
      maxSize: this.maxSizeBytes,
      usage: size / this.maxSizeBytes
    };
  }

  /**
   * Force cleanup
   */
  forceCleanup(): void {
    this.cleanup();
  }
}

// Export singleton instance
export const safeStorage = new SafeStorage();

// Fallback functions for when localStorage is not available
export const fallbackStorage = new Map<string, any>();

export function getStorageItem(key: string): any {
  if (safeStorage.isAvailable()) {
    return safeStorage.getItem(key);
  } else {
    return fallbackStorage.get(key) || null;
  }
}

export function setStorageItem(key: string, value: any, expiresIn?: number): boolean {
  if (safeStorage.isAvailable()) {
    return safeStorage.setItem(key, value, expiresIn);
  } else {
    fallbackStorage.set(key, value);
    return true;
  }
}

export function removeStorageItem(key: string): void {
  if (safeStorage.isAvailable()) {
    safeStorage.removeItem(key);
  } else {
    fallbackStorage.delete(key);
  }
}