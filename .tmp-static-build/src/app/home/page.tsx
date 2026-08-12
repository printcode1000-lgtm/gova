import HomeScreen from '@/components/home/HomeScreen';
import { categoryService } from '@/features/categories';

export default function HomePage() {
  const displayCategories = categoryService.getAllDisplayCategories();
  return <HomeScreen displayCategories={displayCategories} />;
}
