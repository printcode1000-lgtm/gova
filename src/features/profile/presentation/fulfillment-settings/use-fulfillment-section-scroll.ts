"use client";

import * as React from "react";

import type { ProfileFulfillmentSection } from "../profile-page.types";

export function useFulfillmentSectionScroll({
  fulfillmentSection,
  isLoading,
  returnsSectionRef,
  shippingSectionRef,
}: {
  fulfillmentSection: string | null;
  isLoading: boolean;
  returnsSectionRef: React.RefObject<HTMLElement | null>;
  shippingSectionRef: React.RefObject<HTMLElement | null>;
}) {
  React.useEffect(() => {
    if (isLoading) return;
    const section = fulfillmentSection as ProfileFulfillmentSection | null;
    if (section === "shipping") {
      shippingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    if (section === "returns") {
      returnsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [fulfillmentSection, isLoading, returnsSectionRef, shippingSectionRef]);
}
