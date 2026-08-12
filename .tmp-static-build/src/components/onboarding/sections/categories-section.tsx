'use client';

import * as React from 'react';
import { useOnboardingStore, constants } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Tag } from 'lucide-react';

const SUBCATEGORY_KEYS: Record<string, string> = {
  'T-Shirts': 't_shirts',
  'Casual Dresses': 'casual_dresses',
  'Evening Gowns': 'evening_gowns',
  'Tailored Suits': 'tailored_suits',
  'Custom Dresses': 'custom_dresses',
};

function subcategoryKey(name: string): string {
  return SUBCATEGORY_KEYS[name] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function CategoriesSection() {
  const { t } = useTranslation();
  const { data, toggleCategory, markStepComplete } = useOnboardingStore();
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { categories } = data;

  const validate = () => {
    const selectedCount = categories.selectedCategories.filter((c) => c.isSelected).length;
    if (selectedCount === 0) {
      setErrors({ categories: t('onboarding.categories.errors.required') });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete('categories');
      return true;
    }
    return false;
  };

  const toggleExpand = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter((id) => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {t('onboarding.categories.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.categories.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.categories && (
            <p className="text-sm text-destructive">{errors.categories}</p>
          )}

          <div className="space-y-2">
            {categories.selectedCategories.map((category) => {
              const isExpanded = expandedCategories.includes(category.id);
              const categoryConfig = constants.fashionCategories.find(
                (c) => c.id === category.id,
              );
              const subcategories = categoryConfig?.subcategories || [];

              return (
                <div
                  key={category.id}
                  className={cn(
                    'rounded-lg border transition-all',
                    category.isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="flex items-center gap-3 p-4">
                    <Checkbox
                      checked={category.isSelected}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <span className="flex-1 font-medium">
                      {t(`onboarding.constants.fashionCategories.${category.id}`)}
                    </span>
                    {category.isSelected && subcategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(category.id)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Badge variant="secondary" className="mr-2">
                          {t('onboarding.categories.subcategories', { count: subcategories.length })}
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {category.isSelected && isExpanded && subcategories.length > 0 && (
                    <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-wrap gap-2 pl-7">
                        {subcategories.map((sub) => (
                          <Badge key={sub} variant="outline">
                            {t(
                              `onboarding.constants.fashionCategories.${category.id}.subcategories.${subcategoryKey(sub)}`,
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default CategoriesSection;
