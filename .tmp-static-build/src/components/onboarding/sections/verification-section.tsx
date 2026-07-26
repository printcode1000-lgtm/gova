'use client';

import * as React from 'react';
import { ShieldCheck, FileText, Upload, Check, X, BadgeHelp } from 'lucide-react';
import { useOnboardingStore } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DocumentType, VerificationDocument } from '@/lib/onboarding/types';
import { nextSellerId } from '@/lib/seller/next-id';

const DOCUMENT_TYPES: DocumentType[] = [
  'business_license',
  'tax_certificate',
  'id_card',
  'bank_statement',
];

const AVAILABLE_BADGES = [
  { id: 'verified', icon: '✓' },
  { id: 'fast_shipper', icon: '🚀' },
  { id: 'top_rated', icon: '⭐' },
  { id: 'eco_friendly', icon: '🌱' },
] as const;

export function VerificationSection() {
  const { t } = useTranslation();
  const { data, updateVerification, markStepComplete } = useOnboardingStore();

  const { verification } = data;

  const handleNext = () => {
    markStepComplete('verification');
    return true;
  };

  const handleFileUpload = (type: DocumentType, file: File) => {
    const doc: VerificationDocument = {
      id: nextSellerId('doc'),
      type,
      file: {
        id: nextSellerId('img'),
        url: URL.createObjectURL(file),
        preview: URL.createObjectURL(file),
        isUploading: true,
      },
      status: 'pending',
      uploadedAt: new Date().toISOString(),
    };

    updateVerification({
      documents: [...verification.documents.filter((d) => d.type !== type), doc],
    });

    setTimeout(() => {
      updateVerification({
        documents: verification.documents.map((d) =>
          d.id === doc.id
            ? { ...d, file: { ...d.file, isUploading: false } }
            : d,
        ),
      });
    }, 1500);
  };

  const removeDocument = (id: string) => {
    updateVerification({
      documents: verification.documents.filter((d) => d.id !== id),
    });
  };

  const toggleBadge = (badgeId: string) => {
    const currentBadges = verification.requestedBadges;
    if (currentBadges.includes(badgeId)) {
      updateVerification({ requestedBadges: currentBadges.filter((b) => b !== badgeId) });
    } else {
      updateVerification({ requestedBadges: [...currentBadges, badgeId] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t('onboarding.verification.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.verification.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="font-medium">{t('onboarding.verification.progress')}</p>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.verification.documentsUploaded', {
                  uploaded: verification.documents.length,
                  total: DOCUMENT_TYPES.length,
                })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                {Math.round((verification.documents.length / DOCUMENT_TYPES.length) * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">{t('onboarding.verification.uploadDocuments')}</h4>

            {DOCUMENT_TYPES.map((docType) => {
              const uploadedDoc = verification.documents.find((d) => d.type === docType);
              const isUploading = uploadedDoc?.file.isUploading;

              return (
                <div
                  key={docType}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                    uploadedDoc && 'border-merchant-success bg-merchant-success/5',
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {t(`onboarding.verification.documents.${docType}.label`)}
                      </span>
                      {uploadedDoc && (
                        <Badge variant="secondary" className="text-merchant-success bg-merchant-success/10">
                          <Check className="h-3 w-3 mr-1" />
                          {t('onboarding.common.uploaded')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(`onboarding.verification.documents.${docType}.description`)}
                    </p>
                  </div>

                  {uploadedDoc ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(uploadedDoc.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(docType, file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm" disabled={isUploading}>
                        {isUploading ? (
                          <>
                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                            {t('onboarding.common.uploading')}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {t('onboarding.common.upload')}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeHelp className="h-5 w-5" />
            {t('onboarding.verification.badgesTitle')}
          </CardTitle>
          <CardDescription>{t('onboarding.verification.badgesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {AVAILABLE_BADGES.map((badge) => {
              const isSelected = verification.requestedBadges.includes(badge.id);
              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => toggleBadge(badge.id)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="font-medium text-sm">
                      {t(`onboarding.verification.badges.${badge.id}.name`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`onboarding.verification.badges.${badge.id}.description`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default VerificationSection;
