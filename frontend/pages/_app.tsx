import type { AppProps } from "next/app";
import { Inter, Poppins } from "next/font/google";
import "../styles/globals.css";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { CompareProvider } from "../context/CompareContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} ${poppins.variable}`}>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <Component {...pageProps} />
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </div>
  );
}
