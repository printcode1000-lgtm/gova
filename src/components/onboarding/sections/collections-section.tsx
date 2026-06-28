'use client';

import * as React from 'react';
import { FolderOpen, Plus, X, Package } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormInput, FormTextarea } from '../form-components';
import { StorageProfileImageUpload } from '@/features/storage/components/StorageProfileImageUpload';
import { StorageProfiles } from '@/core/storage/constants/storage-profiles';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Collection } from '@/lib/onboarding/types';
import { nextSellerId } from '@/lib/seller/next-id';

function generateId() {
  return nextSellerId('col');
}

export function CollectionsSection() {
  const { t } = useTranslation();
  const { data, addCollection, removeCollection, markStepComplete } = useOnboardingStore();
  const [showForm, setShowForm] = React.useState(false);
  const [newCollection, setNewCollection] = React.useState<Partial<Collection>>({
    name: '',
    description: '',
    coverImage: null,
    productIds: [],
    isActive: true,
    isFeatured: false,
  });

  const handleNext = () => {
    markStepComplete('collections');
    return true;
  };

  const handleCreateCollection = () => {
    const collection: Collection = {
      id: generateId(),
      name: newCollection.name || t('onboarding.collections.untitled'),
      description: newCollection.description || '',
      coverImage: newCollection.coverImage || null,
      productIds: newCollection.productIds || [],
      isActive: true,
      isFeatured: false,
    };
    addCollection(collection);
    setNewCollection({
      name: '',
      description: '',
      coverImage: null,
      productIds: [],
      isActive: true,
      isFeatured: false,
    });
    setShowForm(false);
  };

  const toggleProductInCollection = (productId: string) => {
    const currentIds = newCollection.productIds || [];
    if (currentIds.includes(productId)) {
      setNewCollection({ ...newCollection, productIds: currentIds.filter((id) => id !== productId) });
    } else {
      setNewCollection({ ...newCollection, productIds: [...currentIds, productId] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t('onboarding.collections.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.collections.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {showForm ? (
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <FormField label={t('onboarding.collections.name')} htmlFor="collectionName" required>
                    <FormInput
                      id="collectionName"
                      value={newCollection.name}
                      onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                      placeholder={t('onboarding.collections.namePlaceholder')}
                    />
                  </FormField>

                  <FormField label={t('onboarding.collections.descriptionLabel')} htmlFor="collectionDesc">
                    <FormTextarea
                      id="collectionDesc"
                      value={newCollection.description}
                      onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                      placeholder={t('onboarding.collections.descriptionPlaceholder')}
                      rows={3}
                    />
                  </FormField>
                </div>

                <StorageProfileImageUpload
                  storageProfileId={StorageProfiles.Cover}
                  value={newCollection.coverImage ?? null}
                  onChange={(image: StoredImage | null) =>
                    setNewCollection({ ...newCollection, coverImage: image })
                  }
                  aspectRatio="landscape"
                  label={t('onboarding.collections.coverImage')}
                  hint={t('onboarding.collections.coverHint')}
                />
              </div>

              {data.products.products.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base">{t('onboarding.collections.assignProducts')}</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {data.products.products.map((product) => (
                      <label
                        key={product.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          newCollection.productIds?.includes(product.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50',
                        )}
                      >
                        <Checkbox
                          checked={newCollection.productIds?.includes(product.id)}
                          onCheckedChange={() => toggleProductInCollection(product.id)}
                        />
                        <span className="text-sm truncate">{product.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  {t('onboarding.common.cancel')}
                </Button>
                <Button onClick={handleCreateCollection} disabled={!newCollection.name?.trim()}>
                  {t('onboarding.collections.create')}
                </Button>
              </div>
            </div>
          ) : data.collections.collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">{t('onboarding.collections.emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {t('onboarding.collections.emptyDesc')}
              </p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('onboarding.collections.createFirst')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {data.collections.collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="group relative overflow-hidden rounded-lg border"
                  >
                    {collection.coverImage ? (
                      <div className="aspect-video relative">
                        <img
                          src={collection.coverImage.url}
                          alt={collection.name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h4 className="font-medium">{collection.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="h-3 w-3" />
                            {t('onboarding.common.products', { count: collection.productIds.length })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <FolderOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeCollection(collection.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                {t('onboarding.collections.createAnother')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default CollectionsSection;
