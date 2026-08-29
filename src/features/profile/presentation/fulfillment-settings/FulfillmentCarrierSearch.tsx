"use client";

import { ChevronDown, Search, Truck } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { SellerCard } from "@/features/seller-card/ui";
import type { UserProfileRow } from "@/features/profile/application/services/profile-service.interface";
import { createSellerCardViewModel, type SellerCardAction } from "@/features/seller-card";
import type { fulfillmentSettingsCopy } from "./fulfillment-settings-copy";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

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
    <section {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.section.2-aTO5nE", id: "profile.fulfillment-settings.fulfillment-carrier-search.section.2" })} id="profile.fulfillment-settings.fulfillment-carrier-search.section" className="space-y-4 rounded-xl border border-outline-variant p-4">
      <button {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.button.2-80NLOZ", id: "profile.fulfillment-settings.fulfillment-carrier-search.button.2" })}
        id="profile.fulfillment-settings.fulfillment-carrier-search.div"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={text.shippingMethods}
        className="flex w-full items-center justify-between gap-2"
      >
        <span {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.span.2-PBncV3", id: "profile.fulfillment-settings.fulfillment-carrier-search.span.2" })} id="profile.fulfillment-settings.fulfillment-carrier-search.span" className="flex items-center gap-2">
          <Truck id="profile.fulfillment-settings.fulfillment-carrier-search.truck" className="h-5 w-5 text-primary" />
          <h3 {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.h3.2-4G5kP7", id: "profile.fulfillment-settings.fulfillment-carrier-search.h3.2" })} id="profile.fulfillment-settings.fulfillment-carrier-search.h3" className="text-sm font-bold">{text.shippingMethods}</h3>
        </span>
        <ChevronDown id="profile.fulfillment-settings.fulfillment-carrier-search.chevron-down" className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.div.5-Kb23VL", id: "profile.fulfillment-settings.fulfillment-carrier-search.div.5" })} id="profile.fulfillment-settings.fulfillment-carrier-search.div.2" className="space-y-3">
          <form {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.form.2-F5Jvx5", id: "profile.fulfillment-settings.fulfillment-carrier-search.form.2" })} id="profile.fulfillment-settings.fulfillment-carrier-search.form"
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <div {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.div.6-BLJ1IW", id: "profile.fulfillment-settings.fulfillment-carrier-search.div.6" })} id="profile.fulfillment-settings.fulfillment-carrier-search.div.3" className="relative min-w-0 flex-1">
              <Search id="profile.fulfillment-settings.fulfillment-carrier-search.search" className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input ui={{ uid: "profile.fulfillment.carrier-search-P0D9JA", id: "profile.fulfillment.carrier-search", kind: "field", part: "carriers" }}
                id="deliveryProviderSearch"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={text.searchPlaceholder}
                className="asol-input-decorated-start"
              />
            </div>
            <button {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.button.3-yCm4oX", id: "profile.fulfillment-settings.fulfillment-carrier-search.button.3" })} id="profile.fulfillment-settings.fulfillment-carrier-search.button"
              type="submit"
              className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition"
            >
              {text.search}
            </button>
          </form>

          {isLoadingDeliveryUsers ? (
            <p {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.p.4-02RjlP", id: "profile.fulfillment-settings.fulfillment-carrier-search.p.4" })} id="profile.fulfillment-settings.fulfillment-carrier-search.p" className="text-sm text-muted-foreground">
              {text.loadingProviders}
            </p>
          ) : displayedUsers.length === 0 ? (
            <p {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.p.5-WwO36y", id: "profile.fulfillment-settings.fulfillment-carrier-search.p.5" })} id="profile.fulfillment-settings.fulfillment-carrier-search.p.2" className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-sm text-muted-foreground">
              {emptyDeliveryProvidersMessage}
            </p>
          ) : (
            <div {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.div.7-TN9m25", id: "profile.fulfillment-settings.fulfillment-carrier-search.div.7" })}
              id="profile.fulfillment-settings.fulfillment-carrier-search.div.4"
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
                    ui={{
                      uid: "profile.fulfillment.carrier-card-C8rL5m",
                      id: "profile.fulfillment.carrier-card",
                      kind: "item",
                      interaction: { type: "tap" },
                      instance: createOpaqueUiInstanceId("carrier", user.uid),
                    }}
                    onOpen={() => openProviderProfile(user.uid)}
                  />
                );
              })}
            </div>
          )}

          {selectedCount > 0 ? (
            <p {...uiAttributes({ uid: "profile.fulfillment-settings.fulfillment-carrier-search.p.6-ankDh8", id: "profile.fulfillment-settings.fulfillment-carrier-search.p.6" })} id="profile.fulfillment-settings.fulfillment-carrier-search.p.3" className="text-xs text-muted-foreground">
              {text.selectedCount(selectedCount)}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
