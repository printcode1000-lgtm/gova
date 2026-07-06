import * as React from "react";
import { profileService } from "@/features/profile/services/profile-service";
import { sessionService } from "@/features/auth/services/session-service";
import { mergePrimaryContacts } from "@/features/profile/utils/merge-primary-contacts";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import type { ProfileEditTab } from "./profile-page.types";
import type {
  ProfileContactsController,
  ProfileRegistrationController,
  ProfileSectionStatus,
  ProfileSpecialtiesController,
  StoreDetailsController,
} from "./profile-save-controller";

interface UseProfileSaveProps {
  session: { uid: string } | null;
  locale: string;
  t: (key: string) => string;
  setActiveTab: (tab: ProfileEditTab) => void;
  setSession: (session: any) => void;
}

interface UseProfileSaveReturn {
  sectionStatuses: Record<ProfileEditTab, ProfileSectionStatus | null>;
  saveError: string | null;
  isUnifiedSaving: boolean;
  saveDialog: { type: 'success' | 'error', message: string } | null;
  updateSectionStatus: (section: ProfileEditTab, status: ProfileSectionStatus) => void;
  handleRegistrationStatus: (status: ProfileSectionStatus) => void;
  handleSpecialtiesStatus: (status: ProfileSectionStatus) => void;
  handleProductsStatus: (status: ProfileSectionStatus) => void;
  handleContactStatus: (status: ProfileSectionStatus) => void;
  handleStoreStatus: (status: ProfileSectionStatus) => void;
  handleSaveChangedSections: (
    registrationController: ProfileRegistrationController | null,
    contactsController: ProfileContactsController | null,
    storeController: StoreDetailsController | null,
    specialtiesController: ProfileSpecialtiesController | null,
    productsController: ProfileSpecialtiesController | null
  ) => Promise<void>;
  setSaveDialog: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error', message: string } | null>>;
}

export function useProfileSave({
  session,
  locale,
  t,
  setActiveTab,
  setSession,
}: UseProfileSaveProps): UseProfileSaveReturn {
  const [sectionStatuses, setSectionStatuses] = React.useState<
    Record<ProfileEditTab, ProfileSectionStatus | null>
  >({
    registration: null,
    specialties: null,
    products: null,
    contact: null,
    store: null,
  });
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isUnifiedSaving, setIsUnifiedSaving] = React.useState(false);
  const [saveDialog, setSaveDialog] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);

  const updateSectionStatus = React.useCallback(
    (section: ProfileEditTab, status: ProfileSectionStatus) => {
      setSectionStatuses((current) => {
        const previous = current[section];
        if (
          previous?.isDirty === status.isDirty &&
          previous?.isSaving === status.isSaving &&
          previous?.canSave === status.canSave &&
          previous?.label === status.label
        ) {
          return current;
        }
        return { ...current, [section]: status };
      });
    },
    [],
  );

  const handleRegistrationStatus = React.useCallback(
    (status: ProfileSectionStatus) =>
      updateSectionStatus("registration", status),
    [updateSectionStatus],
  );
  const handleSpecialtiesStatus = React.useCallback(
    (status: ProfileSectionStatus) =>
      updateSectionStatus("specialties", status),
    [updateSectionStatus],
  );
  const handleProductsStatus = React.useCallback(
    (status: ProfileSectionStatus) =>
      updateSectionStatus("products", status),
    [updateSectionStatus],
  );
  const handleContactStatus = React.useCallback(
    (status: ProfileSectionStatus) => updateSectionStatus("contact", status),
    [updateSectionStatus],
  );
  const handleStoreStatus = React.useCallback(
    (status: ProfileSectionStatus) => updateSectionStatus("store", status),
    [updateSectionStatus],
  );

  const handleSaveChangedSections = async (
    registrationController: ProfileRegistrationController | null,
    contactsController: ProfileContactsController | null,
    storeController: StoreDetailsController | null,
    specialtiesController: ProfileSpecialtiesController | null,
    productsController: ProfileSpecialtiesController | null
  ) => {
    setSaveError(null);
    
    if (
      !session?.uid ||
      !registrationController ||
      !contactsController ||
      !storeController ||
      !specialtiesController ||
      !productsController
    ) {
      reportSystemIssue({
        level: "warning",
        feature: "Profile",
        operation: "save-blocked-missing-controller-or-session",
        error: new Error("Profile save could not start because a required controller or session UID was unavailable."),
      });
      return;
    }

    const registration = registrationController.prepareSnapshot();
    if (!registration) {
      setActiveTab("registration");
      return;
    }

    const dirtySections = (
      Object.entries(sectionStatuses) as Array<
        [ProfileEditTab, ProfileSectionStatus | null]
      >
    ).filter(([, status]) => status?.isDirty);
    const changedSections = dirtySections.map(([section]) => section);
    const contacts = mergePrimaryContacts(
      registration,
      contactsController.getSnapshot(),
    );
    const storeDetails = storeController.getSnapshot();
    const specialties = specialtiesController.getSnapshot();

    try {
      setIsUnifiedSaving(true);
      const saved = await profileService.saveEditor({
        uid: session.uid,
        changedSections,
        registration,
        contacts,
        storeDetails,
        specialties,
      });

      if (changedSections.includes("registration")) {
        await registrationController.applySaved(saved.registration);
      }
      if (
        changedSections.includes("registration") ||
        changedSections.includes("contact")
      ) {
        contactsController.applySaved(saved.contacts);
      }
      if (changedSections.includes("store")) {
        storeController.applySaved(saved.storeDetails);
      }
      if (changedSections.includes("specialties")) {
        specialtiesController.applySaved(saved.specialties);
        productsController.applySaved(saved.specialties);
        const updatedSession = await sessionService.saveSession({
          uid: session.uid,
          phone: saved.registration.phone,
          email: saved.registration.email ?? undefined,
          specialties: saved.specialties,
        });
        setSession(updatedSession);
      }
      if (changedSections.includes("products")) {
        productsController.applySaved(saved.specialties);
      }
      setSaveDialog({
        type: 'success',
        message: locale === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully'
      });
    } catch (error) {
      reportSystemIssue({
        feature: "Profile",
        operation: `save-editor:${changedSections.join(",") || "unknown"}`,
        error,
      });
      const message = (error as Error).message;
      if (message === "phoneVerificationRequired") {
        setActiveTab("registration");
        setSaveError(t("auth.registration.phoneVerificationRequired"));
      } else if (message === "invalidCurrentPassword") {
        setActiveTab("registration");
        setSaveError(t("profile.validation.invalidCurrentPassword"));
      } else if (message === "phoneAlreadyRegistered") {
        setActiveTab("registration");
        setSaveError(t("auth.validation.phoneAlreadyRegistered"));
      } else {
        setSaveError(message);
        setSaveDialog({
          type: 'error',
          message: locale === 'ar' ? 'فشل حفظ التغييرات' : 'Failed to save changes'
        });
      }
    } finally {
      setIsUnifiedSaving(false);
    }
  };

  return {
    sectionStatuses,
    saveError,
    isUnifiedSaving,
    saveDialog,
    updateSectionStatus,
    handleRegistrationStatus,
    handleSpecialtiesStatus,
    handleProductsStatus,
    handleContactStatus,
    handleStoreStatus,
    handleSaveChangedSections,
    setSaveDialog,
  };
}
