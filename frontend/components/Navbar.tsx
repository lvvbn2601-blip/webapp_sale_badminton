import { confirmAction } from "./ConfirmModal";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingBag, User, Search, Menu, X, Home, Bell,
  Heart, Sun, Moon, ChevronDown, Clock, Tag,
  Settings, LogOut, Package, ArrowRight, TrendingUp, LayoutDashboard
} from "lucide-react";
import { useCart, getCartItemId } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useRouter } from "next/router";
import Image from "next/image";

import { fetchProducts, fetchCategories, fetchBrands, fetchUnreadNotificationCount } from "../lib/api";

type Props = {
  onCartClick?: () => void;
};

export function Navbar({ onCartClick }: Props) {
  const router = useRouter();
  const { count, items, selectedIds, toggleSelect, selectAll, deselectAll, remove } = useCart();
  const wishlist = useWishlist();

  // States
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [account, setAccount] = useState<{ name?: string; email?: string; role?: "user" | "admin" | "knitter" | "warehouse_staff" } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Search States
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch menus
  useEffect(() => {
    Promise.all([fetchCategories(), fetchBrands()])
      .then(([cats, brs]) => {
        setCategories(cats.slice(0, 6)); // limit to 6 for UI neatness
        setBrands(brs.slice(0, 6));
      })
      .catch(err => console.error("Failed to fetch menus", err));
  }, []);

  // Fetch unread notification count (skip for admins — they see notifications on admin page)
  useEffect(() => {
    const fetchCount = () => {
      if (typeof window === "undefined") return;
      const t = localStorage.getItem("accessToken");
      if (!t) { setUnreadCount(0); return; }
      // Skip for admin users
      try {
        const raw = localStorage.getItem("user");
        const u = raw ? JSON.parse(raw) : null;
        if (u?.role === "admin") { setUnreadCount(0); return; }
      } catch { }
      fetchUnreadNotificationCount(t)
        .then((res) => setUnreadCount(res.count))
        .catch(() => setUnreadCount(0));
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    window.addEventListener("auth:user-updated", fetchCount as any);
    return () => { clearInterval(interval); window.removeEventListener("auth:user-updated", fetchCount as any); };
  }, []);

  // Account sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const readAccount = () => {
      try {
        const raw = localStorage.getItem("user");
        setAccount(raw ? JSON.parse(raw) : null);
      } catch {
        setAccount(null);
      }

      try {
        const history = localStorage.getItem("recentSearches");
        if (history) setRecentSearches(JSON.parse(history));
      } catch { }
    };
    readAccount();
    window.addEventListener("storage", readAccount);
    window.addEventListener("auth:user-updated", readAccount as any);
    return () => window.removeEventListener("storage", readAccount);
  }, []);

  // Dark mode sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const fetchResults = async () => {
      setIsSearching(true);
      try {
        const json = await fetchProducts({ search: debouncedQuery });
        if (json?.data) {
          setSearchResults(json.data.slice(0, 5));
        }
      } catch (err) {
        console.error("Search fetch error", err);
      } finally {
        setIsSearching(false);
      }
    };
    fetchResults();
  }, [debouncedQuery]);

  // Handle outside click for search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      setIsDark(true);
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:user-updated"));
    }
    setAccountOpen(false);
    router.push("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const finalQuery = typeof e === "string" ? e : query;
    if (!finalQuery.trim()) return;

    // Save to recent
    const nextRecents = [finalQuery, ...recentSearches.filter(s => s !== finalQuery)].slice(0, 5);
    setRecentSearches(nextRecents);
    if (typeof window !== "undefined") {
      localStorage.setItem("recentSearches", JSON.stringify(nextRecents));
    }

    setSearchFocused(false);
    router.push(`/products?search=${encodeURIComponent(finalQuery)}`);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? "bg-white/95 dark:bg-gray-900/95 shadow-md backdrop-blur-md" : "bg-white dark:bg-gray-900 border-b border-black/5 dark:border-white/5"
          }`}
      >
        <div className="container-default mx-auto px-4 h-20 flex items-center justify-between gap-6">

          {/* Left: Logo & Menus */}
          <div className="flex items-center gap-4 lg:gap-8 transition-all duration-300 shrink-0">
            <div className="flex items-center gap-3 shrink-0">
              <button
                className="lg:hidden rounded-lg p-2 text-secondary dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => setMobileOpen(true)}
                aria-label="Open mobile menu"
              >
                <Menu size={24} />
              </button>
              <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white grid place-items-center shadow-md group-hover:scale-105 transition-transform">
                  <span className="font-heading font-bold text-lg">B</span>
                </div>
                <span className="font-heading text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-secondary to-gray-600 dark:from-white dark:to-gray-300 hidden sm:block">
                  Badminton Hub
                </span>
              </Link>
            </div>

            <nav className={`hidden lg:flex items-center gap-1 font-medium text-sm text-secondary/80 dark:text-gray-300 transition-all duration-500 ease-in-out whitespace-nowrap ${searchFocused ? "max-w-0 opacity-0 pointer-events-none -translate-x-4" : "max-w-[500px] opacity-100 translate-x-0"}`}>
              <div className="relative group px-3 py-2 cursor-pointer hover:text-primary transition-colors">
                <span className="flex items-center gap-1">Categories <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" /></span>
                <div className="absolute top-full left-0 w-48 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-black/5 dark:border-white/10 p-2 flex flex-col gap-1">
                    {categories.length > 0 ? categories.map(c => (
                      <Link key={c._id || c.id} href={`/products?category=${c.slug}`} className="block px-3 py-2 rounded-lg text-sm text-secondary dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                    )) : (
                      <div className="px-3 py-2 text-secondary/50 text-xs">Loading...</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative group px-3 py-2 cursor-pointer hover:text-primary transition-colors">
                <span className="flex items-center gap-1">Brands <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" /></span>
                <div className="absolute top-full left-0 w-48 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-black/5 dark:border-white/10 p-2 flex flex-col gap-1">
                    {brands.length > 0 ? brands.map(b => (
                      <Link key={b._id || b.id} href={`/products?brand=${b.slug}`} className="block px-3 py-2 rounded-lg text-sm text-secondary dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition-colors">
                        {b.name}
                      </Link>
                    )) : (
                      <div className="px-3 py-2 text-secondary/50 text-xs">Loading...</div>
                    )}
                  </div>
                </div>
              </div>

              <Link href="/stringing" className="px-3 py-2 hover:text-primary transition-colors flex items-center gap-1.5">
                🔧 <span>Stringing</span>
              </Link>

            </nav>
          </div>

          {/* Center: Search Bar */}
          <div className={`hidden md:flex flex-1 transition-all duration-500 ease-in-out ${searchFocused ? "max-w-3xl" : "max-w-xl"}`} ref={searchRef}>
            <div className="relative w-full group">
              <form onSubmit={handleSearchSubmit} className="relative z-10">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/40 dark:text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  className="w-full h-11 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:bg-white focus:border-primary dark:focus:bg-gray-900 rounded-full pl-12 pr-4 text-sm font-medium text-secondary dark:text-white placeholder:text-secondary/40 dark:placeholder:text-gray-500 transition-all outline-none"
                  placeholder="Search rackets, shoes, brands..."
                  aria-label="Search products"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(""); document.querySelector('input')?.focus() }} className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/40 hover:text-secondary dark:text-gray-400 dark:hover:text-white transition-colors" aria-label="Clear search">
                    <X size={16} />
                  </button>
                )}
              </form>

              {/* Autocomplete Dropdown */}
              {searchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 flex flex-col gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">

                    {/* Suggestions logic */}
                    {debouncedQuery.length > 0 ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-secondary/50 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">Matches</p>
                          {isSearching ? (
                            <div className="px-3 py-4 text-center text-sm text-secondary/50 flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Loading...
                            </div>
                          ) : searchResults.length > 0 ? (
                            <div className="space-y-1">
                              {searchResults.map((product: any) => (
                                <button key={product._id} onClick={() => { setSearchFocused(false); router.push(`/products/${product.slug}`); }} className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 group/btn">
                                  <div className="w-10 h-10 rounded-md bg-white border border-black/5 overflow-hidden shrink-0">
                                    {product.image && <img src={product.image} className="w-full h-full object-cover" alt="" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-secondary dark:text-white group-hover/btn:text-primary transition-colors">{product.name}</p>
                                    <p className="text-xs text-secondary/50 dark:text-gray-400 font-semibold">${product.price || product.basePrice || 0}</p>
                                  </div>
                                </button>
                              ))}
                              <button onClick={() => handleSearchSubmit(debouncedQuery)} className="w-full text-left px-3 py-3 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 mt-2">
                                View all results for "{debouncedQuery}" <ArrowRight size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="px-3 py-3 text-sm text-secondary/60">No products found holding "{debouncedQuery}"</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between px-2 mb-2">
                              <p className="text-xs font-bold text-secondary/50 dark:text-gray-400 uppercase tracking-wider">Recent</p>
                              <button onClick={() => { setRecentSearches([]); if (typeof window !== 'undefined') localStorage.removeItem('recentSearches'); }} className="text-xs font-medium text-primary hover:underline focus:outline-none">Clear</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {recentSearches.map(s => (
                                <button key={s} onClick={() => handleSearchSubmit(s)} className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 border border-black/5 dark:border-white/5 px-3 py-1.5 rounded-full text-sm text-secondary dark:text-gray-200 transition-colors focus:ring-2 focus:ring-primary focus:outline-none">
                                  <Clock size={12} className="text-secondary/50 dark:text-gray-400" /> {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Trending */}
                        <div>
                          <p className="text-xs font-bold text-secondary/50 dark:text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-1.5"><TrendingUp size={14} /> Trending Now</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { name: "Astrox 99 Pro", img: "https://cdn.shopvnb.com/uploads/gallery/vot-cau-long-yonex-astrox-99-pro-trang-chinh-hang_1711156847.webp" },
                              { name: "Aerus Z", img: "https://cdn.shopvnb.com/uploads/gallery/giay-cau-long-yonex-aerus-z-men-xanh-chuoi-ma-jp_1650325492.webp" },
                              { name: "ArCSaber 11", img: "https://cdn.shopvnb.com/uploads/gallery/vot-cau-long-yonex-arcsaber-11-play-chinh-hang_1711155988.webp" }
                            ].map((t, i) => (
                              <button key={i} onClick={() => handleSearchSubmit(t.name)} className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-black/5 dark:hover:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary">
                                <div className="w-10 h-10 shrink-0 bg-white rounded-lg overflow-hidden border border-black/5"><img src={t.img} alt={t.name} className="w-full h-full object-cover" loading="lazy" /></div>
                                <span className="text-sm font-semibold text-secondary dark:text-gray-200 line-clamp-1">{t.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Bottom bar */}
                  <div className="bg-gray-50 dark:bg-gray-900 border-t border-black/5 dark:border-white/10 px-4 py-3 flex justify-between items-center text-xs text-secondary/50 dark:text-gray-500 font-medium">
                    <span>Press <kbd className="font-sans px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-md shadow-sm">Enter</kbd> to search</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">


            {account?.role !== "admin" && account?.role !== "knitter" && account?.role !== "warehouse_staff" && (
              <Link href="/profile/notifications" className="hidden sm:flex relative p-2 rounded-full text-secondary/70 hover:text-primary hover:bg-primary/10 dark:text-gray-400 dark:hover:text-primary-light transition-colors focus:ring-2 focus:ring-primary focus:outline-none" aria-label="Notifications">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {account?.role !== "admin" && account?.role !== "knitter" && account?.role !== "warehouse_staff" && (
              <Link href="/wishlist" className="relative hidden sm:flex p-2 rounded-full text-secondary/70 hover:text-primary hover:bg-primary/10 dark:text-gray-400 dark:hover:text-primary-light transition-colors focus:ring-2 focus:ring-primary focus:outline-none" aria-label="Wishlist">
                <Heart size={20} />
                {wishlist.items.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 scale-100 origin-center">
                    {wishlist.items.length > 99 ? '99+' : wishlist.items.length}
                  </span>
                )}
              </Link>
            )}

            {account?.role !== "admin" && account?.role !== "knitter" && account?.role !== "warehouse_staff" && (
              <div className="relative group" onMouseEnter={() => setCartOpen(true)} onMouseLeave={() => setCartOpen(false)}>
                <button onClick={onCartClick} className="relative flex items-center justify-center p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-300 focus:ring-2 focus:ring-primary focus:outline-none" aria-label="Shopping Cart">
                  <ShoppingBag size={20} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 scale-100 origin-center transition-transform group-hover:scale-110">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>

                {/* Mini Cart Dropdown */}
                {cartOpen && (
                  <div className="absolute right-0 top-full pt-4 w-80 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                      <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex flex-col gap-3 bg-gray-50 dark:bg-gray-900">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-secondary dark:text-white">Your Cart</span>
                          <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">{count} items</span>
                        </div>
                        {items.length > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer w-fit">
                            <input
                              type="checkbox"
                              checked={items.length > 0 && selectedIds.length === items.length}
                              onChange={() => selectedIds.length === items.length ? deselectAll() : selectAll()}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className="text-xs font-medium text-secondary/60 dark:text-gray-400">Select all</span>
                          </label>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto custom-scrollbar p-3 space-y-1">
                        {items.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                            <ShoppingBag size={32} className="text-black/10 dark:text-white/10 mb-3" />
                            <p className="text-secondary/60 dark:text-gray-400 text-sm font-medium">Your cart is empty.</p>
                          </div>
                        ) : (
                          items.slice(0, 3).map((item, idx) => {
                            const pid = getCartItemId(item);
                            return (
                              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border border-transparent hover:border-black/5">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(pid)}
                                  onChange={(e) => { e.stopPropagation(); toggleSelect(pid); }}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0 cursor-pointer"
                                />
                                <div className="w-14 h-14 bg-white rounded-lg border border-black/10 overflow-hidden shrink-0">
                                  {item.product.image && <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" loading="lazy" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-secondary dark:text-white line-clamp-1">{item.product.name}</p>
                                  <p className="text-xs text-secondary/60 dark:text-gray-400 mt-0.5">Qty {item.quantity}  ×  ${(item.product.price || (item.product as any).basePrice || 0).toFixed(2)}</p>
                                </div>
                                <button onClick={async (e) => { e.stopPropagation(); if (await confirmAction("Are you sure you want to remove this item?")) remove(pid); }} className="p-1.5 text-secondary/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition" aria-label="Remove item">
                                  <X size={14} />
                                </button>
                              </div>
                            )
                          })
                        )}
                        {items.length > 3 && (
                          <div className="text-center py-2 text-xs font-semibold text-primary/80">+ {items.length - 3} more items</div>
                        )}
                      </div>

                      {items.length > 0 && (() => {
                        const selectedItems = items.filter(i => selectedIds.includes(getCartItemId(i)));
                        const selectedSubtotal = selectedItems.reduce((acc, item) => acc + (item.product.price || (item.product as any).basePrice || 0) * item.quantity, 0);
                        return (
                          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-black/5 dark:border-white/10 space-y-3">
                            <div className="flex items-center justify-between font-bold text-secondary dark:text-white">
                              <span>Subtotal (selected)</span>
                              <span>${selectedSubtotal.toFixed(2)}</span>
                            </div>
                            <button onClick={onCartClick} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 group/chk">
                              Checkout Selected <ArrowRight size={16} className="group-hover/chk:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {account?.role === "admin" && (
              <Link href="/admin" className="flex items-center justify-center p-2 rounded-full text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors" aria-label="Admin Dashboard">
                <LayoutDashboard size={20} />
              </Link>
            )}

            {account?.role === "knitter" && (
              <Link href="/admin/stringers" className="flex items-center justify-center p-2 rounded-full text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors" aria-label="Stringer Dashboard">
                <LayoutDashboard size={20} />
              </Link>
            )}

            {account?.role === "warehouse_staff" && (
              <Link href="/admin/products" className="flex items-center justify-center p-2 rounded-full text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors" aria-label="Warehouse Dashboard">
                <LayoutDashboard size={20} />
              </Link>
            )}

            <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 sm:mx-2 hidden sm:block"></div>

            {/* User Dropdown */}
            <div className="relative group" onMouseEnter={() => setAccountOpen(true)} onMouseLeave={() => setAccountOpen(false)}>
              <div
                className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20 bg-white dark:bg-gray-800 cursor-pointer transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                tabIndex={0}
                aria-label="User Account"
              >
                <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                  {account?.name ? <span className="text-xs font-bold uppercase">{account.name.charAt(0)}</span> : <User size={14} />}
                </div>
                <span className="text-sm font-semibold text-secondary dark:text-white hidden xl:block max-w-[100px] truncate">{account?.name || "Sign In"}</span>
              </div>

              {accountOpen && (
                <div className="absolute right-0 top-full pt-3 w-60 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-black/5 dark:border-white/10 overflow-hidden">
                    {account ? (
                      <>
                        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
                          <p className="font-bold text-secondary dark:text-white truncate">{account.name}</p>
                          <p className="text-xs text-secondary/60 dark:text-gray-400 mt-0.5 truncate">{account.email}</p>
                        </div>
                        <div className="p-2 space-y-0.5">
                          {account.role !== "admin" ? (
                            <>
                              <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <User size={16} /> My Profile
                              </Link>
                              <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <Package size={16} /> My Purchases
                              </Link>
                              <Link href="/wishlist" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <Heart size={16} /> Wishlist
                              </Link>
                              <div className="h-px bg-black/5 dark:bg-white/10 my-2"></div>
                            </>
                          ) : (
                            <div className="px-3 py-2 mb-1 text-xs font-bold text-secondary/40 dark:text-gray-500 uppercase tracking-wider">
                              Admin Session
                            </div>
                          )}
                          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left">
                            <LogOut size={16} /> Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center">
                        <ShoppingBag size={32} className="mx-auto text-primary/20 mb-3" />
                        <p className="text-sm font-semibold text-secondary dark:text-white mb-4">Sign in to sync your cart and access orders.</p>
                        <Link href="/login" className="w-full btn-primary py-2.5 flex justify-center items-center rounded-xl">Sign In / Register</Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer */}
      <div className={`fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-[70] lg:hidden transition-transform duration-300 ease-in-out flex flex-col ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <Link href="/" className="flex items-center gap-2 group ring-primary focus:outline-none focus:ring-2 rounded-lg py-1 pr-2" onClick={() => setMobileOpen(false)}>
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-orange-600 text-white grid place-items-center">
              <span className="font-heading font-bold text-sm">B</span>
            </div>
            <span className="font-heading text-lg font-bold text-secondary dark:text-white">
              Hub
            </span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="p-2 bg-black/5 dark:bg-white/10 rounded-full text-secondary hover:text-black dark:text-gray-300 dark:hover:text-white transition focus:outline-none focus:ring-2 focus:ring-primary">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          <form onSubmit={(e) => { handleSearchSubmit(e); setMobileOpen(false); }} className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/40 dark:text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-12 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:bg-white focus:border-primary dark:focus:bg-gray-900 rounded-xl pl-12 pr-4 text-sm font-medium text-secondary dark:text-white transition-all outline-none"
              placeholder="Search products..."
            />
          </form>

          <div className="space-y-3">
            <p className="text-xs font-bold text-secondary/40 dark:text-gray-500 uppercase tracking-wider">Categories</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.length > 0 ? categories.map(c => (
                <Link key={c._id || c.id} href={`/products?category=${c.slug}`} onClick={() => setMobileOpen(false)} className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition border border-transparent hover:border-primary/20">
                  {c.name}
                </Link>
              )) : (
                <div className="text-secondary/50 text-xs px-2">Loading...</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-secondary/40 dark:text-gray-500 uppercase tracking-wider">Top Brands</p>
            <div className="grid grid-cols-2 gap-2">
              {brands.length > 0 ? brands.map(b => (
                <Link key={b._id || b.id} href={`/products?brand=${b.slug}`} onClick={() => setMobileOpen(false)} className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-primary/10 hover:text-primary transition border border-transparent hover:border-primary/20">
                  {b.name}
                </Link>
              )) : (
                <div className="text-secondary/50 text-xs px-2">Loading...</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/stringing" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 bg-primary/10 px-4 py-3 rounded-xl text-sm font-bold text-primary hover:bg-primary/20 transition border border-primary/20">
              🔧 Stringing Service
            </Link>
          </div>

          <div className="h-px bg-black/5 dark:bg-white/10 w-full" />

          <div className="space-y-1">
            {account?.role !== "admin" ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <User size={18} className="text-secondary/40 dark:text-gray-400" /> Account Settings
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <Package size={18} className="text-secondary/40 dark:text-gray-400" /> My Orders
                </Link>
                <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-secondary dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <Heart size={18} className="text-secondary/40 dark:text-gray-400" /> Wishlist
                </Link>
              </>
            ) : (
              <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">
                <LayoutDashboard size={18} className="text-blue-500" /> Admin Dashboard
              </Link>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-black/5 dark:border-white/10 bg-gray-50 dark:bg-gray-900/50">
          {account ? (
            <button onClick={() => { logout(); setMobileOpen(false); }} className="w-full btn-outline border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 py-3 flex justify-center items-center gap-2">
              <LogOut size={16} /> Sign Out
            </button>
          ) : (
            <Link href="/login?next=/" onClick={() => setMobileOpen(false)} className="w-full btn-primary py-3 flex justify-center items-center">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
