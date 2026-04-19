import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ── Singleton session ID ──
let SESSION_ID: string | null = null;
if (typeof window !== 'undefined') {
  SESSION_ID = localStorage.getItem('sports_session_id');
  if (!SESSION_ID) {
    SESSION_ID = uuidv4();
    localStorage.setItem('sports_session_id', SESSION_ID);
  }
}

// ── Get current userId from localStorage ──
const getUserId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const userObj = JSON.parse(localStorage.getItem('user') || 'null');
    if (userObj) return userObj.id || userObj._id;
  } catch (e) {}
  return undefined;
};

export interface SmartVoucher {
  code: string;
  type: string;
  value?: number;
  maxDiscount?: number;
  message: string;
  description?: string;
  expiresIn?: number;
  gateways?: string[];
  urgency?: 'low' | 'medium' | 'high';
  icon?: string;
}

export interface RecommendationData {
  strategy: string;
  strategyLabel?: string;
  strategyDescription?: string;
  brand?: string;
  products?: any[];
  profile?: string;
}

export const useTracking = () => {
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [smartVouchers, setSmartVouchers] = useState<SmartVoucher[]>([]);
  const [behavioralProfile, setBehavioralProfile] = useState<string>('unclassified');

  // ── Batched event queue for efficiency ──
  const eventQueueRef = useRef<any[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Flush batched events to server ──
  const flushEvents = useCallback(async () => {
    const events = eventQueueRef.current.splice(0);
    if (events.length === 0) return;

    try {
      await axios.post(`${API_URL}/tracking/events/batch`, {
        events,
        userId: getUserId(),
      });
    } catch (error) {
      // Re-queue failed events (but don't let it grow forever)
      if (eventQueueRef.current.length < 100) {
        eventQueueRef.current.push(...events);
      }
      console.warn('Failed to flush tracking events', error);
    }
  }, []);

  // ── Track a single event (queued and batched) ──
  const trackEvent = useCallback(async (
    action: string,
    entityId?: string,
    entityType?: string,
    metadata?: any
  ) => {
    const event = {
      sessionId: SESSION_ID,
      action,
      entityId,
      entityType,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // For high-priority events, send immediately
    if (['add_to_cart', 'checkout'].includes(action)) {
      try {
        await axios.post(`${API_URL}/tracking/event`, {
          ...event,
          userId: getUserId(),
        });
      } catch (error) {
        console.warn('Failed to track event', error);
      }
      return;
    }

    // For other events, batch them
    eventQueueRef.current.push(event);

    // Debounce: flush after 2 seconds of inactivity
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flushEvents, 2000);
  }, [flushEvents]);

  // ── Track hover / dwell events with duration ──
  const trackHover = useCallback((
    entityId: string,
    pageSection: string,
    duration: number,
    metadata?: any
  ) => {
    if (duration < 500) return; // Ignore very short hovers (< 500ms)

    trackEvent('hover', entityId, 'product', {
      ...metadata,
      pageSection,
      duration,
    });
  }, [trackEvent]);

  // ── Track page dwell time ──
  const trackDwell = useCallback((
    entityId: string,
    duration: number,
    metadata?: any
  ) => {
    if (duration < 3000) return; // Ignore very short visits (< 3s)

    trackEvent('dwell', entityId, 'product', {
      ...metadata,
      duration,
    });
  }, [trackEvent]);

  // ── Track scroll behavior ──
  const trackScroll = useCallback((
    scrollDepth: number,
    scrollSpeed: number,
    metadata?: any
  ) => {
    trackEvent('scroll', undefined, undefined, {
      ...metadata,
      scrollDepth,
      scrollSpeed,
    });
  }, [trackEvent]);

  // ── Track filter usage (brand/category/price) ──
  const trackFilterUse = useCallback((
    filterUsed: string, // e.g., "brand:Yonex", "price:<1000000"
    metadata?: any
  ) => {
    trackEvent('filter_use', undefined, undefined, {
      ...metadata,
      filterUsed,
    });
  }, [trackEvent]);

  // ── Fetch personalized recommendations ──
  const fetchRecommendations = useCallback(async () => {
    try {
      const userId = getUserId();
      const params: any = { sessionId: SESSION_ID };
      if (userId) params.userId = userId;

      const res = await axios.get(`${API_URL}/tracking/recommendations`, { params });
      const data = res.data.recommendations;
      setRecommendations(data);
      setBehavioralProfile(data?.profile || 'unclassified');
      return data;
    } catch (error) {
      console.warn('Failed to fetch tracking recommendations', error);
      return null;
    }
  }, []);

  // ── Fetch smart vouchers based on current context ──
  const fetchSmartVouchers = useCallback(async (cartItems?: any[]) => {
    try {
      const userId = getUserId();
      const params: any = { sessionId: SESSION_ID };
      if (userId) params.userId = userId;
      if (cartItems && cartItems.length > 0) {
        params.cartItems = JSON.stringify(
          cartItems.map(item => ({
            productId: item.product?.id || item.product?._id || item.productId,
            name: item.product?.name || item.name,
            category: typeof (item.product as any)?.category === 'object'
              ? (item.product as any).category?.name
              : (item.product as any)?.category,
            brand: typeof (item.product as any)?.brand === 'object'
              ? (item.product as any).brand?.name
              : (item.product as any)?.brand,
            price: item.product?.price || (item.product as any)?.basePrice || item.price,
            quantity: item.quantity,
          }))
        );
      }

      const res = await axios.get(`${API_URL}/tracking/vouchers`, { params });
      setSmartVouchers(res.data.vouchers || []);
      setBehavioralProfile(res.data.behavioralProfile || 'unclassified');
      return res.data.vouchers;
    } catch (error) {
      console.warn('Failed to fetch smart vouchers', error);
      return [];
    }
  }, []);

  // ── Flush events on page unload ──
  useEffect(() => {
    const handleUnload = () => {
      const events = eventQueueRef.current.splice(0);
      if (events.length === 0) return;
      // Use sendBeacon for reliable delivery on page close
      const blob = new Blob(
        [JSON.stringify({ events, userId: getUserId() })],
        { type: 'application/json' }
      );
      navigator.sendBeacon?.(`${API_URL}/tracking/events/batch`, blob);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushEvents();
    };
  }, [flushEvents]);

  return {
    trackEvent,
    trackHover,
    trackDwell,
    trackScroll,
    trackFilterUse,
    fetchRecommendations,
    fetchSmartVouchers,
    recommendations,
    smartVouchers,
    behavioralProfile,
    sessionId: SESSION_ID,
  };
};
