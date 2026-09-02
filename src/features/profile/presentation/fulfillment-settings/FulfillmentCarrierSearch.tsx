"use client";

import { ChevronDown, Search, Truck } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { SellerCard } from "@/features/seller-card/ui";
import type { UserProfileRow } from "@/features/profile/application/services/profile-service.interface";
import { createSellerCardViewModel, type SellerCardAction } from "@/features/seller-card";
import type { fulfillmentSettingsCopy } from "./fulfillment-settings-copy";

export function FulfillmentCarrierSearch({
  text,
  searchText,
  setSearchText,
  submitSearch,
  isLoadingDeliveryUsers,
  displayedUsers,
  emptyDeliveryProvidersMessage,
  selected,
  toggleCarrier,
  openProviderProfile,
  selectedCount,
  open,
  onToggle,
}: {
  text: ReturnType<typeof fulfillmentSettingsCopy>;
  searchText: string;
  setSearchText: (value: string) => void;
  submitSearch: () => void;
  isLoadingDeliveryUsers: boolean;
  displayedUsers: UserProfileRow[];
  emptyDeliveryProvidersMessage: string;
  selected: Set<string>;
  toggleCarrier: (uid: string) => void;
  openProviderProfile: (uid: string) => void;
  selectedCount: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-section-1-ux35vb' className="space-y-4 rounded-xl border border-outline-variant p-4">
      <button
        id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-button-2-dcowsn'
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={text.shippingMethods}
        className="flex w-full items-center justify-between gap-2"
      >
        <span id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-text-3-unwzi7' className="flex items-center gap-2">
          <Truck id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-truck-4-zbocge' className="h-5 w-5 text-primary" />
          <h3 id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-heading-5-kkdyp5' className="text-sm font-bold">{text.shippingMethods}</h3>
        </span>
        <ChevronDown id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-chevrondown-6-weuyhl' className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-div-7-u8xpax' className="space-y-3">
          <form id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-form-8-z1kpjd'
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <div id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-div-9-2qzjsa' className="relative min-w-0 flex-1">
              <Search id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-search-10-srcylw' className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-input-11-ehakzu'
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={text.searchPlaceholder}
                className="asol-input-decorated-start"
              />
            </div>
            <button id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-button-12-pdmjdc'
              type="submit"
              className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition"
            >
              {text.search}
            </button>
          </form>

          {isLoadingDeliveryUsers ? (
            <p id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-text-13-aekzm8' className="text-sm text-muted-foreground">
              {text.loadingProviders}
            </p>
          ) : displayedUsers.length === 0 ? (
            <p id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-text-14-2o7u5k' className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-sm text-muted-foreground">
              {emptyDeliveryProvidersMessage}
            </p>
          ) : (
            <div
              id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-div-15-il2svn'
              className="grid max-h-[21rem] grid-cols-2 content-start gap-3 overflow-y-auto overscroll-y-contain pe-1"
            >
              {displayedUsers.map((user) => {
                const isSelected = selected.has(user.uid);
                const card = createSellerCardViewModel(user);
                const actions: SellerCardAction[] = [
                  { kind: "view", label: text.viewProfile, onClick: () => openProviderProfile(user.uid) },
                  {
                    kind: isSelected ? "remove" : "select",
                    label: isSelected ? text.remove : text.select,
                    active: isSelected,
                    tone: isSelected ? "tertiary" : "primary",
                    onClick: () => toggleCarrier(user.uid),
                  },
                ];
                return (
                  <SellerCard
                    key={user.uid}
                    card={card}
                    variant="linked-provider"
                    actions={actions}
                    className={isSelected ? "border-primary bg-primary/10" : ""}
                    onOpen={() => openProviderProfile(user.uid)}
                  />
                );
              })}
            </div>
          )}

          {selectedCount > 0 ? (
            <p id='profile-presentation-fulfillment-settings-fulfillmentcarriersearch-text-16-qm4kj6' className="text-xs text-muted-foreground">
              {text.selectedCount(selectedCount)}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
