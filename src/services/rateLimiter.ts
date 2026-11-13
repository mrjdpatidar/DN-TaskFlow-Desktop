/**
 * Client-Side Rate Limiter with Persistent Cooldown
 * Protects Google Login and Authentication attempts against spamming and rapid clicks.
 */

export interface RateLimitStatus {
  allowed: boolean;
  attemptsLeft: number;
  cooldownSeconds: number;
  message?: string;
}

export class RateLimiter {
  private key: string;
  private maxAttempts: number;
  private windowMs: number; // e.g. 60000ms = 1 minute
  private cooldownMs: number; // Lockout duration e.g. 30000ms = 30 seconds

  constructor(key = 'google_auth_rate_limit', maxAttempts = 5, windowMs = 60000, cooldownMs = 30000) {
    this.key = key;
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.cooldownMs = cooldownMs;
  }

  private getData(): { timestamps: number[]; lockedUntil?: number } {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return { timestamps: [] };
  }

  private saveData(data: { timestamps: number[]; lockedUntil?: number }): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }

  /**
   * Checks whether the action is currently permitted under rate limit rules.
   */
  public check(): RateLimitStatus {
    const now = Date.now();
    const data = this.getData();

    // Check if actively locked out in cooldown
    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return {
        allowed: false,
        attemptsLeft: 0,
        cooldownSeconds: remainingSeconds,
        message: `Too many attempts. Google sign-in is temporarily locked. Please wait ${remainingSeconds}s.`,
      };
    }

    // Filter out timestamps outside the active rolling window
    const validTimestamps = data.timestamps.filter((ts) => now - ts < this.windowMs);
    const attemptsLeft = Math.max(0, this.maxAttempts - validTimestamps.length);

    if (validTimestamps.length >= this.maxAttempts) {
      const lockedUntil = now + this.cooldownMs;
      this.saveData({ timestamps: validTimestamps, lockedUntil });
      const cooldownSeconds = Math.ceil(this.cooldownMs / 1000);
      return {
        allowed: false,
        attemptsLeft: 0,
        cooldownSeconds,
        message: `Too many login attempts. Please wait ${cooldownSeconds}s before trying again.`,
      };
    }

    return {
      allowed: true,
      attemptsLeft,
      cooldownSeconds: 0,
    };
  }

  /**
   * Records a new attempt. If limit exceeded, activates cooldown lockout.
   */
  public recordAttempt(): RateLimitStatus {
    const now = Date.now();
    const data = this.getData();
    const validTimestamps = data.timestamps.filter((ts) => now - ts < this.windowMs);
    validTimestamps.push(now);

    if (validTimestamps.length >= this.maxAttempts) {
      const lockedUntil = now + this.cooldownMs;
      this.saveData({ timestamps: validTimestamps, lockedUntil });
      const cooldownSeconds = Math.ceil(this.cooldownMs / 1000);
      return {
        allowed: false,
        attemptsLeft: 0,
        cooldownSeconds,
        message: `Rate limit reached. Google Login is locked for ${cooldownSeconds}s to protect your account.`,
      };
    }

    this.saveData({ timestamps: validTimestamps });
    return {
      allowed: true,
      attemptsLeft: this.maxAttempts - validTimestamps.length,
      cooldownSeconds: 0,
    };
  }

  /**
   * Resets rate limiter counter upon successful authentication.
   */
  public reset(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {}
  }
}

export const googleAuthRateLimiter = new RateLimiter('tf_google_auth_rate_limit', 5, 60000, 30000);

