import { z } from 'zod';

export const storeIdentitySchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(100, 'Store name must be less than 100 characters'),
  storeDescription: z.string().min(20, 'Description must be at least 20 characters').max(500, 'Description must be less than 500 characters'),
  storeStory: z.string().max(1000, 'Story must be less than 1000 characters').optional(),
  storeCategory: z.string().min(1, 'Please select a category'),
  storeSpecialties: z.array(z.string()).min(1, 'Please select at least one specialty'),
});

export const merchantInfoSchema = z.object({
  merchantName: z.string().min(2, 'Name must be at least 2 characters'),
  businessType: z.enum(['individual', 'sole_proprietor', 'llc', 'corporation', 'partnership']),
  companyName: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  businessAge: z.number().min(0, 'Years must be 0 or greater').optional(),
});

export const contactInfoSchema = z.object({
  phoneNumber: z.string().min(5, 'Please enter a valid phone number'),
  whatsappNumber: z.string().optional(),
  email: z.string().email('Please enter a valid email'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

export const locationSchema = z.object({
  country: z.string().min(1, 'Please select a country'),
  city: z.string().min(1, 'Please enter a city'),
  address: z.string().min(5, 'Please enter a valid address'),
  postalCode: z.string().optional(),
});

export const categoriesSchema = z.object({
  selectedCategories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    isSelected: z.boolean(),
    subcategories: z.array(z.string()),
  })).min(1, 'Please select at least one category'),
});

export const shippingSchema = z.object({
  methods: z.array(z.object({
    id: z.string(),
    provider: z.string(),
    name: z.string(),
    deliveryDays: z.object({
      min: z.number(),
      max: z.number(),
    }),
    fee: z.number().min(0),
    freeThreshold: z.number().nullable(),
    isActive: z.boolean(),
  })).min(1, 'Please add at least one shipping method'),
});

export const returnPolicySchema = z.object({
  policyType: z.enum(['no_returns', 'exchange_only', 'full_returns', 'store_credit']),
  returnPeriod: z.number().min(0).max(365, 'Return period must be between 0 and 365 days'),
  policyDescription: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export const brandIdentitySchema = z.object({
  mission: z.string().min(20, 'Mission must be at least 20 characters').max(300, 'Mission must be less than 300 characters'),
  vision: z.string().min(20, 'Vision must be at least 20 characters').max(300, 'Vision must be less than 300 characters'),
  uniqueSellingPoints: z.array(z.string()).min(1, 'Please add at least one unique selling point'),
});

export const productSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Please select a category'),
  basePrice: z.number().min(0.01, 'Price must be greater than 0'),
});

export const collectionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

const storeCategories = [
  'Women\'s Fashion',
  'Men\'s Fashion',
  'Kids & Baby',
  'Accessories',
  'Footwear',
  'Bags & Luggage',
  'Jewelry',
  'Sportswear',
  'Luxury',
  'Sustainable Fashion',
] as const;

const businessTypes = [
  { value: 'individual', label: 'Individual Seller' },
  { value: 'sole_proprietor', label: 'Sole Proprietor' },
  { value: 'llc', label: 'Limited Liability Company' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
] as const;

const fashionCategories = [
  { id: 'menswear', name: 'Menswear', subcategories: ['Suits', 'Casual', 'Formal', 'Outerwear', 'Activewear'] },
  { id: 'womenswear', name: 'Womenswear', subcategories: ['Dresses', 'Tops', 'Bottoms', 'Outerwear', 'Activewear'] },
  { id: 'kids', name: 'Kids & Baby', subcategories: ['Infants', 'Toddlers', 'Kids', 'Teens'] },
  { id: 'shoes', name: 'Footwear', subcategories: ['Heels', 'Sneakers', 'Boots', 'Sandals', 'Formal'] },
  { id: 'bags', name: 'Bags & Accessories', subcategories: ['Handbags', 'Backpacks', 'Wallets', 'Belts', 'Scarves'] },
  { id: 'jewelry', name: 'Jewelry', subcategories: ['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches'] },
  { id: 'sportswear', name: 'Sportswear', subcategories: ['Athletic', 'Yoga', 'Running', 'Swimming', 'Outdoors'] },
  { id: 'casual', name: 'Casual Wear', subcategories: ['T-Shirts', 'Jeans', 'Hoodies', 'Shorts', 'Casual Dresses'] },
  { id: 'formal', name: 'Formal Wear', subcategories: ['Suits', 'Evening Gowns', 'Cocktail', 'Business', 'Ceremony'] },
  { id: 'custom', name: 'Custom/Bespoke', subcategories: ['Tailored Suits', 'Custom Dresses', 'Alterations', 'Bespoke'] },
] as const;

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
  'Japan', 'South Korea', 'Singapore', 'United Arab Emirates',
] as const;

const specialties = [
  'Sustainable Materials',
  'Handcrafted',
  'Limited Edition',
  'Custom Tailoring',
  'Ethical Fashion',
  'Plus Sizes',
  'Petite Sizes',
  'Luxury Materials',
  'Vintage Style',
  'Minimalist Design',
  'Bold Prints',
  'Classic Elegance',
] as const;

const brandValues = [
  'Sustainability',
  'Quality',
  'Innovation',
  'Tradition',
  'Accessibility',
  'Luxury',
  'Minimalism',
  'Creativity',
  'Inclusivity',
  'Transparency',
] as const;

export const constants = {
  storeCategories,
  businessTypes,
  fashionCategories,
  countries,
  specialties,
  brandValues,
};

export type StoreIdentityForm = z.infer<typeof storeIdentitySchema>;
export type MerchantInfoForm = z.infer<typeof merchantInfoSchema>;
export type ContactInfoForm = z.infer<typeof contactInfoSchema>;
export type LocationForm = z.infer<typeof locationSchema>;
export type CategoriesForm = z.infer<typeof categoriesSchema>;
export type ShippingForm = z.infer<typeof shippingSchema>;
export type ReturnPolicyForm = z.infer<typeof returnPolicySchema>;
export type BrandIdentityForm = z.infer<typeof brandIdentitySchema>;
export type ProductForm = z.infer<typeof productSchema>;
export type CollectionForm = z.infer<typeof collectionSchema>;
