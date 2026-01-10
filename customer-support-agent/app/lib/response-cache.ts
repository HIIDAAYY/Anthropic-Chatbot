/**
 * Simple in-memory response cache for Claude API calls
 * Caches responses for identical queries per clinic
 * TTL: 1 hour (configurable)
 */

interface CacheEntry {
  response: any;
  timestamp: number;
  tokensInput: number;
  tokensOutput: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 3600000; // 1 hour in milliseconds
  private hits = 0;
  private misses = 0;

  /**
   * Generate cache key from clinic and query
   */
  private generateKey(clinicId: string | null, query: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    return `${clinicId || 'default'}|${normalizedQuery}`;
  }

  /**
   * Get cached response if available and fresh
   */
  get(clinicId: string | null, query: string): any | null {
    const key = this.generateKey(clinicId, query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.TTL) {
      this.cache.delete(key);
      this.misses++;
      console.log(`⏰ Cache expired for: "${query.slice(0, 50)}..." (age: ${Math.round(age / 60000)}min)`);
      return null;
    }

    // Cache hit!
    this.hits++;
    const hitRate = (this.hits / (this.hits + this.misses) * 100).toFixed(1);
    console.log(`✅ Cache HIT (${hitRate}% hit rate) - Saved $${this.calculateSavings(entry)}`);
    console.log(`   Query: "${query.slice(0, 50)}..."`);
    console.log(`   Age: ${Math.round(age / 60000)} minutes`);

    return entry.response;
  }

  /**
   * Store response in cache
   */
  set(
    clinicId: string | null,
    query: string,
    response: any,
    tokensInput: number = 0,
    tokensOutput: number = 0
  ): void {
    const key = this.generateKey(clinicId, query);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      tokensInput,
      tokensOutput,
    });
    console.log(`💾 Cached response for: "${query.slice(0, 50)}..."`);
  }

  /**
   * Calculate cost savings from cached response
   */
  private calculateSavings(entry: CacheEntry): string {
    const inputCost = entry.tokensInput * 0.000001; // $1/M tokens
    const outputCost = entry.tokensOutput * 0.000005; // $5/M tokens
    return (inputCost + outputCost).toFixed(6);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.hits + this.misses > 0
      ? (this.hits / (this.hits + this.misses) * 100).toFixed(1)
      : '0';

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.log('🗑️  Cache cleared');
  }

  /**
   * Remove expired entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    // Use Array.from for TypeScript compatibility
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
  }
}

// Export singleton instance
export const responseCache = new ResponseCache();

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    responseCache.cleanup();
  }, 600000);
}
