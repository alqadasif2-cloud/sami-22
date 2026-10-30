/**
 * Firestore Read Operations Tracker and Telemetry Service
 * Measures and logs Firestore read operations, cache hit ratios, query frequencies,
 * and tracks circuit-breaker activations for quota defense.
 * 
 * STRICT PRIVACY: Never records message bodies, passwords, tokens, or PII.
 */

export interface ReadOperationMetric {
  caller: string;
  collection: string;
  operationType: 'getDoc' | 'getDocs' | 'query' | 'rest_runQuery' | 'cache_hit';
  count: number;
  docsReturned: number;
  lastExecutedAt: number;
  errorsCount: number;
  lastError?: string;
}

class FirestoreMetricsTracker {
  private operations = new Map<string, ReadOperationMetric>();
  private totalDirectCloudReads = 0;
  private totalCacheHits = 0;
  private totalQuotaExceededErrors = 0;
  private circuitBreakerActive = false;
  private circuitBreakerUntil = 0;
  private startTime = Date.now();

  /**
   * Records a read attempt or cache hit
   */
  public recordRead(
    caller: string,
    collection: string,
    opType: 'getDoc' | 'getDocs' | 'query' | 'rest_runQuery' | 'cache_hit',
    docsReturned: number = 1,
    fromCache: boolean = false
  ) {
    const key = `${caller}::${collection}::${opType}`;
    const existing = this.operations.get(key) || {
      caller,
      collection,
      operationType: opType,
      count: 0,
      docsReturned: 0,
      lastExecutedAt: 0,
      errorsCount: 0,
    };

    existing.count += 1;
    existing.docsReturned += docsReturned;
    existing.lastExecutedAt = Date.now();
    this.operations.set(key, existing);

    if (fromCache || opType === 'cache_hit') {
      this.totalCacheHits += docsReturned;
    } else {
      this.totalDirectCloudReads += docsReturned;
    }
  }

  /**
   * Records an error encountered during a Firestore operation
   */
  public recordError(caller: string, collection: string, error: any) {
    const key = `${caller}::${collection}::query`;
    const existing = this.operations.get(key) || {
      caller,
      collection,
      operationType: 'query',
      count: 1,
      docsReturned: 0,
      lastExecutedAt: Date.now(),
      errorsCount: 0,
    };

    existing.errorsCount += 1;
    const msg = error?.message || String(error);
    existing.lastError = msg.substring(0, 120);
    this.operations.set(key, existing);

    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota') || msg.includes('429')) {
      this.totalQuotaExceededErrors += 1;
    }
  }

  public setCircuitBreaker(untilTimestamp: number) {
    this.circuitBreakerActive = true;
    this.circuitBreakerUntil = Math.max(this.circuitBreakerUntil, untilTimestamp);
  }

  public isCircuitBreakerActive(): boolean {
    if (this.circuitBreakerActive && Date.now() >= this.circuitBreakerUntil) {
      this.circuitBreakerActive = false;
    }
    return this.circuitBreakerActive;
  }

  public getCircuitBreakerUntil(): number {
    return this.circuitBreakerUntil;
  }

  public getSummaryReport() {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const opsList = Array.from(this.operations.values()).sort((a, b) => b.count - a.count);
    const cacheHitPercentage =
      this.totalDirectCloudReads + this.totalCacheHits > 0
        ? ((this.totalCacheHits / (this.totalDirectCloudReads + this.totalCacheHits)) * 100).toFixed(1) + '%'
        : '0%';

    return {
      uptimeSeconds: uptimeSec,
      totalDirectCloudReads: this.totalDirectCloudReads,
      totalCacheHits: this.totalCacheHits,
      cacheHitRatio: cacheHitPercentage,
      totalQuotaErrorsEncountered: this.totalQuotaExceededErrors,
      circuitBreaker: {
        active: this.isCircuitBreakerActive(),
        cooldownRemainingSeconds: Math.max(0, Math.ceil((this.circuitBreakerUntil - Date.now()) / 1000)),
      },
      operationsBreakdown: opsList.map((op) => ({
        caller: op.caller,
        collection: op.collection,
        type: op.operationType,
        callCount: op.count,
        documentsReturned: op.docsReturned,
        errors: op.errorsCount,
        lastError: op.lastError,
        lastExecutedAgoSec: Math.floor((Date.now() - op.lastExecutedAt) / 1000),
      })),
    };
  }
}

export const firestoreMetrics = new FirestoreMetricsTracker();
