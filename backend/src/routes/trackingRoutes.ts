import express from 'express';
import { trackEvent, getRecommendations, getSmartVouchers, trackBatchEvents, getFrequentlyPurchasedTogether } from '../controllers/trackingController';

const router = express.Router();

router.post('/event', trackEvent);
router.post('/events/batch', trackBatchEvents);
router.get('/recommendations', getRecommendations);
router.get('/vouchers', getSmartVouchers);
router.get('/frequently-purchased', getFrequentlyPurchasedTogether);

export default router;
