'use client';

import * as React from 'react';
import Image from 'next/image';
import { FolderOpen, Plus, X, Package } from 'lucide-react';
import { shouldUseUnoptimizedImage, StorageProfiles, type StoredImage } from '@asol/storage-core';
import { useOnboardingStore } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormInput, FormTextarea } from '../form-components';
import { StorageImageManager } from '@/features/storage/ui';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/utils';
import type { Collection } from '@/features/onboarding/domain/types';
import { nextSellerId } from '@/features/onboarding/domain/next-id';

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
    <div id='onboarding-presentation-sections-collections-section-div-1-uv6lc1' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-collections-section-card-2-gx3knl'>
        <CardHeader id='onboarding-presentation-sections-collections-section-cardheader-3-cgi56d'>
          <CardTitle id='onboarding-presentation-sections-collections-section-cardtitle-4-egzuws' className="flex items-center gap-2">
            <FolderOpen id='onboarding-presentation-sections-collections-section-folderopen-5-fa6cun' className="h-5 w-5" />
            {t('onboarding.collections.title')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-collections-section-carddescription-6-hkjnbk'>{t('onboarding.collections.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-collections-section-cardcontent-7-khnuwy'>
          {showForm ? (
            <div id='onboarding-presentation-sections-collections-section-div-8-vxl1bj' className="space-y-6 animate-in slide-in-from-top-2 duration-200">
              <div id='onboarding-presentation-sections-collections-section-div-9-gx0hzl' className="grid gap-6 lg:grid-cols-2">
                <div id='onboarding-presentation-sections-collections-section-div-10-zvaj7s' className="space-y-4">
                  <FormField id='onboarding-presentation-sections-collections-section-formfield-11-yzdkpr' label={t('onboarding.collections.name')} htmlFor='onboarding-presentation-sections-collections-section-forminput-12-jl9fqt' required>
                    <FormInput
                      id='onboarding-presentation-sections-collections-section-forminput-12-jl9fqt'
                      value={newCollection.name}
                      onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                      placeholder={t('onboarding.collections.namePlaceholder')}
                    />
                  </FormField>

                  <FormField id='onboarding-presentation-sections-collections-section-formfield-13-wjratz' label={t('onboarding.collections.descriptionLabel')} htmlFor='onboarding-presentation-sections-collections-section-formtextarea-14-vefm57'>
                    <FormTextarea
                      id='onboarding-presentation-sections-collections-section-formtextarea-14-vefm57'
                      value={newCollection.description}
                      onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                      placeholder={t('onboarding.collections.descriptionPlaceholder')}
                      rows={3}
                    />
                  </FormField>
                </div>

                <StorageImageManager
                  config={{
                    id: 'onboarding-collection-cover',
                    storageProfileId: StorageProfiles.Cover,
                    maxItems: 1,
                    aspectRatio: 'landscape',
                    allowReplace: true,
                  }}
                  value={newCollection.coverImage ? [newCollection.coverImage] : []}
                  onChange={(images: StoredImage[]) =>
                    setNewCollection({ ...newCollection, coverImage: images[0] ?? null })
                  }
                  label={t('onboarding.collections.coverImage')}
                  hint={t('onboarding.collections.coverHint')}
                />
              </div>

              {data.products.products.length > 0 && (
                <div id='onboarding-presentation-sections-collections-section-div-15-spjmf8' className="space-y-3">
                  <Label id='onboarding-presentation-sections-collections-section-label-16-sh7tbi' className="text-base">{t('onboarding.collections.assignProducts')}</Label>
                  <div id='onboarding-presentation-sections-collections-section-div-17-ca6gdu' className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {data.products.products.map((product) => (
                      <label
                        key={product.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-all',
                          newCollection.productIds?.includes(product.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border',
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

              <div id='onboarding-presentation-sections-collections-section-div-18-zw60v7' className="flex justify-end gap-3 pt-4 border-t">
                <Button id='onboarding-presentation-sections-collections-section-button-19-wjgwdn' variant="outline" onClick={() => setShowForm(false)}>
                  {t('onboarding.common.cancel')}
                </Button>
                <Button id='onboarding-presentation-sections-collections-section-button-20-vvbzl1' onClick={handleCreateCollection} disabled={!newCollection.name?.trim()}>
                  {t('onboarding.collections.create')}
                </Button>
              </div>
            </div>
          ) : data.collections.collections.length === 0 ? (
            <div id='onboarding-presentation-sections-collections-section-div-21-gxkuwa' className="flex flex-col items-center justify-center py-12 text-center">
              <div id='onboarding-presentation-sections-collections-section-div-22-tbgh5z' className="rounded-full bg-muted p-4 mb-4">
                <FolderOpen id='onboarding-presentation-sections-collections-section-folderopen-23-fff4rk' className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 id='onboarding-presentation-sections-collections-section-heading-24-l0oooq' className="font-medium mb-2">{t('onboarding.collections.emptyTitle')}</h3>
              <p id='onboarding-presentation-sections-collections-section-text-25-xwymoa' className="text-sm text-muted-foreground mb-4 max-w-sm">
                {t('onboarding.collections.emptyDesc')}
              </p>
              <Button id='onboarding-presentation-sections-collections-section-button-26-mecpqn' onClick={() => setShowForm(true)} className="gap-2">
                <Plus id='onboarding-presentation-sections-collections-section-plus-27-7rqftw' className="h-4 w-4" />
                {t('onboarding.collections.createFirst')}
              </Button>
            </div>
          ) : (
            <div id='onboarding-presentation-sections-collections-section-div-28-rcli2v' className="space-y-4">
              <div id='onboarding-presentation-sections-collections-section-div-29-ja3ajn' className="grid gap-4 sm:grid-cols-2">
                {data.collections.collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="relative overflow-hidden rounded-lg border"
                  >
                    {collection.coverImage ? (
                      <div className="aspect-video relative">
                        <Image
                          src={collection.coverImage.url}
                          alt={collection.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover"
                          unoptimized={shouldUseUnoptimizedImage(collection.coverImage.url)}
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
                      className="absolute top-2 right-2"
                      onClick={() => removeCollection(collection.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button id='onboarding-presentation-sections-collections-section-button-30-civpon' variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
                <Plus id='onboarding-presentation-sections-collections-section-plus-31-rj7xgn' className="h-4 w-4" />
                {t('onboarding.collections.createAnother')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <StepNavigation id='onboarding-presentation-sections-collections-section-stepnavigation-32-ruwyzz' onNext={handleNext} showSkip />
    </div>
  );
}

export default CollectionsSection;
