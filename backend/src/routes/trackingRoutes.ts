import express from 'express';
import { trackEvent, getRecommendations, getSmartVouchers, trackBatchEvents } from '../controllers/trackingController';

const router = express.Router();

router.post('/event', trackEvent);
router.post('/events/batch', trackBatchEvents);
router.get('/recommendations', getRecommendations);
router.get('/vouchers', getSmartVouchers);

export default router;
