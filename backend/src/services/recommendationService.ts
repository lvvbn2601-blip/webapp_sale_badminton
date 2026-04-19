import { ICustomerBehavior, CustomerBehavior, BehavioralProfile } from '../models/CustomerBehavior';
import { Product } from '../models/Product';
import { redis } from '../config/redis';
import mongoose from 'mongoose';

export interface RecommendationResult {
  strategy: string;
  strategyLabel: string;
  strategyDescription: string;
  products: any[];
  profile: BehavioralProfile;
  topBrand?: string;
}

/**
 * Recommendation Service — maps behavioral profiles to product recommendations.
 */
class RecommendationService {

  /**
   * Get personalized product recommendations based on user's behavioral profile.
   */
  async getRecommendations(sessionId: string, userId?: string, limit = 8): Promise<RecommendationResult> {
    // 1. Load profile
    let profile: ICustomerBehavior | null = null;
    if (userId) {
      profile = await CustomerBehavior.findOne({ userId });
    }
    if (!profile) {
      profile = await CustomerBehavior.findOne({ sessionId });
    }

    if (!profile) {
      // No profile = return trending/best sellers as default
      return this.getTrendingRecommendations(limit);
    }

    const behavioralProfile = profile.behavioralProfile || 'unclassified';

    // 2. Route to strategy
    switch (behavioralProfile) {
      case 'ghost_shopper':
        return this.getGhostShopperRecommendations(profile, limit);
      case 'gear_geek':
        return this.getGearGeekRecommendations(profile, limit);
      case 'brand_loyalist':
        return this.getBrandLoyalistRecommendations(profile, limit);
      case 'beginner':
        return this.getBeginnerRecommendations(profile, limit);
      default:
        return this.getTrendingRecommendations(limit);
    }
  }

