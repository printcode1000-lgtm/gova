"use client";

import { Search, Truck } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { SellerCard } from "@/features/seller-card/ui";
import type { UserProfileRow } from "@/features/profile/application/services/profile-service.interface";
import {
  createSellerCardViewModel,
  type SellerCardAction,
} from "@/features/seller-card";
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
}) {
  return (
    <section className="space-y-4 rounded-xl border border-outline-variant p-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold">{text.shippingMethods}</h3>
      </div>

      <div className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="deliveryProviderSearch"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={text.searchPlaceholder}
              className="asol-input-decorated-start"
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition"
          >
            {text.search}
          </button>
        </form>

        {isLoadingDeliveryUsers ? (
          <p className="text-sm text-muted-foreground">
            {text.loadingProviders}
          </p>
        ) : displayedUsers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-sm text-muted-foreground">
            {emptyDeliveryProvidersMessage}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {displayedUsers.map((user) => {
              const isSelected = selected.has(user.uid);
              const card = createSellerCardViewModel(user);
              const actions: SellerCardAction[] = [
                {
                  kind: "view",
                  label: text.viewProfile,
                  onClick: () => openProviderProfile(user.uid),
                },
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
          <p className="text-xs text-muted-foreground">
            {text.selectedCount(selectedCount)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
