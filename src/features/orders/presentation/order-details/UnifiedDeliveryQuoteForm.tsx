"use client";

import { Loader2, Send } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import type { RunAction } from "./OrderDetailsPageContent.navigation-summary";

export function UnifiedDeliveryQuoteForm({
  planId,
  candidateRequiresSpecialVehicle,
  baseAmount,
  setBaseAmount,
  vehicleAmount,
  setVehicleAmount,
  notes,
  setNotes,
  validQuote,
  sending,
  busyAction,
  baseMinor,
  vehicleMinor,
  runAction,
}: {
  planId: string;
  candidateRequiresSpecialVehicle: boolean;
  baseAmount: string;
  setBaseAmount: (value: string) => void;
  vehicleAmount: string;
  setVehicleAmount: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  validQuote: boolean;
  sending: boolean;
  busyAction: string;
  baseMinor: number;
  vehicleMinor: number;
  runAction: RunAction;
}) {
  return (
    <div id='orders-presentation-order-details-unifieddeliveryquoteform-div-1-o5ivoa' className="grid gap-3 border-t border-primary/15 p-4 sm:grid-cols-2 lg:grid-cols-[160px_160px_1fr_auto] lg:items-end">
      <label id='orders-presentation-order-details-unifieddeliveryquoteform-label-2-uwy4on' className="space-y-1 text-xs font-semibold">
        قيمة التوصيل
        <Input id='orders-presentation-order-details-unifieddeliveryquoteform-input-3-7kxpqd'
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={baseAmount}
          onChange={(event) => setBaseAmount(event.target.value)}
          placeholder="0.00"
        />
      </label>
      {candidateRequiresSpecialVehicle ? (
        <label id='orders-presentation-order-details-unifieddeliveryquoteform-label-4-n34m7r' className="space-y-1 text-xs font-semibold">
          سيارة النقل مرة واحدة
          <Input id='orders-presentation-order-details-unifieddeliveryquoteform-input-5-7jkbiv'
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={vehicleAmount}
            onChange={(event) => setVehicleAmount(event.target.value)}
            placeholder="0.00"
          />
        </label>
      ) : null}
      <label id='orders-presentation-order-details-unifieddeliveryquoteform-label-6-nvacgh' className="space-y-1 text-xs font-semibold">
        تفاصيل المسار والمدة
        <Textarea id='orders-presentation-order-details-unifieddeliveryquoteform-textarea-7-tifguo'
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="عدد محطات الاستلام والمدة المتوقعة"
        />
      </label>
      <button id='orders-presentation-order-details-unifieddeliveryquoteform-button-8-6wv5x4'
        type="button"
        disabled={!validQuote || sending || Boolean(busyAction)}
        onClick={() =>
          runAction("provider_send_unified_delivery_quote", {
            deliveryPlanId: planId,
            shippingPriceMinor: baseMinor,
            specialVehicleFeeMinor: vehicleMinor,
            notes,
          })
        }
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
      >
        {sending ? (
          <Loader2 id='orders-presentation-order-details-unifieddeliveryquoteform-loader2-9-bmjrs9' className="h-4 w-4 animate-spin" />
        ) : (
          <Send id='orders-presentation-order-details-unifieddeliveryquoteform-send-10-er2jol' className="h-4 w-4" />
        )}
        إرسال العرض
      </button>
    </div>
  );
}
