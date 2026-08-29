'use client';

import * as React from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { useTranslation } from '@/shared/i18n';
import type { UiDescriptor } from '@asol/ui-registry-core';
import { uiAttributes } from "@asol/ui-registry-core";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ id,
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "onboarding.form-components.div-c0qJJQ", id: "onboarding.form-components.div" })} id={id} className={cn('space-y-2', className)}>
      <div {...uiAttributes({ uid: "onboarding.form-components.div.2-kVZ1Q7", id: "onboarding.form-components.div.2" })} className="flex items-center justify-between">
        <Label ui={{ uid: "onboarding.form-components.label-7dVI0c", id: "onboarding.form-components.label" }} htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required && <span {...uiAttributes({ uid: "onboarding.form-components.span-BEG75L", id: "onboarding.form-components.span" })} className="text-destructive ml-1">*</span>}
        </Label>
        {hint && <span {...uiAttributes({ uid: "onboarding.form-components.span.2-5LVOlZ", id: "onboarding.form-components.span.2" })} className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p {...uiAttributes({ uid: "onboarding.form-components.p-0Ng8Hx", id: "onboarding.form-components.p" })} className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  /** Per-instance UiRegistry identity, supplied by the calling section. */
  ui?: UiDescriptor;
}

export function FormInput({ error, className, ...props }: FormInputProps & { id?: string }) {
  return (
    <Input
      className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
      {...props}
    />
  );
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  /** Per-instance UiRegistry identity, supplied by the calling section. */
  ui?: UiDescriptor;
}

export function FormTextarea({ error, className, ...props }: FormTextareaProps & { id?: string }) {
  return (
    <Textarea
      className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
      {...props}
    />
  );
}

interface FormSelectProps {
  /** Per-instance UiRegistry identity, supplied by the calling section. */
  ui?: UiDescriptor;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function FormSelect({ id,
  ui,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  disabled,
}: FormSelectProps & { id?: string }) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} ui={ui} className={cn(error && 'border-destructive')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} ui={{ uid: "onboarding.form-components.select-item-GBKxb8", id: "onboarding.form-components.select-item" }} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
}

export function MultiSelect({ id,
  options,
  value,
  onChange,
  placeholder = 'Select options',
  max,
}: MultiSelectProps & { id?: string }) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder === 'Select options' ? t('onboarding.form.selectOptions') : placeholder;
  const [search, setSearch] = React.useState('');

  const filteredOptions = options.filter(
    (opt) =>
      !value.includes(opt.value) &&
      opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    if (max && value.length >= max) return;
    onChange([...value, selectedValue]);
    setSearch('');
  };

  const handleRemove = (removedValue: string) => {
    onChange(value.filter((v) => v !== removedValue));
  };

  return (
    <div {...uiAttributes({ uid: "onboarding.form-components.div.3-ii4jNP", id: "onboarding.form-components.div.3" })} id={id} className="space-y-2">
      <div {...uiAttributes({ uid: "onboarding.form-components.div.4-Um97pP", id: "onboarding.form-components.div.4" })} className="flex flex-wrap gap-2">
        {value.map((v) => {
          const option = options.find((o) => o.value === v);
          return (
            <Badge id={id} key={v} ui={{ uid: "onboarding.form-components.badge-Na9dZt", id: "onboarding.form-components.badge" }} variant="secondary" className="gap-1 pr-1">
              {option?.label || v}
              <button {...uiAttributes({ uid: "onboarding.form-components.button-S0gxOR", id: "onboarding.form-components.button" })}
                type="button"
                onClick={() => handleRemove(v)}
                className="ml-1 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>

      {(!max || value.length < max) && (
        <div {...uiAttributes({ uid: "onboarding.form-components.div.5-kfRI7U", id: "onboarding.form-components.div.5" })} className="relative">
          <Input ui={{ uid: "onboarding.form-components.input-2Sfv2v", id: "onboarding.form-components.input" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={resolvedPlaceholder}
            className="w-full"
          />
          {search && filteredOptions.length > 0 && (
            <div {...uiAttributes({ uid: "onboarding.form-components.div.6-oWLYd5", id: "onboarding.form-components.div.6" })} className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-40 overflow-auto">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value} {...uiAttributes({ uid: "onboarding.form-components.button.2-Xh7BUo", id: "onboarding.form-components.button.2" })}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm transition-colors"
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CheckboxGroupProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  columns?: number;
}

export function CheckboxGroup({ id,
  options,
  value,
  onChange,
  columns = 2,
}: CheckboxGroupProps & { id?: string }) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  return (
    <div {...uiAttributes({ uid: "onboarding.form-components.div.7-KE05Zm", id: "onboarding.form-components.div.7" })} id={id}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isSelected = value.includes(opt.value);
        return (
          <button id={id}
            key={opt.value} {...uiAttributes({ uid: "onboarding.form-components.button.3-Foxhp3", id: "onboarding.form-components.button.3" })}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border'
            )}
          >
            <div {...uiAttributes({ uid: "onboarding.form-components.div.8-jHlWA3", id: "onboarding.form-components.div.8" })}
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
              )}
            >
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
