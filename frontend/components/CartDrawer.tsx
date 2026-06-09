import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2, Ticket, CheckCircle2, ChevronRight } from "lucide-react";
import { CartItem, useCart, getCartItemId } from "../context/CartContext";
import { useState, useEffect, useMemo } from "react";
import { fetchPublicCoupons } from "../lib/api";

type Props = {
    open: boolean;
    items: CartItem[];
    onClose: () => void;
};

const getPrice = (p: any): number => {
  const base = Number(p.price ?? p.basePrice ?? 0);
  return base;
};

export function CartDrawer({ open, items, onClose }: Props) {
    const { remove, update, selectedIds, toggleSelect, selectAll, deselectAll, count, clear } = useCart();

    const [showVouchers, setShowVouchers] = useState(false);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
    const [manualCode, setManualCode] = useState("");

    useEffect(() => {
        if (open) {
            fetchPublicCoupons().then(setCoupons).catch(() => { });
        } else {
            setShowVouchers(false); // reset on close
        }
    }, [open]);

    const selectedItems = useMemo(() => items.filter(i => selectedIds.includes(getCartItemId(i))), [items, selectedIds]);
    const selectedSubtotal = useMemo(() => selectedItems.reduce((acc, item) => {
        const base = getPrice(item.product);
        const stringFee = Number((item.variantOptions?.stringPrice ?? 0) / 25000);
        return acc + (base + stringFee) * item.quantity;
    }, 0), [selectedItems]);

    const applicableCoupons = useMemo(() => coupons.filter(c =>
        (!c.minOrderValue || selectedSubtotal >= c.minOrderValue) &&
        !c.usedByCurrentUser &&
        !(c.usageLimit && c.usageCount >= c.usageLimit)
    ), [coupons, selectedSubtotal]);
    const ineligibleCoupons = useMemo(() => coupons.filter(c =>
        (c.minOrderValue && selectedSubtotal < c.minOrderValue) ||
        c.usedByCurrentUser ||
        (c.usageLimit && c.usageCount >= c.usageLimit)
    ), [coupons, selectedSubtotal]);

    // Smart Auto-apply deepest discount when opening slider
    useEffect(() => {
        if (showVouchers && !selectedCoupon && applicableCoupons.length > 0) {
            let best: any = null;
            let maxDiscount = 0;
            applicableCoupons.forEach(c => {
                let val = 0;
                if (c.discountType === "amount") val = c.amount;
                else if (c.discountType === "percent") {
                    val = (selectedSubtotal * c.amount) / 100;
                    if (c.maxDiscount && val > c.maxDiscount) val = c.maxDiscount;
                }
                if (val > maxDiscount) { maxDiscount = val; best = c; }
            });
            setSelectedCoupon(best);
        }
    }, [showVouchers, applicableCoupons, selectedCoupon, selectedSubtotal]);

    const discountValue = useMemo(() => {
        if (!selectedCoupon) return 0;
        if (selectedCoupon.discountType === "amount") return selectedCoupon.amount;
        if (selectedCoupon.discountType === "percent") {
            let val = (selectedSubtotal * selectedCoupon.amount) / 100;
            if (selectedCoupon.maxDiscount && val > selectedCoupon.maxDiscount) val = selectedCoupon.maxDiscount;
            return val;
        }
        return 0; // shipping not subtracted from subtotal
    }, [selectedCoupon, selectedSubtotal]);

    return (
        <div
            className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"
                }`}
            aria-hidden={!open}
        >
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition duration-300 ${open ? "opacity-100" : "opacity-0"
                    }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <aside
                className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* ── Header ──────────────────────────────── */}
                {/* ── Header ──────────────────────────────── */}
                <div className="flex flex-col gap-3 border-b border-black/5 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-white">
                                <ShoppingBag size={16} />
                            </div>
                            <div>
                                <h3 className="font-heading text-lg font-bold text-secondary">Your Cart</h3>
                                <p className="text-xs text-secondary/50">{count} {count === 1 ? "item" : "items"}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="grid h-9 w-9 place-items-center rounded-full border border-black/5 text-secondary/60 transition hover:bg-gray-50 hover:text-secondary"
                            aria-label="Close cart"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {items.length > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer w-fit mt-1">
                            <input
                                type="checkbox"
                                checked={items.length > 0 && selectedIds.length === items.length}
                                onChange={() => selectedIds.length === items.length ? deselectAll() : selectAll()}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className="text-sm font-semibold text-secondary/70">Select all</span>
                        </label>
                    )}
                </div>

                {/* ── Items ───────────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                            <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-50">
                                <ShoppingBag size={32} className="text-secondary/20" />
                            </div>
                            <p className="font-heading text-lg font-semibold text-secondary">
                                Your cart is empty
                            </p>
                            <p className="text-sm text-secondary/50">
                                Add some badminton gear to get started!
                            </p>
                            <button onClick={onClose} className="btn-primary mt-2 text-sm">
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-0 divide-y divide-black/5 px-4">
                            {items.map((item) => {
                                const id = getCartItemId(item);
                                const basePrice = getPrice(item.product);
                                const stringFee = Number((item.variantOptions?.stringPrice ?? 0) / 25000);
                                const price = basePrice + stringFee;
                                const lineTotal = price * item.quantity;

                                return (
                                    <div key={id} className="flex gap-3 py-4 items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(id)}
                                            onChange={(e) => { e.stopPropagation(); toggleSelect(id); }}
                                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary shrink-0 cursor-pointer"
                                        />
                                        {/* Product Image */}
                                        <Link
                                            href={`/products/${item.product.slug}`}
                                            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"
                                            onClick={onClose}
                                        >
                                            {item.product.image ? (
                                                <Image
                                                    src={item.product.image}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover transition hover:scale-105"
                                                    sizes="80px"
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center text-xs font-bold text-secondary/20">
                                                    {item.product.name.charAt(0)}
                                                </div>
                                            )}
                                        </Link>

                                        {/* Product Info */}
                                        <div className="flex flex-1 flex-col justify-between">
                                            <div>
                                                <Link
                                                    href={`/products/${item.product.slug}`}
                                                    className="line-clamp-2 text-sm font-semibold text-secondary transition hover:text-primary"
                                                    onClick={onClose}
                                                >
                                                    {item.product.name}
                                                </Link>
                                                <p className="mt-0.5 text-xs text-secondary/40">
                                                    ${price.toFixed(2)} each
                                                </p>
                                            </div>

                                            {/* Quantity Controls + Price */}
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center rounded-lg border border-black/5 bg-gray-50">
                                                    <button
                                                        onClick={() => update(id, item.quantity - 1)}
                                                        className="px-2 py-1.5 text-secondary/50 transition hover:text-secondary"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="w-7 text-center text-xs font-bold text-secondary">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => update(id, item.quantity + 1)}
                                                        className="px-2 py-1.5 text-secondary/50 transition hover:text-secondary"
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-secondary">
                                                        ${lineTotal.toFixed(2)}
                                                    </span>
                                                    <button
                                                        onClick={() => remove(id)}
                                                        className="grid h-7 w-7 place-items-center rounded-lg text-secondary/30 transition hover:bg-red-50 hover:text-red-500"
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────── */}
                {items.length > 0 && (() => {
                    const shipping = selectedSubtotal > 120 || selectedItems.length === 0 ? 0 : 12;
                    const finalTotal = selectedSubtotal - discountValue + shipping;
                    return (
                        <div className="border-t border-black/5 bg-gray-50/50 px-6 py-4">
                            {/* Summary */}
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between text-secondary/60">
                                    <span>Subtotal (selected)</span>
                                    <span className="font-semibold text-secondary">${selectedSubtotal.toFixed(2)}</span>
                                </div>
                                {selectedCoupon && (
                                    <div className="flex items-center justify-between text-emerald-600 font-medium">
                                        <span>Discount ({selectedCoupon.code})</span>
                                        <span>-${discountValue.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-secondary/60">
                                    <span>Shipping</span>
                                    <span className="font-semibold text-secondary">
                                        {shipping === 0 ? (
                                            <span className="text-emerald-600">Free</span>
                                        ) : (
                                            `$${shipping.toFixed(2)}`
                                        )}
                                    </span>
                                </div>
                                {shipping > 0 && (
                                    <p className="text-xs text-secondary/40">
                                        Add ${(120 - selectedSubtotal).toFixed(2)} more for free shipping
                                    </p>
                                )}
                                <hr className="border-black/5" />
                                <div className="flex items-center justify-between text-base font-bold text-secondary">
                                    <span>Total</span>
                                    <span>${Math.max(0, finalTotal).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Select Voucher Button */}
                            <button
                                onClick={() => setShowVouchers(true)}
                                className="mt-4 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-primary transition hover:bg-primary/10 hover:border-primary/30 active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <Ticket size={18} className={selectedCoupon ? "text-primary" : "text-primary/60"} />
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-sm font-bold">{selectedCoupon ? selectedCoupon.code : "Apply Discount Code"}</span>
                                        {selectedCoupon && <span className="text-xs text-primary/70">{selectedCoupon.program}</span>}
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-primary/50" />
                            </button>

                            {/* Actions */}
                            <div className="mt-4 flex flex-col gap-2">
                                <Link
                                    href="/checkout"
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
                                    onClick={onClose}
                                >
                                    Checkout Selected
                                    <ArrowRight size={16} />
                                </Link>
                                <div className="flex gap-2">
                                    <Link
                                        href="/cart"
                                        className="flex flex-1 items-center justify-center rounded-2xl border border-secondary/20 px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-secondary hover:text-white"
                                        onClick={onClose}
                                    >
                                        View Cart
                                    </Link>
                                    <button
                                        onClick={() => clear()}
                                        className="rounded-2xl border border-black/5 px-4 py-3 text-sm font-semibold text-secondary/50 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* ── SLIDING VOUCHER DRAWER ── */}
                <div className={`absolute top-0 right-0 h-full w-full bg-gray-50 flex flex-col z-50 transition-transform duration-300 ease-in-out ${showVouchers ? "translate-x-0" : "translate-x-full"}`}>
                    <div className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10">
                        <h3 className="font-heading text-lg font-bold text-secondary">Vouchers</h3>
                        <button
                            onClick={() => setShowVouchers(false)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-secondary/60 transition hover:bg-black/10 hover:text-secondary"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-32">
                        {/* Banner Section */}
                        <div className="relative w-full h-32 bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 overflow-hidden flex items-center px-6">
                            <div className="z-10 w-2/3">
                                <h2 className="text-xl font-black text-orange-800 leading-tight">Unlock Great <br />Savings Today!</h2>
                                <p className="text-xs text-orange-700/80 mt-1 font-semibold">Apply codes below to save big.</p>
                            </div>
                            <div className="absolute -bottom-4 right-0 w-44 h-44 drop-shadow-2xl">
                                <Image src="/images/voucher-banner.png" alt="Vouchers" fill className="object-contain" />
                            </div>

                            {/* Confetti / Shapes */}
                            <div className="absolute top-2 right-1/2 w-3 h-3 rounded-full bg-red-400 animate-bounce delay-75" />
                            <div className="absolute bottom-4 left-1/2 w-2 h-2 rounded-full bg-blue-400 animate-pulse delay-150" />
                        </div>

                        {/* Manual Code Entry */}
                        <div className="bg-white px-6 py-5 border-b border-black/5 relative z-10 shadow-sm">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualCode}
                                    onChange={e => setManualCode(e.target.value.toUpperCase())}
                                    placeholder="Enter code manually..."
                                    className="flex-1 rounded-xl border border-black/10 bg-gray-50 px-4 py-2.5 text-sm font-bold uppercase placeholder:font-medium placeholder:normal-case outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                                <button className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black">
                                    Apply
                                </button>
                            </div>
                        </div>

                        {/* Applicable Codes */}
                        <div className="p-6">
                            {applicableCoupons.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-secondary flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-emerald-500" /> Applicable voucher
                                    </h4>
                                    <div className="space-y-4">
                                        {applicableCoupons.map(c => {
                                            const isSelected = selectedCoupon?._id === c._id;
                                            return (
                                                <label
                                                    key={c._id}
                                                    className={`relative flex cursor-pointer rounded-2xl transition-all shadow-sm overflow-hidden group ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-[1.01] shadow-lg" : "hover:scale-[1.01] hover:shadow-md"}`}
                                                >
                                                    {/* Ticket Left Part (Value) */}
                                                    <div className={`flex w-24 flex-col items-center justify-center p-3 text-center transition-colors ${isSelected ? "bg-primary text-white" : "bg-gradient-to-br from-emerald-50 to-teal-50 border-r border-dashed border-emerald-200 text-emerald-800 group-hover:from-emerald-100 group-hover:border-emerald-300"}`}>
                                                        {c.discountType === "percent" ? (
                                                            <>
                                                                <span className="text-2xl font-black leading-none">{c.amount}%</span>
                                                                <span className="text-[10px] font-bold uppercase mt-1 opacity-80 text-center">OFF</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="text-[10px] font-bold uppercase mb-0.5 opacity-80">{c.code}</span>
                                                                <span className="text-xl font-black leading-none">${c.amount}</span>
                                                            </>
                                                        )}

                                                        {/* Cutouts for ticket effect */}
                                                        <div className="absolute -top-2 left-[5.5rem] w-4 h-4 rounded-full bg-gray-50 z-10 hidden sm:block" />
                                                        <div className="absolute -bottom-2 left-[5.5rem] w-4 h-4 rounded-full bg-gray-50 z-10 hidden sm:block" />
                                                    </div>

                                                    {/* Ticket Right Part (Details) */}
                                                    <div className={`flex flex-1 items-center justify-between border-y border-r border-black/5 bg-white p-4 transition-colors ${isSelected ? "bg-primary/5 border-primary/20" : ""}`}>
                                                        <div>
                                                            <div className="mb-1 flex items-center gap-2">
                                                                <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-md ${isSelected ? "bg-primary/10 text-primary" : "bg-black/5 text-secondary"}`}>{c.code}</span>
                                                                {c.maxDiscount && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Max ${c.maxDiscount}</span>}
                                                            </div>
                                                            <p className="text-xs font-semibold text-secondary/70 mb-1.5 leading-snug">{c.program}</p>
                                                            <div className="text-[10px] text-secondary/40 font-bold uppercase tracking-wide">
                                                                Expires: {new Date(c.expiresAt).toLocaleDateString()}
                                                            </div>
                                                            {c.usageLimit && (
                                                                <div className="mt-2 w-full pr-4">
                                                                    <div className="flex justify-between text-[9px] text-secondary/60 mb-1 font-bold uppercase tracking-wide">
                                                                        <span>Usage Progress</span>
                                                                        <span>{c.usageCount} / {c.usageLimit}</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((c.usageCount / c.usageLimit) * 100, 100)}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="pl-3 relative z-20">
                                                            <input
                                                                type="radio"
                                                                name="voucher"
                                                                checked={isSelected}
                                                                onChange={() => setSelectedCoupon(c)}
                                                                className="h-6 w-6 rounded-full border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer transition-transform hover:scale-110"
                                                            />
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Ineligible Codes */}
                            {ineligibleCoupons.length > 0 && (
                                <div>
                                    <h4 className="mb-4 text-sm font-black uppercase tracking-wider text-secondary/40 flex items-center gap-2">
                                        <Ticket size={16} className="text-secondary/40" /> Other Codes
                                    </h4>
                                    <div className="space-y-4 opacity-75">
                                        {ineligibleCoupons.map(c => {
                                            const needed = c.minOrderValue ? c.minOrderValue - selectedSubtotal : 0;
                                            return (
                                                <div key={c._id} className="relative flex rounded-2xl transition-all shadow-sm overflow-hidden grayscale pointer-events-none">
                                                    {/* Ticket Left Part */}
                                                    <div className="flex w-24 flex-col items-center justify-center p-3 text-center bg-gray-200 border-r border-dashed border-gray-300 text-gray-500">
                                                        {c.discountType === "percent" ? (
                                                            <>
                                                                <span className="text-2xl font-black leading-none">{c.amount}%</span>
                                                                <span className="text-[10px] font-bold uppercase mt-1 opacity-80">OFF</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="text-[10px] font-bold uppercase mb-0.5 opacity-80">{c.code}</span>
                                                                <span className="text-xl font-black leading-none">${c.amount}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Ticket Right Part */}
                                                    <div className="flex flex-1 flex-col justify-center border-y border-r border-black/5 bg-gray-50 p-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono text-sm font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-600">{c.code}</span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-gray-500 mb-2 leading-snug">{c.program}</p>

                                                        {/* Upsell Suggestion overlayed to pop out even inside grayscale */}
                                                        {c.usedByCurrentUser ? (
                                                            <div className="mt-1 rounded border border-gray-300 bg-gray-200/80 px-2.5 py-1.5 text-[11px] font-bold text-gray-600">
                                                                🔒 Already Used
                                                            </div>
                                                        ) : (c.usageLimit && c.usageCount >= c.usageLimit) ? (
                                                            <div className="mt-1 rounded border border-gray-300 bg-gray-200/80 px-2.5 py-1.5 text-[11px] font-bold text-gray-600">
                                                                🔒 Out of Uses
                                                            </div>
                                                        ) : needed > 0 ? (
                                                            <div className="mt-1 rounded border border-gray-300 bg-gray-200/80 px-2.5 py-1.5 text-[11px] font-bold text-gray-600">
                                                                🔒 Add <span className="font-black text-gray-800">${(needed).toFixed(2)}</span> to unlock
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full border-t border-black/5 bg-white p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                        <div className="mb-3 flex justify-between text-sm font-semibold">
                            <span className="text-secondary/60">Selected:</span>
                            {selectedCoupon ? (
                                <span className="text-primary font-bold">{selectedCoupon.code} selected</span>
                            ) : (
                                <span className="text-secondary">None</span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowVouchers(false)}
                            className="w-full rounded-2xl bg-secondary px-6 py-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] active:bg-black"
                        >
                            CONFIRM
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
