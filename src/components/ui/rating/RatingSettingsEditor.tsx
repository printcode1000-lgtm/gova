"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RatingMode } from "@/components/ui/product-style-settings";

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

export function RatingSettingsEditor({
  enabled,
  mode,
  labels,
  disabled = false,
  onChange,
}: RatingSettingsEditorProps) {
  return (
    <div className="space-y-4 rounded-xl border border-outline-variant p-4">
      <h3 className="text-sm font-bold">{labels.title}</h3>

      <div className="flex items-center gap-2">
        <Checkbox
          id="rating-settings-enabled"
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange({ enabled: checked === true, mode })
          }
          disabled={disabled}
        />
        <Label htmlFor="rating-settings-enabled" className="cursor-pointer">
          {labels.enabled}
        </Label>
      </div>

      <div className="space-y-2">
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
