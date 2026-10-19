/**
 * Wafy Arts Fest - Analytics & Telemetry Layer
 * Privacy-respecting, zero-cookie event tracking system.
 * Automatically supports Google Analytics (via NEXT_PUBLIC_GA_ID)
 * and internal event logging for key fest actions.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type FestAnalyticsEvent =
  | 'page_view'
  | 'student_login_attempt'
  | 'student_login_success'
  | 'officer_login_attempt'
  | 'officer_login_success'
  | 'admit_card_downloaded'
  | 'stage_viewed'
  | 'score_submitted'
  | 'theme_toggled';

export function trackPageView(url: string) {
  if (typeof window === 'undefined') return;

  // Google Analytics
  if (window.gtag && process.env.NEXT_PUBLIC_GA_ID) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  }

  // Internal Telemetry / Diagnostic Logging
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics:PageView] ${url}`);
  }
}

export function trackEvent(eventName: FestAnalyticsEvent, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }

  // Internal Telemetry / Diagnostic Logging
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics:Event] ${eventName}`, params);
  }
}
