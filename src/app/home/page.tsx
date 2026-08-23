import HomeScreen from '@/features/home/ui';
import { categoryService } from '@/features/categories';

export default function HomePage() {
  const displayCategories = categoryService.getAllDisplayCategories();
  return <HomeScreen displayCategories={displayCategories} />;
}
