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
import { createUiInstanceId, uiAttributes , createOpaqueUiInstanceId} from '@asol/ui-registry-core';

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
    <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.7-mBR3DI", id: "onboarding.sections.verification-section.div.7" })} id="onboarding.sections.verification-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card ui={{ uid: "onboarding.sections.verification-section.card.3-8FT2lg", id: "onboarding.sections.verification-section.card.3" }} id="onboarding.sections.verification-section.card">
        <CardHeader ui={{ uid: "onboarding.sections.verification-section.card-header.3-a9IuhZ", id: "onboarding.sections.verification-section.card-header.3" }} id="onboarding.sections.verification-section.card-header">
          <CardTitle ui={{ uid: "onboarding.sections.verification-section.card-title.3-ox49N4", id: "onboarding.sections.verification-section.card-title.3" }} id="onboarding.sections.verification-section.card-title" className="flex items-center gap-2">
            <ShieldCheck id="onboarding.sections.verification-section.shield-check" className="h-5 w-5" />
            {t('onboarding.verification.title')}
          </CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.verification-section.card-description.3-gWacg1", id: "onboarding.sections.verification-section.card-description.3" }} id="onboarding.sections.verification-section.card-description">{t('onboarding.verification.description')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.verification-section.card-content.3-ON6nDh", id: "onboarding.sections.verification-section.card-content.3" }} id="onboarding.sections.verification-section.card-content" className="space-y-6">
          <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.8-P9YSSR", id: "onboarding.sections.verification-section.div.8" })} id="onboarding.sections.verification-section.div.2" className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.9-3J3i3L", id: "onboarding.sections.verification-section.div.9" })} id="onboarding.sections.verification-section.div.3">
              <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.3-9lJ01O", id: "onboarding.sections.verification-section.p.3" })} id="onboarding.sections.verification-section.p" className="font-medium">{t('onboarding.verification.progress')}</p>
              <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.4-l13pMz", id: "onboarding.sections.verification-section.p.4" })} id="onboarding.sections.verification-section.p.2" className="text-sm text-muted-foreground">
                {t('onboarding.verification.documentsUploaded', {
                  uploaded: verification.documents.length,
                  total: DOCUMENT_TYPES.length,
                })}
              </p>
            </div>
            <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.10-E79VNd", id: "onboarding.sections.verification-section.div.10" })} id="onboarding.sections.verification-section.div.4" className="text-right">
              <span {...uiAttributes({ uid: "onboarding.sections.verification-section.span.2-O7Qa0g", id: "onboarding.sections.verification-section.span.2" })} id="onboarding.sections.verification-section.span" className="text-2xl font-bold text-primary">
                {Math.round((verification.documents.length / DOCUMENT_TYPES.length) * 100)}%
              </span>
            </div>
          </div>

          <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.11-9t57ST", id: "onboarding.sections.verification-section.div.11" })} id="onboarding.sections.verification-section.div.5" className="space-y-4">
            <h4 {...uiAttributes({ uid: "onboarding.sections.verification-section.h4.2-p8zFE8", id: "onboarding.sections.verification-section.h4.2" })} id="onboarding.sections.verification-section.h4" className="font-medium">{t('onboarding.verification.uploadDocuments')}</h4>

            {DOCUMENT_TYPES.map((docType) => {
              const uploadedDoc = verification.documents.find((d) => d.type === docType);
              const isUploading = uploadedDoc?.file.isUploading;

              return (
                <div
                  key={docType} {...uiAttributes({ uid: "onboarding.sections.verification-section.div.12-pxDN2K", id: "onboarding.sections.verification-section.div.12", instance: createUiInstanceId(docType) })}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                    uploadedDoc && 'border-merchant-success bg-merchant-success/5',
                  )}
                >
                  <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.13-pvW0FE", id: "onboarding.sections.verification-section.div.13", instance: createUiInstanceId(docType) })} className="flex-1">
                    <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.14-PP1jy9", id: "onboarding.sections.verification-section.div.14", instance: createUiInstanceId(docType) })} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span {...uiAttributes({ uid: "onboarding.sections.verification-section.span.3-e9Cm7w", id: "onboarding.sections.verification-section.span.3" , instance: createOpaqueUiInstanceId("iter-c4d83a7756", String(docType))})} className="font-medium text-sm">
                        {t(`onboarding.verification.documents.${docType}.label`)}
                      </span>
                      {uploadedDoc && (
                        <Badge ui={{ uid: "onboarding.sections.verification-section.badge-CK4gJi", id: "onboarding.sections.verification-section.badge", instance: createUiInstanceId(docType) }} variant="secondary" className="text-merchant-success bg-merchant-success/10">
                          <Check className="h-3 w-3 mr-1" />
                          {t('onboarding.common.uploaded')}
                        </Badge>
                      )}
                    </div>
                    <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.5-XDd8P7", id: "onboarding.sections.verification-section.p.5", instance: createUiInstanceId(docType) })} className="text-xs text-muted-foreground mt-1">
                      {t(`onboarding.verification.documents.${docType}.description`)}
                    </p>
                  </div>

                  {uploadedDoc ? (
                    <Button ui={{ uid: "onboarding.sections.verification-section.button-aRRh9u", id: "onboarding.sections.verification-section.button", kind: "action", action: "remove-document", part: "documents", instance: createUiInstanceId(docType) }}
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(uploadedDoc.id)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.15-S1Vo3t", id: "onboarding.sections.verification-section.div.15", instance: createUiInstanceId(docType) })} className="relative">
                      <Button ui={{ uid: "onboarding.sections.verification-section.button.2-1Ku4EF", id: "onboarding.sections.verification-section.button.2", kind: "action", action: "upload-document", part: "documents", instance: createUiInstanceId(docType) }}
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => void pickDocument(docType)}
                      >
                        {isUploading ? (
                          <>
                            <span {...uiAttributes({ uid: "onboarding.sections.verification-section.span.4-Pc52NF", id: "onboarding.sections.verification-section.span.4", instance: createUiInstanceId(docType) })} className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
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

      <Card ui={{ uid: "onboarding.sections.verification-section.card.4-9E3VJm", id: "onboarding.sections.verification-section.card.4" }} id="onboarding.sections.verification-section.card.2">
        <CardHeader ui={{ uid: "onboarding.sections.verification-section.card-header.4-AzH0pq", id: "onboarding.sections.verification-section.card-header.4" }} id="onboarding.sections.verification-section.card-header.2">
          <CardTitle ui={{ uid: "onboarding.sections.verification-section.card-title.4-S4W6V1", id: "onboarding.sections.verification-section.card-title.4" }} id="onboarding.sections.verification-section.card-title.2" className="flex items-center gap-2">
            <BadgeHelp id="onboarding.sections.verification-section.badge-help" className="h-5 w-5" />
            {t('onboarding.verification.badgesTitle')}
          </CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.verification-section.card-description.4-m4F5it", id: "onboarding.sections.verification-section.card-description.4" }} id="onboarding.sections.verification-section.card-description.2">{t('onboarding.verification.badgesDesc')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.verification-section.card-content.4-i56X87", id: "onboarding.sections.verification-section.card-content.4" }} id="onboarding.sections.verification-section.card-content.2">
          <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.16-By0S1B", id: "onboarding.sections.verification-section.div.16" })} id="onboarding.sections.verification-section.div.6" className="grid gap-3 sm:grid-cols-2">
            {AVAILABLE_BADGES.map((badge) => {
              const isSelected = verification.requestedBadges.includes(badge.id);
              return (
                <button
                  key={badge.id} {...uiAttributes({ uid: "onboarding.sections.verification-section.button.3-nWRX6w", id: "onboarding.sections.verification-section.button.3", kind: "action", action: "toggle-badge", part: "badges", instance: createUiInstanceId(badge.id) })}
                  type="button"
                  onClick={() => toggleBadge(badge.id)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border',
                  )}
                >
                  <span {...uiAttributes({ uid: "onboarding.sections.verification-section.span.5-nZDhC9", id: "onboarding.sections.verification-section.span.5", instance: createUiInstanceId(badge.id) })} className="text-2xl">{badge.icon}</span>
                  <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.17-jRe52Y", id: "onboarding.sections.verification-section.div.17", instance: createUiInstanceId(badge.id) })}>
                    <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.6-Y7ubx5", id: "onboarding.sections.verification-section.p.6", instance: createUiInstanceId(badge.id) })} className="font-medium text-sm">
                      {t(`onboarding.verification.badges.${badge.id}.name`)}
                    </p>
                    <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.7-s1USLn", id: "onboarding.sections.verification-section.p.7", instance: createUiInstanceId(badge.id) })} className="text-xs text-muted-foreground">
                      {t(`onboarding.verification.badges.${badge.id}.description`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <StepNavigation id="onboarding.sections.verification-section.step-navigation" onNext={handleNext} showSkip />
    </div>
  );
}

export default VerificationSection;
