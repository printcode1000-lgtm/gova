import HomeScreen from '@/features/home/presentation/HomeScreen';
import { categoryService } from '@/features/categories';

export default function HomePage() {
  const displayCategories = categoryService.getAllDisplayCategories();
  return <HomeScreen displayCategories={displayCategories} />;
}
