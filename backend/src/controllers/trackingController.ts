import { Request, Response } from 'express';
import { trackingQueue } from '../services/trackingQueueManager';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/redis';
import { recommendationService } from '../services/recommendationService';
import { voucherRuleEngine } from '../services/voucherRuleEngine';
import { CustomerBehavior } from '../models/CustomerBehavior';

export const trackEvent = async (req: Request, res: Response) => {
  try {
    let { sessionId, action, entityId, entityType, metadata } = req.body;
    
    if (!sessionId) {
      sessionId = uuidv4();
    }

    const userId = (req as any).user?.id || req.body.userId; // If authenticated

    await trackingQueue.add('track-event', {
      sessionId,
      userId,
      action,
      entityId,
      entityType,
      metadata,
      timestamp: new Date()
    });

    res.status(200).json({ success: true, sessionId });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Enhanced recommendations endpoint — returns actual product lists
 * based on the user's behavioral profile.
 */
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID required' });
    }

    const userId = (req as any).user?.id || (req.query.userId as string);

    // Get full recommendations with products
    const result = await recommendationService.getRecommendations(
      sessionId as string,
      userId,
      Number(req.query.limit) || 8
    );

    res.status(200).json({
      success: true,
      segment: result.profile,
      recommendations: {
        strategy: result.strategy,
        strategyLabel: result.strategyLabel,
        strategyDescription: result.strategyDescription,
        brand: result.topBrand,
        products: result.products,
        profile: result.profile,
      },
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Smart voucher evaluation endpoint — returns applicable vouchers
 * based on user behavior and current cart state.
 */
export const getSmartVouchers = async (req: Request, res: Response) => {
  try {
    const { sessionId, cartItems } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID required' });
    }

    const userId = (req as any).user?.id || (req.query.userId as string);
    let parsedCartItems: any[] = [];

    // Parse cart items if provided as JSON string
    if (cartItems) {
      try {
        parsedCartItems = JSON.parse(cartItems as string);
      } catch {
        parsedCartItems = [];
      }
    }

    const vouchers = await voucherRuleEngine.evaluateVoucherEligibility(
      userId,
      sessionId as string,
      parsedCartItems
    );

    // Also get the behavioral profile for context
    let behavioralProfile = 'unclassified';
    const cached = await redis.get(`session:${sessionId}:profile`);
    if (cached) {
      behavioralProfile = cached;
    } else {
      let profile;
      if (userId) {
        profile = await CustomerBehavior.findOne({ userId });
      }
      if (!profile) {
        profile = await CustomerBehavior.findOne({ sessionId });
      }
      if (profile) behavioralProfile = profile.behavioralProfile;
    }

    res.status(200).json({
      success: true,
      vouchers,
      behavioralProfile,
    });
  } catch (error) {
    console.error('Smart voucher error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Batch events — accept multiple tracking events at once (for debounced sends from frontend).
 */
export const trackBatchEvents = async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'Events array required' });
    }

    const userId = (req as any).user?.id || req.body.userId;

    for (const event of events.slice(0, 50)) { // Cap at 50 events per batch
      let sessionId = event.sessionId;
      if (!sessionId) sessionId = uuidv4();

      await trackingQueue.add('track-event', {
        sessionId,
        userId,
        action: event.action,
        entityId: event.entityId,
        entityType: event.entityType,
        metadata: event.metadata,
        timestamp: event.timestamp || new Date()
      });
    }

    res.status(200).json({ success: true, processed: Math.min(events.length, 50) });
  } catch (error) {
    console.error('Batch track event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Frequently Purchased Together endpoint for Shopping Cart / Checkout page.
 */
export const getFrequentlyPurchasedTogether = async (req: Request, res: Response) => {
  try {
    const { productIds } = req.query; // Expecting comma separated product IDs
    
    if (!productIds || typeof productIds !== 'string') {
      return res.status(400).json({ success: false, message: 'productIds query parameter required (comma separated)' });
    }

    const ids = productIds.split(',').map(id => id.trim()).filter(Boolean);
    const limit = Number(req.query.limit) || 4;

    const products = await recommendationService.getFrequentlyPurchasedTogether(ids, limit);

    res.status(200).json({
      success: true,
      recommendations: products
    });
  } catch (error) {
    console.error('Frequently Purchased Together error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
