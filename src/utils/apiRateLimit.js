// Global API request rate limiting utility
const RATE_LIMIT_KEY = 'nasa_api_hourly_count';
const MAX_REQUESTS_PER_HOUR = 800; // Conservative limit (200 below the actual 1000 limit)

class APIRateLimit {
  constructor() {
    this.requestCount = this.getStoredCount();
    this.lastResetTime = this.getLastResetTime();
    this.checkAndResetIfNeeded();
  }

  getStoredCount() {
    try {
      const stored = localStorage.getItem(RATE_LIMIT_KEY);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  getLastResetTime() {
    try {
      const stored = localStorage.getItem(`${RATE_LIMIT_KEY}_reset_time`);
      return stored ? parseInt(stored, 10) || Date.now() : Date.now();
    } catch {
      return Date.now();
    }
  }

  setStoredCount(count) {
    try {
      localStorage.setItem(RATE_LIMIT_KEY, count.toString());
    } catch {
      // Ignore localStorage errors
    }
  }

  setLastResetTime(time) {
    try {
      localStorage.setItem(`${RATE_LIMIT_KEY}_reset_time`, time.toString());
    } catch {
      // Ignore localStorage errors
    }
  }

  checkAndResetIfNeeded() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - this.lastResetTime >= oneHour) {
      this.requestCount = 0;
      this.lastResetTime = now;
      this.setStoredCount(0);
      this.setLastResetTime(now);
    }
  }

  canMakeRequest() {
    this.checkAndResetIfNeeded();
    return this.requestCount < MAX_REQUESTS_PER_HOUR;
  }

  incrementCounter() {
    this.checkAndResetIfNeeded();
    this.requestCount++;
    this.setStoredCount(this.requestCount);
  }

  getRemainingRequests() {
    this.checkAndResetIfNeeded();
    return Math.max(0, MAX_REQUESTS_PER_HOUR - this.requestCount);
  }

  getResetTimeRemaining() {
    this.checkAndResetIfNeeded();
    const oneHour = 60 * 60 * 1000;
    const resetTime = this.lastResetTime + oneHour;
    return Math.max(0, resetTime - Date.now());
  }
}

// Global instance
const apiRateLimit = new APIRateLimit();

export default apiRateLimit;