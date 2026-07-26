export type MerchantStatus = 'active' | 'away' | 'offline';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type InventoryHealth = 'healthy' | 'low_stock' | 'out_of_stock';

export interface Merchant {
  id: string;
  name: string;
  logo: string;
  banner: string;
  verified: boolean;
  category: string;
  status: MerchantStatus;
  joinedDate: string;
  location: {
    city: string;
    country: string;
  };
  metrics: MerchantMetrics;
  social: {
    followers: number;
    following: number;
  };
}

export interface MerchantMetrics {
  productsCount: number;
  ordersCount: number;
  customersCount: number;
  rating: number;
  reviewCount: number;
  revenue: number;
  completionRate: number;
  responseRate: number;
}

export interface MerchantOverview {
  productsCount: number;
  ordersCount: number;
  customersCount: number;
  rating: number;
  revenue: number;
  completionRate: number;
  responseRate: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

export interface StoreInformation {
  about: string;
  description: string;
  categories: string[];
  shippingCoverage: string[];
  returnPolicy: string;
  specialties: string[];
}

export interface PerformanceMetrics {
  revenueToday: number;
  revenueThisMonth: number;
  ordersToday: number;
  ordersThisMonth: number;
  conversionRate: number;
  averageOrderValue: number;
  bestSellingCategory: string;
  inventoryHealth: InventoryHealth;
}

export interface Collection {
  id: string;
  name: string;
  coverImage: string;
  itemCount: number;
  type: 'fashion' | 'seasonal' | 'trending';
}

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  salesCount: number;
  rating: number;
  reviewCount: number;
  stockStatus: StockStatus;
  stockCount: number;
  category: string;
}

export interface Order {
  id: string;
  customer: {
    name: string;
    avatar: string;
  };
  value: number;
  status: OrderStatus;
  createdAt: string;
  items: number;
}

export interface Review {
  id: string;
  customer: {
    name: string;
    avatar: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
  productName: string;
  helpful: number;
}

export interface RatingDistribution {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

export interface TrustCredential {
  id: string;
  type: 'verified' | 'secure_payments' | 'fast_shipping' | 'return_policy';
  title: string;
  description: string;
  icon: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SellerBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface MerchantProfileData {
  merchant: Merchant;
  overview: MerchantOverview;
  quickActions: QuickAction[];
  storeInformation: StoreInformation;
  performance: PerformanceMetrics;
  collections: Collection[];
  bestSellingProducts: Product[];
  recentOrders: Order[];
  reviews: Review[];
  ratingDistribution: RatingDistribution;
  trustCredentials: TrustCredential[];
  achievements: Achievement[];
  badges: SellerBadge[];
}
