// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

// ── Category ──────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Category[];
  _count?: { products: number };
}

// ── Product ───────────────────────────────────────────────────────────────────
export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  position: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  nameEn: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  attributes: Record<string, string>; // e.g. { color: 'red', size: 'M' }
}

export interface Product {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  descriptionEn: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string;
  images: ProductImage[];
  variants: ProductVariant[];
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  avgRating: number | null;
  reviewCount: number;
  createdAt: string;
}

// ── Cart ──────────────────────────────────────────────────────────────────────
export interface CartItem {
  cartItemId: string;
  productId: string;
  variantId: string | null;
  name: string;
  nameEn: string | null;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  maxQuantity: number;
  variant: Pick<ProductVariant, 'name' | 'attributes'> | null;
}

// ── Order ─────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'stripe' | 'vnpay' | 'cod';

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  shippingAddress: Address;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// ── Address ───────────────────────────────────────────────────────────────────
export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  province: string;
  country: string;
  isDefault?: boolean;
}

// ── Review ────────────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  user: Pick<User, 'id' | 'fullName' | 'avatar'>;
  createdAt: string;
}

// ── Blog ──────────────────────────────────────────────────────────────────────
export interface BlogPost {
  id: string;
  title: string;
  titleEn: string | null;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  author: Pick<User, 'id' | 'fullName' | 'avatar'>;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
