export interface RawCategory {
  id: number;
  title_ar: string;
  title_en: string;
  icon?: string;
  image: string;
  created_at?: string;
  updated_at?: string;
  collection: number | null;
  collection_ar?: string | null;
  collection_en?: string | null;
  collection_image?: string | null;
  order: number | null;
}

export interface RawSubcategory {
  id: number;
  category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
  icon?: string;
  image: string;
  created_at?: string;
  updated_at?: string;
  sub_collection: number | null | string;
}

