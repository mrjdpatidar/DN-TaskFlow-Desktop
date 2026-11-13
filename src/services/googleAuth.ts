/**
 * Google Identity Services & OAuth Client for TaskFlow
 * Supports Web and Electron environments with strict rate limiting.
 */

import { googleAuthRateLimiter, RateLimitStatus } from './rateLimiter';

export interface GoogleUserProfile {
  email: string;
  name: string;
  avatar?: string;
  googleId: string;
  emailVerified: boolean;
}

// Configurable Client ID from environment variable or localStorage
export function getGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tf_google_client_id');
    if (saved && saved.trim()) return saved.trim();
  }
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

export function setGoogleClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tf_google_client_id', clientId.trim());
  }
}

/**
 * Parses JWT token from Google Identity Services
 */
export function decodeGoogleCredential(credential: string): GoogleUserProfile | null {
  try {
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      email: parsed.email,
      name: parsed.name || parsed.email.split('@')[0],
      avatar: parsed.picture,
      googleId: parsed.sub,
      emailVerified: Boolean(parsed.email_verified),
    };
  } catch (err) {
    console.error('[GoogleAuth] Failed to decode Google credential token:', err);
    return null;
  }
}

class GoogleAuthService {
  private scriptLoaded = false;

  /**
   * Dynamically loads the Google Identity Services SDK
   */
  public async loadScript(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if ((window as any).google?.accounts?.id) {
      this.scriptLoaded = true;
      return true;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        console.warn('[GoogleAuth] Could not load Google Identity Services SDK.');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Checks current rate limiting status before attempting sign in
   */
  public checkRateLimit(): RateLimitStatus {
    return googleAuthRateLimiter.check();
  }

  /**
   * Prompts user with Google Login flow with rate limit tracking
   */
  public async promptLogin(): Promise<{
    success: boolean;
    profile?: GoogleUserProfile;
    error?: string;
    rateLimit?: RateLimitStatus;
  }> {
    // 1. Strict Rate Limit Validation
    const status = googleAuthRateLimiter.check();
    if (!status.allowed) {
      return {
        success: false,
        error: status.message || 'Google Login is temporarily rate limited. Please wait.',
        rateLimit: status,
      };
    }

    // Record this attempt against the rate limit budget
    const recorded = googleAuthRateLimiter.recordAttempt();
    if (!recorded.allowed) {
      return {
        success: false,
        error: recorded.message,
        rateLimit: recorded,
      };
    }

    const clientId = getGoogleClientId();

    // If no Client ID configured yet, provide clear instruction or demo simulation
    if (!clientId) {
      return {
        success: false,
        error: 'GOOGLE_CLIENT_ID_REQUIRED',
      };
    }

    await this.loadScript();

    return new Promise((resolve) => {
      try {
        const google = (window as any).google;
        if (!google?.accounts?.id) {
          resolve({
            success: false,
            error: 'Google Sign-In SDK is unavailable. Please check your network connection.',
          });
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              const profile = decodeGoogleCredential(response.credential);
              if (profile) {
                // Successful auth resets the rate limiter
                googleAuthRateLimiter.reset();
                resolve({ success: true, profile });
                return;
              }
            }
            resolve({ success: false, error: 'Could not decode Google user profile.' });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.warn('[GoogleAuth] Google prompt skipped or blocked, trying fallback token client');
          }
        });
      } catch (err: any) {
        resolve({ success: false, error: err?.message || 'Google Sign-In error' });
      }
    });
  }

  /**
   * Test/Demo simulation account for instant verification before Google Cloud Console keys are generated
   */
  public getSimulatedProfile(): GoogleUserProfile {
    googleAuthRateLimiter.reset();
    return {
      email: 'alex.vance@gmail.com',
      name: 'Alex Vance (Google)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      googleId: 'google_oauth_' + Math.random().toString(36).substring(2, 9),
      emailVerified: true,
    };
  }
}

export const googleAuthService = new GoogleAuthService();

