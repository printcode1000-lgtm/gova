'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { NativeCore, isCancelledError } from '@asol/native-core';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function FormInput({ error, className, ...props }: FormInputProps) {
  return (
    <Input
      className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
      {...props}
    />
  );
}

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function FormTextarea({ error, className, ...props }: FormTextareaProps) {
  return (
    <Textarea
      className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
      {...props}
    />
  );
}

interface FormSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder,
  error,
  disabled,
}: FormSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn(error && 'border-destructive')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface BlobImageUploadProps {
  value?: { url: string; preview?: string } | null;
  onChange: (file: File | null, preview: string | null) => void;
  onRemove: () => void;
  accept?: string;
  maxSize?: number;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'wide';
  label?: string;
  hint?: string;
  error?: string;
}

/** Legacy local-preview upload for out-of-scope flows (e.g. collections). */
export function BlobImageUpload({
  value,
  onChange,
  onRemove,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  aspectRatio = 'landscape',
  label,
  hint,
  error,
}: BlobImageUploadProps) {
  const { t, formatApiError } = useTranslation();
  const [isDragging, setIsDragging] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const aspectClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[21/9]',
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const processFile = (file: File) => {
    setLocalError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError(t('onboarding.form.invalidImageType'));
      return;
    }

    if (file.size > maxSize) {
      setLocalError(
        t('onboarding.form.fileTooLarge', { maxSize: Math.round(maxSize / 1024 / 1024) }),
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(file, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Open the platform file picker through the Native Platform Files module,
   * so onboarding uses the same picker as the rest of the application.
   */
  const openPicker = async () => {
    try {
      const res = await NativeCore.pickFiles({
        types: accept.split(",").map((entry) => entry.trim()).filter(Boolean),
        multiple: false,
      });
      if (!res.ok) {
        if (isCancelledError(res.error)) return;
        setLocalError(formatApiError(res.error));
        return;
      }
      const first = res.value[0];
      if (first?.blob) {
        const file = new File([first.blob], first.name, { type: first.mimeType });
        processFile(file);
      }
    } catch (error) {
      // Dismissing the picker is a normal outcome, not an error.
      if (isCancelledError(error)) return;
      setLocalError(formatApiError(error));
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {hint && <span className="text-xs text-muted-foreground ml-2">{hint}</span>}
        </Label>
      )}

      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200',
          aspectClasses[aspectRatio],
          isDragging && 'border-primary bg-primary/5',
          error || localError ? 'border-destructive' : 'border-border',
          value && 'border-solid'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {value ? (
          <>
            <img
              src={value.preview || value.url}
              alt={t('onboarding.form.uploadedAlt')}
              className="absolute inset-0 h-full w-full rounded-lg object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity rounded-lg" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background shadow-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            onClick={() => void openPicker()}
          >
            <div className="rounded-full bg-muted p-3">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t('onboarding.form.dropImage')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('onboarding.form.imageFormats', {
                  maxSize: Math.round(maxSize / 1024 / 1024),
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {(error || localError) && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error || localError}
        </p>
      )}
    </div>
  );
}

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  max,
}: MultiSelectProps) {
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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((v) => {
          const option = options.find((o) => o.value === v);
          return (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              {option?.label || v}
              <button
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
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={resolvedPlaceholder}
            className="w-full"
          />
          {search && filteredOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 max-h-40 overflow-auto">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
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

export function CheckboxGroup({
  options,
  value,
  onChange,
  columns = 2,
}: CheckboxGroupProps) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isSelected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border'
            )}
          >
            <div
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