  /**
   * Ghost Shoppers: Best-sellers & Trending products.
   * Display the best-selling products or basic combos to quickly attract attention.
   */
  private async getGhostShopperRecommendations(profile: ICustomerBehavior, limit: number): Promise<RecommendationResult> {
    const products = await Product.find({
      status: 'active',
      $or: [{ isBestSeller: true }, { isTrending: true }],
    })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ reviewCount: -1, rating: -1 })
      .limit(limit)
      .lean();

    return {
      strategy: 'trending_best_sellers',
      strategyLabel: '🔥 Featured products',
      strategyDescription: 'This best-selling and trending product is loved by many.',
      products,
      profile: 'ghost_shopper',
    };
  }

  /**
   * Gear Geeks: Content-based filtering — suggest products with similar specifications.
   * E.g., if viewing a head-heavy offensive racket, suggest Astrox 99, Thruster Ryuga.
   * Also suggest high-bounce strings (BG66 series).
   */
  private async getGearGeekRecommendations(profile: ICustomerBehavior, limit: number): Promise<RecommendationResult> {
    const viewedIds = profile.viewedProductIds.slice(0, 5);

    // Get specs of recently viewed products
    let viewedProducts: any[] = [];
    if (viewedIds.length > 0) {
      viewedProducts = await Product.find({
        _id: { $in: viewedIds.map(id => new mongoose.Types.ObjectId(id)) },
        status: 'active',
      }).lean();
    }

    // Build spec-based query from viewed products
    const specQueries: any[] = [];
    for (const vp of viewedProducts) {
      if (vp.specs) {
        // Match products with similar balance point, weight class, etc.
        const matchSpecs: Record<string, any> = {};
        if (vp.specs['Balance Point']) {
          matchSpecs['specs.Balance Point'] = vp.specs['Balance Point'];
        }
        if (vp.specs['Weight (U)']) {
          matchSpecs['specs.Weight (U)'] = vp.specs['Weight (U)'];
        }
        if (Object.keys(matchSpecs).length > 0) {
          specQueries.push(matchSpecs);
        }
      }
    }

    // Also get the primary category of viewed products
    const viewedCategoryIds = viewedProducts
      .map(p => p.category)
      .filter(Boolean);

    let products: any[] = [];

    // First: spec-similar products
    if (specQueries.length > 0) {
      products = await Product.find({
        status: 'active',
        _id: { $nin: viewedIds.map(id => new mongoose.Types.ObjectId(id)) },
        $or: specQueries,
      })
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .sort({ rating: -1 })
        .limit(limit)
        .lean();
    }

    // If not enough, supplement with same-category products
    if (products.length < limit && viewedCategoryIds.length > 0) {
      const additional = await Product.find({
        status: 'active',
        _id: { $nin: [...viewedIds.map(id => new mongoose.Types.ObjectId(id)), ...products.map(p => p._id)] },
        category: { $in: viewedCategoryIds },
      })
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .sort({ rating: -1 })
        .limit(limit - products.length)
        .lean();
      products = products.concat(additional);
    }

    // If still not enough, fall back to trending
    if (products.length < limit) {
      const trending = await Product.find({
        status: 'active',
        _id: { $nin: [...viewedIds.map(id => new mongoose.Types.ObjectId(id)), ...products.map(p => p._id)] },
        $or: [{ isTrending: true }, { isBestSeller: true }],
      })
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .sort({ rating: -1 })
        .limit(limit - products.length)
        .lean();
      products = products.concat(trending);
    }

    return {
      strategy: 'content_based_filtering',
      strategyLabel: '🔍 Matches your playing style.',
      strategyDescription: 'Based on the specifications you are interested in.',
      products,
      profile: 'gear_geek',
    };
  }

  /**
   * Brand Loyalists: Brand Ecosystem recommendations.
   * If viewing Yonex rackets → suggest Yonex shoes, bags from the same collection or color scheme.
   */
  private async getBrandLoyalistRecommendations(profile: ICustomerBehavior, limit: number): Promise<RecommendationResult> {
    // Find top brand
    let topBrand = '';
    let topBrandScore = 0;
    profile.brandAffinities.forEach((score, brand) => {
      if (score > topBrandScore) {
        topBrandScore = score;
        topBrand = brand;
      }
    });

    const viewedIds = profile.viewedProductIds.slice(0, 10);

    // Find products from the favorite brand that user hasn't viewed
    let products = await Product.find({
      status: 'active',
      _id: { $nin: viewedIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id)) },
    })
      .populate('category', 'name slug')
      .populate({
        path: 'brand',
        match: { name: { $regex: new RegExp(topBrand, 'i') } },
        select: 'name slug',
      })
      .sort({ isBestSeller: -1, rating: -1 })
      .limit(limit * 2) // Get extra to filter
      .lean();

    // Filter to only include products where brand populated (matched)
    products = products.filter(p => p.brand !== null);
    products = products.slice(0, limit);

    // If not enough brand-specific products, supplement with trending from same brand
    if (products.length < limit) {
      const additional = await Product.find({
        status: 'active',
        _id: { $nin: [...viewedIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id)), ...products.map(p => p._id)] },
        $or: [{ isTrending: true }, { isBestSeller: true }],
      })
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .sort({ rating: -1 })
        .limit(limit - products.length)
        .lean();
      products = products.concat(additional);
    }

    return {
      strategy: 'brand_ecosystem',
      strategyLabel: `💎 Ecosystem ${topBrand}`,
      strategyDescription: `${topBrand} products match your collection`,
      products,
      profile: 'brand_loyalist',
      topBrand,
    };
  }

  /**
   * Beginners: Beginner Kits — easy-to-play rackets, affordable shoes, protection accessories.
   */
  private async getBeginnerRecommendations(profile: ICustomerBehavior, limit: number): Promise<RecommendationResult> {
    const viewedIds = profile.viewedProductIds.slice(0, 10);

    // Get products under budget price threshold, sorted by rating (beginner-friendly)
    const products = await Product.find({
      status: 'active',
      basePrice: { $lt: 80 }, // ~2M VND — affordable for beginners
      _id: { $nin: viewedIds.filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id)) },
    })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ rating: -1, reviewCount: -1 })
      .limit(limit)
      .lean();

    return {
      strategy: 'beginner_kits',
      strategyLabel: '🌟 For beginners',
      strategyDescription: 'The product is easy to play, affordable, and suitable for beginners.',
      products,
      profile: 'beginner',
    };
  }

  /**
   * Default: Trending & Best Sellers for unclassified or anonymous users.
   */
  private async getTrendingRecommendations(limit: number): Promise<RecommendationResult> {
    const products = await Product.find({
      status: 'active',
      $or: [{ isBestSeller: true }, { isTrending: true }],
    })
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .sort({ reviewCount: -1, rating: -1 })
      .limit(limit)
      .lean();

    return {
      strategy: 'trending_best_sellers',
      strategyLabel: '🔥 Trending & Best Sellers',
      strategyDescription: 'The most popular products at Badminton Hub',
      products,
      profile: 'unclassified',
    };
  }
}

export const recommendationService = new RecommendationService();
