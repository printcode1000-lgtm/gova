'use client';

import { useState } from 'react';

import { useTranslation } from '@/lib/i18n';

export default function Test1Page() {
  const { t } = useTranslation();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImages((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="asol-canvas py-12 px-4">
      <div className="max-w-2xl mx-auto asol-card-tonal asol-card-tonal-primary p-8">
        <h1 className="text-3xl font-bold text-on-surface mb-2 text-center">{t('test1.title')}</h1>
        <p className="text-center mb-8">
          <span className="asol-accent-chip">{t('test1.badge')}</span>
        </p>

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('test1.name')}</label>
            <input
              type="text"
              className="asol-control asol-field-surface w-full border border-outline focus:ring-2 focus:ring-primary/25 focus:border-primary"
              placeholder={t('test1.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('test1.address')}</label>
            <input
              type="text"
              className="asol-control asol-field-surface w-full border border-outline focus:ring-2 focus:ring-primary/25 focus:border-primary"
              placeholder={t('test1.addressPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('test1.date')}</label>
              <input
                type="date"
                className="asol-control asol-field-surface w-full border border-outline"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('test1.time')}</label>
              <input
                type="time"
                className="asol-control asol-field-surface w-full border border-outline"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('test1.password')}</label>
            <input
              type="password"
              className="asol-control asol-field-surface w-full border border-outline focus:ring-2 focus:ring-primary/25"
              placeholder={t('test1.passwordPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('test1.email')}</label>
            <input
              type="email"
              className="asol-control asol-field-surface w-full border border-outline focus:ring-2 focus:ring-primary/25"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('test1.uploadImages')}</label>
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-outline rounded-xl cursor-pointer hover:border-primary transition-colors asol-card-tonal asol-card-tonal-tertiary">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-on-surface-variant"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-1 text-sm text-on-surface-variant">{t('test1.uploadHint')}</p>
              </div>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <button type="button" className="asol-control w-full asol-accent-cta rounded-lg">
            {t('test1.submit')}
          </button>
        </form>

        {selectedImages.length > 0 && (
          <div className="mt-8 asol-section-tonal asol-section-tonal-secondary p-4 rounded-xl">
            <h2 className="text-xl font-semibold text-on-surface mb-4">{t('test1.selectedImages')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative asol-card-neutral overflow-hidden p-1">
                  <img
                    src={image}
                    alt={t('test1.imagePreview', { index: index + 1 })}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
