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
      <h3 id='presentation-style-editors-rating-ratingsettingseditor-heading-2-5vcact' className="text-sm font-bold">{labels.title}</h3>

      <div id='presentation-style-editors-rating-ratingsettingseditor-div-3-uzbq92' className="flex items-center gap-3">
        <span id="presentation-style-editors-rating-ratingsettingseditor-text-4-abfumy" className="text-sm font-medium leading-none">{labels.enabled}</span>
        <ToggleSwitch
          id='presentation-style-editors-rating-ratingsettingseditor-toggleswitch-5-rkpa4m'
          checked={enabled}
          onChange={(checked) => onChange({ enabled: checked, mode })}
          disabled={disabled}
          label={labels.enabled}
        />
      </div>

      <div id='presentation-style-editors-rating-ratingsettingseditor-div-6-pmlxcm' className="space-y-2">
        <Label>{labels.mode}</Label>
        <Select
          value={mode}
          onValueChange={(value: RatingMode) => onChange({ enabled, mode: value })}
          disabled={disabled || !enabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={labels.placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem id="rating-settings-editor-rating-settings-editor-select-item-bbf7a1" value="stars">{labels.stars}</SelectItem>
            <SelectItem id="rating-settings-editor-rating-settings-editor-select-item-71d4c7" value="stars-comments">
              {labels.starsComments}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
