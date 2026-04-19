import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";

const footerLinks = [
  {
    title: "Shop",
    links: ["Rackets", "Shuttlecocks", "Shoes", "Bags & Gear", "Sale"],
  },
  {
    title: "Support",
    links: ["Help Center", "Shipping", "Returns", "Warranty", "Size Guide"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Sustainability"],
  },
];

export function Footer() {
  return (
    <footer className="bg-secondary text-white">
      <div className="container-default grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-heading text-xl font-semibold">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">B</span>
            Badminton Hub
          </div>
          <p className="text-sm text-white/70">
            Your dedicated badminton store for rackets, strings, footwear, and court-ready accessories.
          </p>
          <div className="flex gap-3 text-white/80">
            <Link href="#" aria-label="Facebook">
              <Facebook size={18} />
            </Link>
            <Link href="#" aria-label="Instagram">
              <Instagram size={18} />
            </Link>
            <Link href="#" aria-label="Twitter">
              <Twitter size={18} />
            </Link>
          </div>
        </div>
        {footerLinks.map((column) => (
          <div key={column.title} className="space-y-3">
            <h4 className="font-semibold">{column.title}</h4>
            <div className="space-y-2 text-sm text-white">
              {column.links.map((link) => (
                <Link key={link} href="#" className="block text-white hover:text-red-500">
                  {link}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="space-y-3">
          <h4 className="font-semibold">Newsletter</h4>
          <p className="text-sm text-white/70">
            Get new arrivals, restring tips, and match-day deals first.
          </p>
          <div className="flex gap-2">
            <input
              placeholder="Email address"
              className="w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
              Join
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Badminton Hub. All rights reserved.
      </div>
    </footer>
  );
}
