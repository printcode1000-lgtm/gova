"use client";

import {
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { StorageImageManager } from "@/features/storage/components/StorageImageManager";
import type {
  HeroSliderConfig,
  HeroSliderSlide,
  HeroSliderTransition,
} from "./HeroSlider";

const transitions: HeroSliderTransition[] = [
  "Fade",
  "SlideLeft",
  "SlideRight",
  "Zoom",
  "Parallax",
];

interface HeroSliderEditorProps {
  value: HeroSliderConfig;
  onChange: (config: HeroSliderConfig) => void;
  onSave?: (config: HeroSliderConfig) => void;
  onCancel?: () => void;
}

const createSlide = (priority: number): HeroSliderSlide => ({
  priority,
  image: "",
  title: "شريحة جديدة",
  subtitle: "",
  duration: 4000,
  action: "",
});

export function HeroSliderEditor({
  value,
  onChange,
  onSave,
  onCancel,
}: HeroSliderEditorProps) {
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
            تظهر التغييرات مباشرة في المعاينة أعلاه.
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
          {onSave && (
            <Button
              type="button"
              size="sm"
              onClick={() => onSave(value)}
              disabled={!value.slides.length}
            >
              <Save className="me-2 h-4 w-4" /> حفظ
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="hero-transition">نوع الانتقال</Label>
          <select
            id="hero-transition"
            className="gova-control gova-field-surface w-full border border-input px-3 text-sm"
            value={value.transition}
            onChange={(event) =>
              onChange({
                ...value,
                transition: event.target.value as HeroSliderTransition,
              })
            }
          >
            {transitions.map((transition) => (
              <option key={transition}>{transition}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero-transition-duration">
            مدة الانتقال (مللي ثانية)
          </Label>
          <Input
            id="hero-transition-duration"
            type="number"
            min={100}
            max={3000}
            step={100}
            value={value.transitionDuration}
            onChange={(event) =>
              onChange({
                ...value,
                transitionDuration: Number(event.target.value),
              })
            }
          />
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
                aria-label="حذف الشريحة"
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
                  config={{
                    id: `home-hero-slide-${index}`,
                    storageProfileId: StorageProfiles.HomeHeroSlider,
                    maxItems: 1,
                    aspectRatio: "wide",
                    allowReplace: true,
                    confirmUpload: true,
                    confirmRemove: true,
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
                    updateSlide(index, { duration: Number(event.target.value) })
                  }
                />
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
                createSlide((value.slides.length + 1) * 100),
              ],
            })
          }
        >
          <Plus className="me-2 h-4 w-4" /> إضافة شريحة
        </Button>
      </div>
    </section>
  );
}
