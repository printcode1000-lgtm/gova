"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { StorageProfiles, type StoredImage } from "@asol/storage-core";
import {
  StorageImageManager,
  type StorageImageManagerHandle,
} from "@/features/storage/ui";
import type {
  HeroSliderConfig,
  HeroSliderSlide,
  HeroSliderTransition,
} from "./hero-slider.types";
import {
  applyHeroSliderTransitionToSlides,
  createHeroSliderSlide,
  DEFAULT_HOME_HERO_TRANSITION,
  DEFAULT_HOME_HERO_TRANSITION_DURATION,
  heroSliderTransitionLabels,
  heroSliderTransitions,
} from "./hero-slider-editor-model";
import { useHeroSliderEditorUploadState } from "./use-hero-slider-editor-upload-state";

interface HeroSliderEditorProps {
  value: HeroSliderConfig;
  onChange: (config: HeroSliderConfig) => void;
  onSave?: (config: HeroSliderConfig) => void;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
  onPreviewChange?: (slideIndex: number, previewUrl: string | null) => void;
}

export const HeroSliderEditor = React.forwardRef<
  StorageImageManagerHandle,
  HeroSliderEditorProps
>(function HeroSliderEditor(
  { value, onChange, onSave, onCancel, onPendingChange, onPreviewChange },
  ref,
) {
  const { managerRefs, setPendingSlots } = useHeroSliderEditorUploadState({
    ref,
    onPendingChange,
  });
  const [templateTransition, setTemplateTransition] =
    React.useState<HeroSliderTransition>(DEFAULT_HOME_HERO_TRANSITION);
  const [templateDuration, setTemplateDuration] = React.useState(
    DEFAULT_HOME_HERO_TRANSITION_DURATION,
  );

  const updateSlide = (index: number, patch: Partial<HeroSliderSlide>) => {
    const slides = value.slides.map((slide, slideIndex) =>
      slideIndex === index ? { ...slide, ...patch } : slide,
    );
    onChange({ ...value, slides });
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= value.slides.length) return;
    const slides = [...value.slides];
    [slides[index], slides[destination]] = [slides[destination], slides[index]];
    onChange({
      ...value,
      slides: slides.map((slide, slideIndex) => ({
        ...slide,
        priority: (slideIndex + 1) * 100,
      })),
    });
  };

  return (
    <section
      className="mt-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
      aria-label="تعديل العرض الرئيسي"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">إعدادات العرض الرئيسي</h2>
          <p className="text-sm text-muted-foreground">
            تظهر التغييرات والصور المختارة مباشرة في المعاينة أعلاه حتى قبل
            الرفع، بينما تبقى الصفحة الرئيسية كما هي. التشغيل التلقائي ومدة كل
            شريحة والتكرار تعمل كما في Home. لكل شريحة انتقال
            خاص عند الدخول إليها. أضف شريحتين على الأقل لمعاينة الانتقالات.
            النقر على الشريحة معطّل أثناء التحرير.
          </p>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <RotateCcw className="me-2 h-4 w-4" /> تراجع
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="hero-template-transition">انتقال الشرائح الجديدة</Label>
          <select
            id="hero-template-transition"
            className="asol-control asol-field-surface w-full border border-input px-3 text-sm"
            value={templateTransition}
            onChange={(event) =>
              setTemplateTransition(event.target.value as HeroSliderTransition)
            }
          >
            {heroSliderTransitions.map((transition) => (
              <option key={transition} value={transition}>
                {heroSliderTransitionLabels[transition]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero-template-transition-duration">
            مدة الانتقال الافتراضية (مللي ثانية)
          </Label>
          <Input
            id="hero-template-transition-duration"
            type="number"
            min={0}
            max={3000}
            step={100}
            value={templateDuration}
            onChange={(event) =>
              setTemplateDuration(Number(event.target.value))
            }
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={!value.slides.length}
            onClick={() =>
              onChange(
                applyHeroSliderTransitionToSlides(
                  value,
                  templateTransition,
                  templateDuration,
                ),
              )
            }
          >
            تطبيق الانتقال على كل الشرائح
          </Button>
        </div>
        <div className="flex items-end gap-3 pb-2">
          <Switch
            id="hero-autoplay"
            checked={value.autoPlay}
            onCheckedChange={(autoPlay) => onChange({ ...value, autoPlay })}
          />
          <Label htmlFor="hero-autoplay">تشغيل تلقائي</Label>
        </div>
        <div className="flex items-end gap-3 pb-2">
          <Switch
            id="hero-loop"
            checked={value.loop}
            onCheckedChange={(loop) => onChange({ ...value, loop })}
          />
          <Label htmlFor="hero-loop">تكرار الشرائح</Label>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {value.slides.map((slide, index) => (
          <fieldset
            key={`${slide.priority}-${index}`}
            className="rounded-lg border p-3"
          >
            <legend className="px-2 text-sm font-medium">
              الشريحة {index + 1}
            </legend>
            <div className="mb-3 flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="تحريك الشريحة لأعلى"
                disabled={index === 0}
                onClick={() => moveSlide(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="تحريك الشريحة لأسفل"
                disabled={index === value.slides.length - 1}
                onClick={() => moveSlide(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="إزالة الشريحة"
                onClick={() =>
                  onChange({
                    ...value,
                    slides: value.slides.filter(
                      (_, slideIndex) => slideIndex !== index,
                    ),
                  })
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>صورة الشريحة</Label>
                <StorageImageManager
                  ref={(handle) => {
                    managerRefs.current[index] = handle;
                  }}
                  config={{
                    id: `home-hero-slide-${index}`,
                    storageProfileId: StorageProfiles.HomeHeroSlider,
                    maxItems: 1,
                    aspectRatio: "wide",
                    allowReplace: true,
                    deleteFromStorageOnRemove: false,
                  }}
                  value={
                    slide.image
                      ? ([
                          {
                            imageKey: slide.imageKey ?? "",
                            url: slide.image,
                          },
                        ] satisfies StoredImage[])
                      : []
                  }
                  onChange={(images) =>
                    updateSlide(index, {
                      image: images[0]?.url ?? "",
                      imageKey: images[0]?.imageKey ?? "",
                    })
                  }
                  onPendingChange={(pending) => {
                    setPendingSlots((current) => {
                      const next = new Set(current);
                      if (pending) next.add(index);
                      else next.delete(index);
                      return next;
                    });
                  }}
                  onPreviewChange={onPreviewChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hero-title-${index}`}>العنوان</Label>
                <Input
                  id={`hero-title-${index}`}
                  value={slide.title}
                  onChange={(event) =>
                    updateSlide(index, { title: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hero-subtitle-${index}`}>الشارة</Label>
                <Input
                  id={`hero-subtitle-${index}`}
                  value={slide.subtitle}
                  onChange={(event) =>
                    updateSlide(index, { subtitle: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hero-action-${index}`}>الإجراء</Label>
                <Input
                  id={`hero-action-${index}`}
                  value={slide.action}
                  onChange={(event) =>
                    updateSlide(index, { action: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hero-transition-${index}`}>
                  نوع الانتقال عند الدخول
                </Label>
                <select
                  id={`hero-transition-${index}`}
                  className="asol-control asol-field-surface w-full border border-input px-3 text-sm"
                  value={slide.transition}
                  onChange={(event) =>
                    updateSlide(index, {
                      transition: event.target.value as HeroSliderTransition,
                    })
                  }
                >
                  {heroSliderTransitions.map((transition) => (
                    <option key={transition} value={transition}>
                      {heroSliderTransitionLabels[transition]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hero-transition-duration-${index}`}>
                  مدة الانتقال (مللي ثانية)
                </Label>
                <Input
                  id={`hero-transition-duration-${index}`}
                  type="number"
                  min={0}
                  max={3000}
                  step={100}
                  value={slide.transitionDuration}
                  onChange={(event) =>
                    updateSlide(index, {
                      transitionDuration: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hero-duration-${index}`}>
                  مدة العرض (مللي ثانية)
                </Label>
                <Input
                  id={`hero-duration-${index}`}
                  type="number"
                  min={1000}
                  step={500}
                  value={slide.duration}
                  onChange={(event) =>
                    updateSlide(index, {
                      duration: Math.max(1000, Number(event.target.value) || 1000),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  تُطبَّق عند تفعيل «تشغيل تلقائي» ومع وجود شريحتين على الأقل.
                </p>
              </div>
            </div>
          </fieldset>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() =>
            onChange({
              ...value,
              slides: [
                ...value.slides,
                createHeroSliderSlide((value.slides.length + 1) * 100, {
                  transition: templateTransition,
                  transitionDuration: templateDuration,
                }),
              ],
            })
          }
        >
          <Plus className="me-2 h-4 w-4" /> إضافة شريحة
        </Button>
      </div>
    </section>
  );
});
