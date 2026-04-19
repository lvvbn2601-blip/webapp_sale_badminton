import { useState, useEffect, useCallback } from 'react';
import { X, Gift, Clock, Tag, CreditCard, Zap, ChevronRight, Copy, Check, Sparkles } from 'lucide-react';
import type { SmartVoucher } from '../lib/useTracking';

interface SmartVoucherPopupProps {
  vouchers: SmartVoucher[];
  onDismiss?: () => void;
  position?: 'bottom-right' | 'bottom-left';
}

const urgencyColors = {
  low: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    btn: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-400/20',
  },
  medium: {
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'ring-emerald-400/20',
  },
  high: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    btn: 'bg-orange-600 hover:bg-orange-700',
    ring: 'ring-orange-400/20',
  },
};

const typeIcons: Record<string, any> = {
  WELCOME: Gift,
  DISCOUNT_PERCENT: Tag,
  DISCOUNT_AMOUNT: Tag,
  CROSS_SELL: Zap,
  BUNDLE_DEAL: Sparkles,
  PAYMENT_SPECIFIC: CreditCard,
  FREE_SHIPPING: Tag,
};

export default function SmartVoucherPopup({ vouchers, onDismiss, position = 'bottom-right' }: SmartVoucherPopupProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Filter out PAYMENT_SPECIFIC vouchers (shown on checkout page instead)
  const displayVouchers = vouchers.filter(v => v.type !== 'PAYMENT_SPECIFIC');

  // Auto-show after a short delay
  useEffect(() => {
    if (displayVouchers.length === 0 || dismissed) return;

    // Check if user already dismissed in this session
    const dismissedKey = `voucher_popup_dismissed_${new Date().toDateString()}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
      return;
    }

    const timer = setTimeout(() => setVisible(true), 3000); // 3s delay
    return () => clearTimeout(timer);
  }, [displayVouchers.length, dismissed]);

  // Countdown timer for urgent vouchers
  useEffect(() => {
    const activeVoucher = displayVouchers[activeIndex];
    if (!activeVoucher?.expiresIn) {
      setCountdown(null);
      return;
    }

    setCountdown(activeVoucher.expiresIn * 3600); // Convert hours to seconds
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 0) return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeIndex, displayVouchers]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    const dismissedKey = `voucher_popup_dismissed_${new Date().toDateString()}`;
    sessionStorage.setItem(dismissedKey, 'true');
    onDismiss?.();
  }, [onDismiss]);

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const formatCountdown = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!visible || displayVouchers.length === 0) return null;

  const activeVoucher = displayVouchers[activeIndex];
  const urgency = activeVoucher?.urgency || 'low';
  const colors = urgencyColors[urgency];
  const IconComponent = typeIcons[activeVoucher?.type] || Gift;

  const positionClasses = position === 'bottom-right'
    ? 'right-4 sm:right-6'
    : 'left-4 sm:left-6';

  return (
    <div
      className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 w-[340px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5 fade-in duration-500`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} shadow-2xl ring-4 ${colors.ring} backdrop-blur-xl`}
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/5 text-gray-400 transition hover:bg-black/10 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>

        {/* Header with icon */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-2">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${colors.badge} shadow-sm`}>
            <IconComponent size={22} />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeVoucher?.icon || '🎁'}</span>
              <h4 className="text-sm font-bold text-gray-900 leading-tight">
                {activeVoucher?.message}
              </h4>
            </div>
            {activeVoucher?.description && (
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                {activeVoucher.description}
              </p>
            )}
          </div>
        </div>

        {/* Countdown timer (for urgent vouchers) */}
        {countdown !== null && countdown > 0 && (
          <div className="mx-5 mt-2 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 border border-black/5">
            <Clock size={14} className="text-orange-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-600">Hết hạn trong</span>
            <span className="ml-auto text-sm font-black tabular-nums text-orange-600">
              {formatCountdown(countdown)}
            </span>
          </div>
        )}

        {/* Code & CTA */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-4">
          {activeVoucher?.code && !['EWALLET_PROMO'].includes(activeVoucher.code) && (
            <button
              onClick={() => handleCopyCode(activeVoucher.code)}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              {copied ? (
                <><Check size={12} className="text-emerald-500" /> Đã sao chép!</>
              ) : (
                <><Copy size={12} className="text-gray-400" /> {activeVoucher.code}</>
              )}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className={`ml-auto flex items-center gap-1.5 rounded-xl ${colors.btn} px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md active:scale-[0.97]`}
          >
            Mua ngay <ChevronRight size={14} />
          </button>
        </div>

        {/* Pagination dots (if multiple vouchers) */}
        {displayVouchers.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pb-3">
            {displayVouchers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeIndex
                    ? 'w-6 bg-gray-800'
                    : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Voucher ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
