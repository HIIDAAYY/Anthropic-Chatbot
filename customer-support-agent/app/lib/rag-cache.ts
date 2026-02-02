/**
 * RAG Context Cache
 * Caches RAG retrieval results to reduce latency (500ms-2000ms per query)
 * TTL: 30 minutes (shorter than response cache to allow KB updates)
 */

import { logger } from './logger';

interface RAGSource {
  id: string;
  fileName: string;
  snippet: string;
  score: number;
}

interface RAGCacheEntry {
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
  timestamp: number;
}

class RAGCache {
  private cache: Map<string, RAGCacheEntry> = new Map();
  private readonly TTL = 1800000; // 30 minutes in milliseconds
  private hits = 0;
  private misses = 0;

  /**
   * Generate cache key from KB ID and query
   */
  private generateKey(
    knowledgeBaseId: string | { kb: string; clinicId: string | null } | undefined,
    query: string
  ): string {
    const normalizedQuery = query.toLowerCase().trim();

    // Handle different KB ID formats
    let kbKey = 'default';
    if (typeof knowledgeBaseId === 'object' && knowledgeBaseId !== null && 'kb' in knowledgeBaseId) {
      kbKey = `${knowledgeBaseId.kb}|${knowledgeBaseId.clinicId || 'all'}`;
    } else if (typeof knowledgeBaseId === 'string') {
      kbKey = knowledgeBaseId;
    }

    return `${kbKey}|${normalizedQuery}`;
  }

  /**
   * Get cached RAG result if available and fresh
   */
  get(
    knowledgeBaseId: string | { kb: string; clinicId: string | null } | undefined,
    query: string
  ): RAGCacheEntry | null {
    const key = this.generateKey(knowledgeBaseId, query);
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
      logger.debug('RAG cache expired', {
        query: query.slice(0, 50),
        ageMinutes: Math.round(age / 60000)
      });
      return null;
    }

    // Cache hit!
    this.hits++;
    const hitRate = (this.hits / (this.hits + this.misses) * 100).toFixed(1);
    logger.debug('RAG cache HIT - saved RAG latency', {
      hitRate: `${hitRate}%`,
      ageMinutes: Math.round(age / 60000),
      sourcesCount: entry.ragSources.length
    });

    return entry;
  }

  /**
   * Store RAG result in cache
   */
  set(
    knowledgeBaseId: string | { kb: string; clinicId: string | null } | undefined,
    query: string,
    result: { context: string; isRagWorking: boolean; ragSources: RAGSource[] }
  ): void {
    const key = this.generateKey(knowledgeBaseId, query);
    this.cache.set(key, {
      ...result,
      timestamp: Date.now(),
    });
    logger.debug('Cached RAG result', {
      query: query.slice(0, 50),
      sourcesCount: result.ragSources.length
    });
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
    logger.info('RAG cache cleared');
  }

  /**
   * Remove expired entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
        removedCount++;
      }
    });

    if (removedCount > 0) {
      logger.info('Cleaned up expired RAG cache entries', { count: removedCount });
    }
  }
}

// Export singleton instance
export const ragCache = new RAGCache();

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    ragCache.cleanup();
  }, 600000);
}
