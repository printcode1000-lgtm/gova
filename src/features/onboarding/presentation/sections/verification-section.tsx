'use client';

import * as React from 'react';
import { ShieldCheck, FileText, Upload, Check, X, BadgeHelp } from 'lucide-react';
import { useOnboardingStore } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/utils';
import type { DocumentType, VerificationDocument } from '@/features/onboarding/domain/types';
import { nextSellerId } from '@/features/onboarding/domain/next-id';
import { NativeCore, isCancelledError } from '@asol/native-core';

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

  /**
   * Open the platform picker through the Native Platform Files module so
   * verification documents use the same picker as the rest of the application.
   */
  const pickDocument = async (type: DocumentType) => {
    try {
      const res = await NativeCore.pickFiles({
        types: ["image/*", "application/pdf"],
        multiple: false,
      });
      if (!res.ok) {
        if (isCancelledError(res.error)) return;
        console.warn("[Verification] Document selection failed.", res.error);
        return;
      }
      const first = res.value[0];
      if (first?.blob) {
        const file = new File([first.blob], first.name, { type: first.mimeType });
        handleFileUpload(type, file);
      }
    } catch (error) {
      // Dismissing the picker is a normal outcome, not an error.
      if (isCancelledError(error)) return;
      console.warn("[Verification] Document selection failed.", error);
    }
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
    <div id='onboarding-presentation-sections-verification-section-div-1-xoau1g' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-verification-section-card-2-coylfj'>
        <CardHeader id='onboarding-presentation-sections-verification-section-cardheader-3-iakb2f'>
          <CardTitle id='onboarding-presentation-sections-verification-section-cardtitle-4-gdfe9w' className="flex items-center gap-2">
            <ShieldCheck id='onboarding-presentation-sections-verification-section-shieldcheck-5-ahdpgh' className="h-5 w-5" />
            {t('onboarding.verification.title')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-verification-section-carddescription-6-v97boj'>{t('onboarding.verification.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-verification-section-cardcontent-7-bdisgz' className="space-y-6">
          <div id='onboarding-presentation-sections-verification-section-div-8-clwdcf' className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div id='onboarding-presentation-sections-verification-section-div-9-hhfplu'>
              <p id='onboarding-presentation-sections-verification-section-text-10-ll0oon' className="font-medium">{t('onboarding.verification.progress')}</p>
              <p id='onboarding-presentation-sections-verification-section-text-11-2k0yuv' className="text-sm text-muted-foreground">
                {t('onboarding.verification.documentsUploaded', {
                  uploaded: verification.documents.length,
                  total: DOCUMENT_TYPES.length,
                })}
              </p>
            </div>
            <div id='onboarding-presentation-sections-verification-section-div-12-nvzau8' className="text-right">
              <span id='onboarding-presentation-sections-verification-section-text-13-fuip4y' className="text-2xl font-bold text-primary">
                {Math.round((verification.documents.length / DOCUMENT_TYPES.length) * 100)}%
              </span>
            </div>
          </div>

          <div id='onboarding-presentation-sections-verification-section-div-14-3cvuhv' className="space-y-4">
            <h4 id='onboarding-presentation-sections-verification-section-heading-15-j9p7xf' className="font-medium">{t('onboarding.verification.uploadDocuments')}</h4>

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
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => void pickDocument(docType)}
                      >
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

      <Card id='onboarding-presentation-sections-verification-section-card-16-1xyocd'>
        <CardHeader id='onboarding-presentation-sections-verification-section-cardheader-17-jprx1o'>
          <CardTitle id='onboarding-presentation-sections-verification-section-cardtitle-18-lzpzwd' className="flex items-center gap-2">
            <BadgeHelp id='onboarding-presentation-sections-verification-section-badgehelp-19-kwlrhu' className="h-5 w-5" />
            {t('onboarding.verification.badgesTitle')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-verification-section-carddescription-20-an9mqg'>{t('onboarding.verification.badgesDesc')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-verification-section-cardcontent-21-knr4mk'>
          <div id='onboarding-presentation-sections-verification-section-div-22-5cy9gd' className="grid gap-3 sm:grid-cols-2">
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
                      : 'border-border',
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

      <StepNavigation id='onboarding-presentation-sections-verification-section-stepnavigation-23-gyhqpj' onNext={handleNext} showSkip />
    </div>
  );
}

export default VerificationSection;
