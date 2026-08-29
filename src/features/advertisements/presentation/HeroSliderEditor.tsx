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
import { uiAttributes } from "@asol/ui-registry-core";
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
    <section {...uiAttributes({ uid: "advertisements.hero-slider-editor.section.2-5s5Gkm", id: "advertisements.hero-slider-editor.section.2" })} id="advertisements.hero-slider-editor.section"
      className="mt-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
      aria-label="تعديل العرض الرئيسي"
    >
      <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.11-nXQA88", id: "advertisements.hero-slider-editor.div.11" })} id="advertisements.hero-slider-editor.div" className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.12-xFF8Q0", id: "advertisements.hero-slider-editor.div.12" })} id="advertisements.hero-slider-editor.div.2">
          <h2 {...uiAttributes({ uid: "advertisements.hero-slider-editor.h2.2-nGS5Ex", id: "advertisements.hero-slider-editor.h2.2" })} id="advertisements.hero-slider-editor.h2" className="font-semibold">إعدادات العرض الرئيسي</h2>
          <p {...uiAttributes({ uid: "advertisements.hero-slider-editor.p.2-0nyFe6", id: "advertisements.hero-slider-editor.p.2" })} id="advertisements.hero-slider-editor.p" className="text-sm text-muted-foreground">
            تظهر التغييرات والصور المختارة مباشرة في المعاينة أعلاه حتى قبل
            الرفع، بينما تبقى الصفحة الرئيسية كما هي. التشغيل التلقائي ومدة كل
            شريحة والتكرار تعمل كما في Home. لكل شريحة انتقال
            خاص عند الدخول إليها. أضف شريحتين على الأقل لمعاينة الانتقالات.
            النقر على الشريحة معطّل أثناء التحرير.
          </p>
        </div>
        <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.13-4QanRZ", id: "advertisements.hero-slider-editor.div.13" })} id="advertisements.hero-slider-editor.div.3" className="flex gap-2">
          {onCancel && (
            <Button id="advertisements.hero-slider-editor.button" ui={{ uid: "hero-slider-editor.cancel-nE07Ui", id: "hero-slider-editor.cancel", kind: "action", action: "cancel", part: "toolbar" }}
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <RotateCcw id="advertisements.hero-slider-editor.rotate-ccw" className="me-2 h-4 w-4" /> تراجع
            </Button>
          )}
        </div>
      </div>

      <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.14-5Po6pm", id: "advertisements.hero-slider-editor.div.14" })} id="advertisements.hero-slider-editor.div.4" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.15-4xkLG1", id: "advertisements.hero-slider-editor.div.15" })} id="advertisements.hero-slider-editor.div.5" className="space-y-2">
          <Label ui={{ uid: "advertisements.hero-slider-editor.label.5-4NNLOu", id: "advertisements.hero-slider-editor.label.5" }} id="advertisements.hero-slider-editor.label" htmlFor="hero-template-transition">انتقال الشرائح الجديدة</Label>
          <select
            {...uiAttributes({
              uid: "hero-slider-editor.template-transition-7PUD5Q",
              id: "hero-slider-editor.template-transition",
              kind: "field",
              action: "set-template-transition",
              part: "template",
            })}
            id="hero-template-transition"
            className="asol-control asol-field-surface w-full border border-input px-3 text-sm"
            value={templateTransition}
            onChange={(event) =>
              setTemplateTransition(event.target.value as HeroSliderTransition)
            }
          >
            {heroSliderTransitions.map((transition) => (
              <option key={transition} {...uiAttributes({ uid: "advertisements.hero-slider-editor.option-U9f7gb", id: "advertisements.hero-slider-editor.option" })} value={transition}>
                {heroSliderTransitionLabels[transition]}
              </option>
            ))}
          </select>
        </div>
        <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.16-6NXXuo", id: "advertisements.hero-slider-editor.div.16" })} id="advertisements.hero-slider-editor.div.6" className="space-y-2">
          <Label ui={{ uid: "advertisements.hero-slider-editor.label.6-8qKnC9", id: "advertisements.hero-slider-editor.label.6" }} id="advertisements.hero-slider-editor.label.2" htmlFor="hero-template-transition-duration">
            مدة الانتقال الافتراضية (مللي ثانية)
          </Label>
          <Input ui={{ uid: "hero-slider-editor.template-transition-duration-Ts8XHR", id: "hero-slider-editor.template-transition-duration", kind: "field", part: "template" }}
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
        <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.17-kY1a3u", id: "advertisements.hero-slider-editor.div.17" })} id="advertisements.hero-slider-editor.div.7" className="flex items-end sm:col-span-2">
          <Button id="advertisements.hero-slider-editor.button.2" ui={{ uid: "hero-slider-editor.apply-template-5UUeWM", id: "hero-slider-editor.apply-template", kind: "action", action: "apply-transition-template", part: "template" }}
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
        <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.18-NaQjT3", id: "advertisements.hero-slider-editor.div.18" })} id="advertisements.hero-slider-editor.div.8" className="flex items-end gap-3 pb-2">
          <Switch ui={{ uid: "hero-slider-editor.autoplay-NEsc6o", id: "hero-slider-editor.autoplay", kind: "field", action: "toggle-autoplay", part: "template" }}
            id="hero-autoplay"
            checked={value.autoPlay}
            onCheckedChange={(autoPlay) => onChange({ ...value, autoPlay })}
          />
          <Label ui={{ uid: "advertisements.hero-slider-editor.label.7-927RSI", id: "advertisements.hero-slider-editor.label.7" }} id="advertisements.hero-slider-editor.label.3" htmlFor="hero-autoplay">تشغيل تلقائي</Label>
        </div>
        <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.19-V3lnkh", id: "advertisements.hero-slider-editor.div.19" })} id="advertisements.hero-slider-editor.div.9" className="flex items-end gap-3 pb-2">
          <Switch ui={{ uid: "hero-slider-editor.loop-c9EBLn", id: "hero-slider-editor.loop", kind: "field", action: "toggle-loop", part: "template" }}
            id="hero-loop"
            checked={value.loop}
            onCheckedChange={(loop) => onChange({ ...value, loop })}
          />
          <Label ui={{ uid: "advertisements.hero-slider-editor.label.8-Gmm4kj", id: "advertisements.hero-slider-editor.label.8" }} id="advertisements.hero-slider-editor.label.4" htmlFor="hero-loop">تكرار الشرائح</Label>
        </div>
      </div>

      <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.20-9QYTMY", id: "advertisements.hero-slider-editor.div.20" })} id="advertisements.hero-slider-editor.div.10" className="mt-6 space-y-4">
        {value.slides.map((slide, index) => (
          <fieldset
            key={`${slide.priority}-${index}`} {...uiAttributes({ uid: "advertisements.hero-slider-editor.fieldset-1MK2Ze", id: "advertisements.hero-slider-editor.fieldset" })}
            className="rounded-lg border p-3"
          >
            <legend {...uiAttributes({ uid: "advertisements.hero-slider-editor.legend-KPvT3I", id: "advertisements.hero-slider-editor.legend" })} className="px-2 text-sm font-medium">
              الشريحة {index + 1}
            </legend>
            <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.21-N3KrIU", id: "advertisements.hero-slider-editor.div.21" })} className="mb-3 flex justify-end gap-1">
              <Button ui={{ uid: "advertisements.hero-slider-editor.button.4-HAlL4V", id: "advertisements.hero-slider-editor.button.4" }}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="تحريك الشريحة لأعلى"
                disabled={index === 0}
                onClick={() => moveSlide(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button ui={{ uid: "advertisements.hero-slider-editor.button.5-6ZZq2M", id: "advertisements.hero-slider-editor.button.5" }}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="تحريك الشريحة لأسفل"
                disabled={index === value.slides.length - 1}
                onClick={() => moveSlide(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button ui={{ uid: "advertisements.hero-slider-editor.button.6-212rPj", id: "advertisements.hero-slider-editor.button.6" }}
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
            <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.22-6N9C2H", id: "advertisements.hero-slider-editor.div.22" })} className="grid gap-3 sm:grid-cols-2">
              <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.23-3BaXfF", id: "advertisements.hero-slider-editor.div.23" })} className="space-y-2 sm:col-span-2">
                <Label ui={{ uid: "advertisements.hero-slider-editor.label.9-3XLojK", id: "advertisements.hero-slider-editor.label.9" }}>صورة الشريحة</Label>
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
              <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.24-Ka5Ld0", id: "advertisements.hero-slider-editor.div.24" })} className="space-y-2">
                <Label ui={{ uid: "advertisements.hero-slider-editor.label.10-P9FtaP", id: "advertisements.hero-slider-editor.label.10" }} htmlFor={`hero-title-${index}`}>العنوان</Label>
                <Input ui={{ uid: "advertisements.hero-slider-editor.input-Qt9eTO", id: "advertisements.hero-slider-editor.input" }}
                  id={`hero-title-${index}`}
                  value={slide.title}
                  onChange={(event) =>
                    updateSlide(index, { title: event.target.value })
                  }
                />
              </div>
              <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.25-8ueE52", id: "advertisements.hero-slider-editor.div.25" })} className="space-y-2">
                <Label ui={{ uid: "advertisements.hero-slider-editor.label.11-D3aeWp", id: "advertisements.hero-slider-editor.label.11" }} htmlFor={`hero-subtitle-${index}`}>الشارة</Label>
                <Input ui={{ uid: "advertisements.hero-slider-editor.input.2-f40LW8", id: "advertisements.hero-slider-editor.input.2" }}
                  id={`hero-subtitle-${index}`}
                  value={slide.subtitle}
                  onChange={(event) =>
                    updateSlide(index, { subtitle: event.target.value })
                  }
                />
              </div>
              <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.26-LMPJ0F", id: "advertisements.hero-slider-editor.div.26" })} className="space-y-2">
                <Label ui={{ uid: "advertisements.hero-slider-editor.label.12-xo3a8K", id: "advertisements.hero-slider-editor.label.12" }} htmlFor={`hero-action-${index}`}>الإجراء</Label>
                <Input ui={{ uid: "advertisements.hero-slider-editor.input.3-V6L15P", id: "advertisements.hero-slider-editor.input.3" }}
                  id={`hero-action-${index}`}
                  value={slide.action}
                  onChange={(event) =>
                    updateSlide(index, { action: event.target.value })
                  }
                />
              </div>
              <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.27-8BRUyL", id: "advertisements.hero-slider-editor.div.27" })} className="space-y-2">
                <Label ui={{ uid: "advertisements.hero-slider-editor.label.13-Hc4NZ7", id: "advertisements.hero-slider-editor.label.13" }} htmlFor={`hero-transition-${index}`}>
                  نوع الانتقال عند الدخول
                </Label>
                <select {...uiAttributes({ uid: "advertisements.hero-slider-editor.select-JTJYg9", id: "advertisements.hero-slider-editor.select" })}
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
                    <option key={transition} {...uiAttributes({ uid: "advertisements.hero-slider-editor.option.2-bE6uzW", id: "advertisements.hero-slider-editor.option.2" })} value={transition}>
                      {heroSliderTransitionLabels[transition]}
                    </option>
                  ))}
                </select>
              </div>
              <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.28-OGA2f0", id: "advertisements.hero-slider-editor.div.28" })} className="space-y-2">
                <Label ui={{ uid: "advertisements.hero-slider-editor.label.14-Su1c7t", id: "advertisements.hero-slider-editor.label.14" }} htmlFor={`hero-transition-duration-${index}`}>
                  مدة الانتقال (مللي ثانية)
                </Label>
                <Input ui={{ uid: "advertisements.hero-slider-editor.input.4-mh0WNM", id: "advertisements.hero-slider-editor.input.4" }}
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
              <div {...uiAttributes({ uid: "advertisements.hero-slider-editor.div.29-gxEC92", id: "advertisements.hero-slider-editor.div.29" })} className="space-y-2">
                <Label ui={{ uid: "advertisements.hero-slider-editor.label.15-I7OwJt", id: "advertisements.hero-slider-editor.label.15" }} htmlFor={`hero-duration-${index}`}>
                  مدة العرض (مللي ثانية)
                </Label>
                <Input ui={{ uid: "advertisements.hero-slider-editor.input.5-n9fWCi", id: "advertisements.hero-slider-editor.input.5" }}
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
                <p {...uiAttributes({ uid: "advertisements.hero-slider-editor.p.3-n5qSAi", id: "advertisements.hero-slider-editor.p.3" })} className="text-xs text-muted-foreground">
                  تُطبَّق عند تفعيل «تشغيل تلقائي» ومع وجود شريحتين على الأقل.
                </p>
              </div>
            </div>
          </fieldset>
        ))}
        <Button id="advertisements.hero-slider-editor.button.3" ui={{ uid: "hero-slider-editor.add-slide-Gt7bcE", id: "hero-slider-editor.add-slide", kind: "action", action: "add-slide", part: "slides" }}
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
          <Plus id="advertisements.hero-slider-editor.plus" className="me-2 h-4 w-4" /> إضافة شريحة
        </Button>
      </div>
    </section>
  );
});
