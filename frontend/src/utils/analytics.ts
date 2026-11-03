/**
 * Privacy-friendly municipal metrics and event tracking for GreenVision AI.
 * Tracks user interactions (reports, voucher redemptions, tickets) without collecting PII.
 */

type AnalyticsEvent =
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'
  | 'voucher_redeemed'
  | 'ticket_created'
  | 'listing_published'
  | 'page_view';

interface EventPayload {
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: AnalyticsEvent, payload?: EventPayload) {
  if (typeof window === 'undefined') return;

  const eventData = {
    event,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    ...payload,
  };

  if (import.meta.env.DEV) {
    console.log('[Analytics Event]', eventData);
  }

  // Can be plugged into Plausible, Sentry, or custom endpoint without changing callers
}

export function trackPageView(pageName: string) {
  trackEvent('page_view', { page: pageName });
}
