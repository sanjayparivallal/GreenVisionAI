/**
 * Client-Side Error Tracking Utility for GreenVision AI.
 * 
 * Captures unhandled runtime errors, rejection events, and boundary errors
 * without leaking user PII or sensitive tokens.
 */

interface ErrorLogEntry {
  timestamp: string;
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  url: string;
}

class ErrorTracker {
  private logs: ErrorLogEntry[] = [];
  private maxLogs: number = 50;

  init() {
    if (typeof window === 'undefined') return;

    // Global uncaught error handler
    window.addEventListener('error', (event) => {
      this.logError({
        timestamp: new Date().toISOString(),
        message: event.message || 'Unknown runtime error',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        timestamp: new Date().toISOString(),
        message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
      });
    });
  }

  logError(entry: ErrorLogEntry) {
    // Sanitise sensitive URL tokens if present
    entry.url = entry.url.replace(/([?&](?:token|key|secret)=)[^&]+/gi, '$1[REDACTED]');
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    if (import.meta.env.DEV) {
      console.warn('[ErrorTracker] Captured exception:', entry.message);
    }
  }

  getLogs(): readonly ErrorLogEntry[] {
    return this.logs;
  }
}

export const errorTracker = new ErrorTracker();
