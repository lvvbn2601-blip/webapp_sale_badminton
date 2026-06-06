export type Category = {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
};

export type Product = {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  price: number;
  basePrice?: number;
  rating: number;
  reviewCount?: number;
  image: string;
  category: string | { _id: string; name: string; slug: string };
  brand: string | { _id: string; name: string; slug: string };
  sizes?: string[];
  description: string;
  stock?: number;
  discount?: number;
  isTrending?: boolean;
  isBestSeller?: boolean;
  badges?: string[];
  specs?: Record<string, string>;
  images?: string[];
};

export type Review = {
  id: string;
  _id?: string;
  user: string | { _id?: string; name?: string; email?: string; avatar?: string };
  rating: number;
  comment: string;
  date: string;
  title?: string;
  tags?: string[];
  images?: string[];
  videos?: string[];
  helpfulCount?: number;
  verified?: boolean;
  status?: "pending" | "approved" | "rejected";
  adminReply?: string;
  adminReplyAt?: string;
  isFeatured?: boolean;
  product?: string | { _id?: string; name?: string; slug?: string; image?: string };
  createdAt?: string;
  updatedAt?: string;
};

export type Brand = {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
};

export type VariantOptions = {
  selectedColor?: string;
  selectedGrip?: string;     // G4 / G5 / G6
  selectedSize?: string;     // EU shoe size
  selectedBagType?: string;  // 2-comp / 3-comp / backpack
  selectedMaterial?: string; // feather / nylon (shuttlecocks)
  selectedSpeed?: number;    // 75-78 (shuttlecocks)
  purchaseUnit?: number;     // box qty (shuttlecocks)
  accessoryType?: string;    // strings / grip / shoe soles / wristbands
  // Stringing service
  addStringingService?: boolean;
  stringType?: string;
  stringName?: string;
  stringPrice?: number;
  stringTension?: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};
