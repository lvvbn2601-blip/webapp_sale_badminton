const fs = require('fs');
const filePath = 'd:/testcodeAI/frontend/components/Navbar.tsx';

if (!fs.existsSync(filePath)) {
  console.error("File not found");
  process.exit(1);
}

const replacements = [
  {
    find: `              <Link>
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white grid place-items-center shadow-md group-hover:scale-105 transition-transform">`,
    replace: `              <Link href="/" className="flex items-center gap-2 group ring-primary focus:outline-none focus:ring-2 rounded-lg py-1 px-2 -ml-2">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white grid place-items-center shadow-md group-hover:scale-105 transition-transform">`
  },
  {
    find: `                    {categories.length > 0 ? categories.map(c => (
                      <Link>
                        {c.name}`,
    replace: `                    {categories.length > 0 ? categories.map(c => (
                      <Link key={c._id || c.id} href={\`/products?category=\${c.slug}\`} className="px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-light transition-colors">
                        {c.name}`
  },
  {
    find: `                    {brands.length > 0 ? brands.map(b => (
                      <Link>
                        {b.name}`,
    replace: `                    {brands.length > 0 ? brands.map(b => (
                      <Link key={b._id || b.id} href={\`/products?brand=\${b.slug}\`} className="px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary-light transition-colors">
                        {b.name}`
  },
  {
    find: `              <Link>
                <Tag size={14} /> Deals`,
    replace: `              <Link href="/products?sale=true" className="px-3 py-2 flex items-center gap-1 hover:text-primary transition-colors text-red-600 dark:text-red-400 font-semibold">
                <Tag size={14} /> Deals`
  },
  {
    find: `            {account?.role !== "admin" && account?.role !== "knitter" && account?.role !== "warehouse_staff" && (
              <Link>
                <Heart size={20} />
              </Link>`,
    replace: `            {account?.role !== "admin" && account?.role !== "knitter" && account?.role !== "warehouse_staff" && (
              <Link href="/wishlist" className="hidden sm:flex p-2 rounded-full text-secondary/70 hover:text-red-500 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors focus:ring-2 focus:ring-primary focus:outline-none" aria-label="Wishlist">
                <Heart size={20} />
              </Link>`
  },
  {
    find: `            {account?.role === "admin" && (
              <Link>
                <LayoutDashboard size={20} />
              </Link>`,
    replace: `            {account?.role === "admin" && (
              <Link href="/admin" className="relative flex items-center justify-center p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" aria-label="Admin Dashboard">
                <LayoutDashboard size={20} />
              </Link>`
  },
  {
    find: `            {account?.role === "knitter" && (
              <Link>
                <LayoutDashboard size={20} />
              </Link>`,
    replace: `            {account?.role === "knitter" && (
              <Link href="/admin/stringers" className="relative flex items-center justify-center p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" aria-label="Admin Dashboard">
                <LayoutDashboard size={20} />
              </Link>`
  },
  {
    find: `            {account?.role === "warehouse_staff" && (
              <Link>
                <LayoutDashboard size={20} />
              </Link>`,
    replace: `            {account?.role === "warehouse_staff" && (
              <Link href="/admin/products" className="relative flex items-center justify-center p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-all duration-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" aria-label="Admin Dashboard">
                <LayoutDashboard size={20} />
              </Link>`
  },
  {
    find: `<Link>
                                <User size={16} /> My Profile
                              </Link>`,
    replace: `<Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-secondary/80 dark:text-gray-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                <User size={16} /> My Profile
                              </Link>`
  },
  {
    find: `<Link>
                                <Package size={16} /> My Purchases
                              </Link>`,
    replace: `<Link href="/profile/purchases" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-secondary/80 dark:text-gray-300 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                                <Package size={16} /> My Purchases
                              </Link>`
  },
  {
    find: `<Link>
                                <Heart size={16} /> Wishlist
                              </Link>`,
    replace: `<Link href="/wishlist" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-secondary/80 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                <Heart size={16} /> Wishlist
                              </Link>`
  },
  {
    find: `<Link>Sign In / Register</Link>`,
    replace: `<Link href="/login?next=/" className="w-full btn-primary py-2.5 flex items-center justify-center">Sign In / Register</Link>`
  }
];

let content = fs.readFileSync(filePath, 'utf8');
let errors = 0;

for (let r of replacements) {
    if (content.includes(r.find)) {
        content = content.replace(r.find, r.replace);
    } else {
        console.warn('Could not find chunk:', r.find);
        errors++;
    }
}

fs.writeFileSync(filePath, content, 'utf8');

if (errors > 0) process.exit(1);
console.log("Restored successfully");
