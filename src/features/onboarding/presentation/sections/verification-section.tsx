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
import type { UiDescriptor } from '@asol/ui-registry-core';
import { uiAttributes } from '@asol/ui-registry-core';

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

/**
 * One descriptor per document type and per badge, keyed by the same domain
 * constants that drive the lists. The identity never depends on the rendered
 * order, the translation, or the upload state.
 */
const DOCUMENT_REMOVE_UI = {
  business_license: { uid: 'onboarding.verification.document-remove.business-license-GGx8Vg', id: 'onboarding.verification.document-remove.business-license', kind: 'action', action: 'remove-document', part: 'documents' },
  tax_certificate: { uid: 'onboarding.verification.document-remove.tax-certificate-02HcXE', id: 'onboarding.verification.document-remove.tax-certificate', kind: 'action', action: 'remove-document', part: 'documents' },
  id_card: { uid: 'onboarding.verification.document-remove.id-card-Vk9RRD', id: 'onboarding.verification.document-remove.id-card', kind: 'action', action: 'remove-document', part: 'documents' },
  bank_statement: { uid: 'onboarding.verification.document-remove.bank-statement-ETT15U', id: 'onboarding.verification.document-remove.bank-statement', kind: 'action', action: 'remove-document', part: 'documents' },
} as const satisfies Record<DocumentType, UiDescriptor>;

const DOCUMENT_UPLOAD_UI = {
  business_license: { uid: 'onboarding.verification.document-upload.business-license-KPQp5j', id: 'onboarding.verification.document-upload.business-license', kind: 'action', action: 'upload-document', part: 'documents' },
  tax_certificate: { uid: 'onboarding.verification.document-upload.tax-certificate-jIDx9l', id: 'onboarding.verification.document-upload.tax-certificate', kind: 'action', action: 'upload-document', part: 'documents' },
  id_card: { uid: 'onboarding.verification.document-upload.id-card-0gBa4B', id: 'onboarding.verification.document-upload.id-card', kind: 'action', action: 'upload-document', part: 'documents' },
  bank_statement: { uid: 'onboarding.verification.document-upload.bank-statement-HUs2Gv', id: 'onboarding.verification.document-upload.bank-statement', kind: 'action', action: 'upload-document', part: 'documents' },
} as const satisfies Record<DocumentType, UiDescriptor>;

const BADGE_UI = {
  verified: { uid: 'onboarding.verification.badge.verified-UL3ogs', id: 'onboarding.verification.badge.verified', kind: 'action', action: 'toggle-badge', part: 'badges' },
  fast_shipper: { uid: 'onboarding.verification.badge.fast-shipper-8sK7rK', id: 'onboarding.verification.badge.fast-shipper', kind: 'action', action: 'toggle-badge', part: 'badges' },
  top_rated: { uid: 'onboarding.verification.badge.top-rated-9AErqN', id: 'onboarding.verification.badge.top-rated', kind: 'action', action: 'toggle-badge', part: 'badges' },
  eco_friendly: { uid: 'onboarding.verification.badge.eco-friendly-O6X3o6', id: 'onboarding.verification.badge.eco-friendly', kind: 'action', action: 'toggle-badge', part: 'badges' },
} as const satisfies Record<(typeof AVAILABLE_BADGES)[number]['id'], UiDescriptor>;

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
      <Card id="onboarding.sections.verification-section.card">
        <CardHeader id="onboarding.sections.verification-section.card-header">
          <CardTitle id="onboarding.sections.verification-section.card-title" className="flex items-center gap-2">
            <ShieldCheck id="onboarding.sections.verification-section.shield-check" className="h-5 w-5" />
            {t('onboarding.verification.title')}
          </CardTitle>
          <CardDescription id="onboarding.sections.verification-section.card-description">{t('onboarding.verification.description')}</CardDescription>
        </CardHeader>
        <CardContent id="onboarding.sections.verification-section.card-content" className="space-y-6">
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
                  key={docType} {...uiAttributes({ uid: "onboarding.sections.verification-section.div.12-pxDN2K", id: "onboarding.sections.verification-section.div.12" })}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                    uploadedDoc && 'border-merchant-success bg-merchant-success/5',
                  )}
                >
                  <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.13-pvW0FE", id: "onboarding.sections.verification-section.div.13" })} className="flex-1">
                    <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.14-PP1jy9", id: "onboarding.sections.verification-section.div.14" })} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span {...uiAttributes({ uid: "onboarding.sections.verification-section.span.3-e9Cm7w", id: "onboarding.sections.verification-section.span.3" })} className="font-medium text-sm">
                        {t(`onboarding.verification.documents.${docType}.label`)}
                      </span>
                      {uploadedDoc && (
                        <Badge variant="secondary" className="text-merchant-success bg-merchant-success/10">
                          <Check className="h-3 w-3 mr-1" />
                          {t('onboarding.common.uploaded')}
                        </Badge>
                      )}
                    </div>
                    <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.5-XDd8P7", id: "onboarding.sections.verification-section.p.5" })} className="text-xs text-muted-foreground mt-1">
                      {t(`onboarding.verification.documents.${docType}.description`)}
                    </p>
                  </div>

                  {uploadedDoc ? (
                    <Button
                      ui={DOCUMENT_REMOVE_UI[docType]}
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(uploadedDoc.id)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.15-S1Vo3t", id: "onboarding.sections.verification-section.div.15" })} className="relative">
                      <Button
                        ui={DOCUMENT_UPLOAD_UI[docType]}
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => void pickDocument(docType)}
                      >
                        {isUploading ? (
                          <>
                            <span {...uiAttributes({ uid: "onboarding.sections.verification-section.span.4-Pc52NF", id: "onboarding.sections.verification-section.span.4" })} className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
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

      <Card id="onboarding.sections.verification-section.card.2">
        <CardHeader id="onboarding.sections.verification-section.card-header.2">
          <CardTitle id="onboarding.sections.verification-section.card-title.2" className="flex items-center gap-2">
            <BadgeHelp id="onboarding.sections.verification-section.badge-help" className="h-5 w-5" />
            {t('onboarding.verification.badgesTitle')}
          </CardTitle>
          <CardDescription id="onboarding.sections.verification-section.card-description.2">{t('onboarding.verification.badgesDesc')}</CardDescription>
        </CardHeader>
        <CardContent id="onboarding.sections.verification-section.card-content.2">
          <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.16-By0S1B", id: "onboarding.sections.verification-section.div.16" })} id="onboarding.sections.verification-section.div.6" className="grid gap-3 sm:grid-cols-2">
            {AVAILABLE_BADGES.map((badge) => {
              const isSelected = verification.requestedBadges.includes(badge.id);
              return (
                <button
                  key={badge.id}
                  {...uiAttributes(BADGE_UI[badge.id])}
                  type="button"
                  onClick={() => toggleBadge(badge.id)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border',
                  )}
                >
                  <span {...uiAttributes({ uid: "onboarding.sections.verification-section.span.5-nZDhC9", id: "onboarding.sections.verification-section.span.5" })} className="text-2xl">{badge.icon}</span>
                  <div {...uiAttributes({ uid: "onboarding.sections.verification-section.div.17-jRe52Y", id: "onboarding.sections.verification-section.div.17" })}>
                    <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.6-Y7ubx5", id: "onboarding.sections.verification-section.p.6" })} className="font-medium text-sm">
                      {t(`onboarding.verification.badges.${badge.id}.name`)}
                    </p>
                    <p {...uiAttributes({ uid: "onboarding.sections.verification-section.p.7-s1USLn", id: "onboarding.sections.verification-section.p.7" })} className="text-xs text-muted-foreground">
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
