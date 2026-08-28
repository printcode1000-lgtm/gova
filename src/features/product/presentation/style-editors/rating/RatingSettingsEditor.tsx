"use client";

import * as React from "react";

import { Label } from "@/shared/ui/label";
import { ToggleSwitch } from "@/shared/ui/toggle-switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { RatingMode } from "@/shared/ui/product-style-settings";

export interface RatingSettingsEditorLabels {
  title: string;
  enabled: string;
  mode: string;
  placeholder: string;
  stars: string;
  starsComments: string;
}

interface RatingSettingsEditorProps {
  enabled: boolean;
  mode: RatingMode;
  labels: RatingSettingsEditorLabels;
  disabled?: boolean;
  onChange: (next: { enabled: boolean; mode: RatingMode }) => void;
}

export function RatingSettingsEditor({ id,
  enabled,
  mode,
  labels,
  disabled = false,
  onChange,
}: RatingSettingsEditorProps & { id?: string }) {
  return (
    <div id={id} className="space-y-4 rounded-xl border border-outline-variant p-4">
      <h3 id="product.style-editors.rating.rating-settings-editor.h3" className="text-sm font-bold">{labels.title}</h3>

      <div id="product.style-editors.rating.rating-settings-editor.div.2" className="flex items-center gap-3">
        <span className="text-sm font-medium leading-none">{labels.enabled}</span>
        <ToggleSwitch ui={{ uid: "product.style.rating-enabled-xw1yNf", id: "product.style.rating-enabled", kind: "field", part: "rating" }}
          id="rating-settings-enabled"
          checked={enabled}
          onChange={(checked) => onChange({ enabled: checked, mode })}
          disabled={disabled}
          label={labels.enabled}
        />
      </div>

      <div id="product.style-editors.rating.rating-settings-editor.div.3" className="space-y-2">
        <Label>{labels.mode}</Label>
        <Select
          value={mode}
          onValueChange={(value: RatingMode) => onChange({ enabled, mode: value })}
          disabled={disabled || !enabled}
        >
          <SelectTrigger ui={{ uid: "product.style.rating-mode-23KL7U", id: "product.style.rating-mode", kind: "field", part: "rating" }} className="w-full">
            <SelectValue placeholder={labels.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stars">{labels.stars}</SelectItem>
            <SelectItem value="stars-comments">
              {labels.starsComments}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
