import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Layout } from "../components/Layout";
import { useCart } from "../context/CartContext";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  ArrowRight,
  Tag,
  Wrench
} from "lucide-react";
import { FrequentlyPurchasedTogether } from "../components/FrequentlyPurchasedTogether";

const getPrice = (p: any): number => Number(p.price ?? p.basePrice ?? 0);

export default function CartPage() {
  const {
    items,
    selectedItems,
    selectedIds,
    toggleSelect,
    selectAll,
    deselectAll,
    clear,
    remove,
    update,
    count,
  } = useCart();

  const selectedSubtotal = selectedItems.reduce(
    (acc, item) => acc + getPrice(item.product) * item.quantity,
    0
  );
  const selectedCount = selectedItems.reduce((acc, i) => acc + i.quantity, 0);
  const shipping = selectedSubtotal > 120 ? 0 : 12;
  const total = selectedSubtotal + shipping;
  const freeShippingProgress = Math.min((selectedSubtotal / 120) * 100, 100);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <Layout>
      <Head>
        <title>Cart ({count}) | Badminton Hub</title>
      </Head>

      {/* ── Breadcrumb ──────────────────────────── */}
      <div className="border-b border-black/5 bg-white/60 backdrop-blur-sm">
        <nav className="container-default flex items-center gap-2 py-3 text-xs text-secondary/50">
          <Link href="/" className="transition hover:text-secondary">
            Home
          </Link>
          <ChevronRight size={12} />
          <span className="font-semibold text-secondary/70">Shopping Cart</span>
        </nav>
      </div>

      <section className="section-padding">
        <div className="container-default">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-secondary">Shopping Cart</h1>
              <p className="mt-1 text-sm text-secondary/50">
                {count} {count === 1 ? "item" : "items"} in your cart
                {" • "}
                {selectedCount} selected for checkout
              </p>
              {items.length > 0 && (
                <p className="mt-1 text-xs text-secondary/40">
                  Only selected items will appear on the checkout page.
                </p>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={() => { if (window.confirm("Are you sure you want to clear your cart?")) clear(); }}
                className="flex items-center gap-2 rounded-full border border-black/5 px-4 py-2 text-sm font-semibold text-secondary/50 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
                Clear All
              </button>
            )}
          </div>

          {items.length === 0 ? (
            /* ── Empty State ─────────────────────── */
            <div className="flex flex-col items-center justify-center gap-5 rounded-3xl bg-white py-20 text-center shadow-sm ring-1 ring-black/5">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-gray-50">
                <ShoppingBag size={40} className="text-secondary/15" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-secondary">
                  Your cart is empty
                </h2>
                <p className="mt-1 text-sm text-secondary/50">
                  Looks like you haven&apos;t added any items yet.
                </p>
              </div>
              <Link href="/products" className="btn-primary mt-2 flex items-center gap-2">
                Start Shopping
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            /* ── Cart Content ────────────────────── */
            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
              {/* ── Items List ───────────────────── */}
              <div className="space-y-3">
                {/* Free Shipping Progress */}
                {selectedSubtotal < 120 && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Truck size={16} />
                      <span>
                        Add <strong>${(120 - selectedSubtotal).toFixed(2)}</strong> more for{" "}
                        <strong>free shipping!</strong>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${freeShippingProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {selectedSubtotal >= 120 && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm font-semibold text-emerald-700">
                    <Truck size={16} />
                    You&apos;ve qualified for free shipping! 🎉
                  </div>
                )}

                {/* Table Header (desktop) */}
                <div className="hidden rounded-2xl bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-secondary/40 lg:flex">
                  <span className="w-10" />
                  <span className="flex-1">Product</span>
                  <span className="w-28 text-center">Service</span>
                  <span className="w-28 text-center">Price</span>
                  <span className="w-32 text-center">Quantity</span>
                  <span className="w-28 text-right">Total</span>
                  <span className="w-10" />
                </div>

                {/* Cart Items */}
                {items.slice().reverse().map((item) => {
                  const id = item.product.id || (item.product as any)._id;
                  const price = getPrice(item.product);
                  const lineTotal = price * item.quantity;
                  const brandName =
                    typeof (item.product as any).brand === "object"
                      ? (item.product as any).brand?.name
                      : (item.product as any).brand;

                  return (
                    <div
                      key={id}
                      className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:shadow-card sm:flex-row sm:items-center lg:px-5"
                    >
                      {/* Select */}
                      <div className="flex items-center sm:self-stretch sm:items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleSelect(id)}
                          className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                          aria-label="Select item for checkout"
                        />
                      </div>

                      {/* Image + Info */}
                      <div className="flex flex-1 items-center gap-4">
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"
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
                            <div className="grid h-full w-full place-items-center text-lg font-bold text-secondary/15">
                              {item.product.name.charAt(0)}
                            </div>
                          )}
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="line-clamp-2 text-sm font-semibold text-secondary transition hover:text-primary"
                          >
                            {item.product.name}
                          </Link>
                          {brandName && (
                            <p className="mt-0.5 text-xs text-secondary/40">{brandName}</p>
                          )}

                        </div>
                      </div>

                      {/* Service */}
                      <div className="w-28 text-center text-sm font-semibold text-secondary/70">
                        {item?.variantOptions?.addStringingService ?
                          <div className="flex items-center gap-1 mt-1">
                            <Wrench className="w-3 h-3 text-primary" />
                            <span className="text-[11px] font-semibold text-primary">Stringing: {item.variantOptions.stringType} @ {item.variantOptions.stringTension} lbs</span>
                          </div> : <span className="text-[11px] font-semibold text-primary">No</span>
                        }
                      </div>

                      {/* Price */}
                      <div className="w-28 text-center text-sm font-semibold text-secondary/70">
                        ${price.toFixed(2)}
                      </div>

                      {/* Quantity */}
                      <div className="flex w-32 justify-center">
                        <div className="flex items-center rounded-xl border border-black/5 bg-gray-50">
                          <button
                            onClick={() => update(id, item.quantity - 1)}
                            className="px-3 py-2 text-secondary/50 transition hover:text-secondary"
                            aria-label="Decrease"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-secondary">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => update(id, item.quantity + 1)}
                            className="px-3 py-2 text-secondary/50 transition hover:text-secondary"
                            aria-label="Increase"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>


                      {/* Line Total */}
                      <div className="w-28 text-right text-sm font-bold text-secondary">
                        ${lineTotal.toFixed(2)}
                      </div>

                      {/* Remove */}
                      <div className="w-10 text-right">
                        <button
                          onClick={() => { if (window.confirm("Are you sure you want to remove this item?")) remove(id); }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-secondary/30 transition hover:bg-red-50 hover:text-red-500"
                          aria-label="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Select all toggles */}
                {items.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-secondary/60">
                    <button
                      onClick={allSelected ? deselectAll : selectAll}
                      className="flex items-center gap-2 rounded-full border border-black/5 px-3 py-1.5 font-semibold text-secondary/70 transition hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={allSelected}
                        readOnly
                      />
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                    <span className="text-xs text-secondary/40">
                      Selected {selectedCount} / {count} items
                    </span>
                  </div>
                )}

                {/* Continue Shopping */}
                <Link
                  href="/products"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3"
                >
                  ← Continue Shopping
                </Link>

                <FrequentlyPurchasedTogether
                  productIds={items.map(item => item.product.id || (item.product as any)._id)}
                />
              </div>

              {/* ── Order Summary ────────────────── */}
              <div className="lg:sticky lg:top-24">
                <div className="space-y-5 rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5">
                  <h3 className="font-heading text-xl font-bold text-secondary">
                    Order Summary (selected)
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-secondary/60">
                      <span>Subtotal ({selectedCount} items)</span>
                      <span className="font-semibold text-secondary">${selectedSubtotal.toFixed(2)}</span>
                    </div>
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

                    {/* Coupon */}
                    <div className="flex gap-2">
                      <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/5 bg-gray-50 px-3 py-2.5">
                        <Tag size={14} className="text-secondary/30" />
                        <input
                          placeholder="Coupon code"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-secondary/30"
                          disabled
                        />
                      </div>
                      <button className="rounded-xl bg-secondary px-4 text-xs font-semibold text-white transition hover:bg-secondary/90" disabled>
                        Apply
                      </button>
                    </div>

                    <hr className="border-black/5" />

                    <div className="flex items-center justify-between text-lg font-bold text-secondary">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Link
                    href="/checkout"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
                  >
                    Proceed to Checkout
                    <ArrowRight size={16} />
                  </Link>

                  {/* Trust Signals */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 p-3 text-center">
                      <Truck size={16} className="text-blue-500" />
                      <span className="text-[10px] font-semibold text-secondary/60">
                        Free Ship
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 p-3 text-center">
                      <RotateCcw size={16} className="text-emerald-500" />
                      <span className="text-[10px] font-semibold text-secondary/60">
                        30d Returns
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 p-3 text-center">
                      <Shield size={16} className="text-amber-500" />
                      <span className="text-[10px] font-semibold text-secondary/60">
                        Secure Pay
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
