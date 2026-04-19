import { ReactNode, useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { useCart } from "../context/CartContext";
import { useTracking } from "../lib/useTracking";
import { X, Gift, Clock } from "lucide-react";

type Props = {
  children: ReactNode;
  showFooter?: boolean;
};

export function Layout({ children, showFooter = true }: Props) {
  const [cartOpen, setCartOpen] = useState(false);
  const { items } = useCart();
  const { trackEvent, fetchRecommendations, recommendations, sessionId } = useTracking();
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState<any>(null);

  useEffect(() => {
    // Initial tracking on page load
    trackEvent('view', undefined, 'page', { pathname: window.location.pathname });

    // Fetch recommendations for popups
    fetchRecommendations().then(rec => {
      if (rec?.strategy === 'sale_hunting' && !localStorage.getItem('popup_sale_hunting')) {
        setPopupContent({ type: 'first_time', title: 'Welcome new customer!', message: 'Get an instant 50K discount and free shipping on your first order over 500K VND. Use code: NEWBIE50' });
        setShowPopup(true);
        localStorage.setItem('popup_sale_hunting', 'true');
      } else if (rec?.strategy === 'cart_abandonment') {
        setPopupContent({ type: 'abandonment', title: 'Forgot something?', message: 'Your items are waiting! Complete your purchase in the next 24h with 5% off.' });
        setShowPopup(true);
      }
    });

    // Handle session timing
    let startTime = Date.now();
    return () => {
      let duration = Date.now() - startTime;
      trackEvent('leave', undefined, 'page', { pathname: window.location.pathname, duration });
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onCartClick={() => setCartOpen(true)} />
      <main className="pb-20 lg:pb-0">{children}</main>
      {showFooter && <Footer />}
      <CartDrawer open={cartOpen} items={items} onClose={() => setCartOpen(false)} />

      {/* Tracking Recommend Popup */}
      {showPopup && popupContent && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-8 fade-in duration-500 ease-out">
          <div className="relative w-80 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className={`h-2 ${popupContent.type === 'first_time' ? 'bg-primary' : 'bg-red-500'}`} />
            <div className="p-5">
              <button onClick={() => setShowPopup(false)} className="absolute right-4 top-4 text-black/40 hover:text-black">
                <X size={16} />
              </button>
              <div className="flex items-start gap-4">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${popupContent.type === 'first_time' ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-500'}`}>
                  {popupContent.type === 'first_time' ? <Gift size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-secondary">{popupContent.title}</h4>
                  <p className="mt-1 text-sm text-secondary/70">{popupContent.message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
