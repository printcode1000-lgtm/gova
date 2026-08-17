import arTemplates from "../config/templates/notifications.ar.json";
import enTemplates from "../config/templates/notifications.en.json";
import type { NotificationLocale, NotificationTemplate } from "../domain/entities";
import {
  NotificationCategories,
  NotificationChannels,
  NotificationPriorities,
  NotificationSounds,
  NotificationTargets,
} from "../domain/enums";

type TemplateMap = Record<string, NotificationTemplate>;

const categoryValues = new Set(Object.values(NotificationCategories));
const priorityValues = new Set(Object.values(NotificationPriorities));
const channelValues = new Set(Object.values(NotificationChannels));
const targetValues = new Set(Object.values(NotificationTargets));
const soundValues = new Set(Object.values(NotificationSounds));

function assertTemplate(id: string, value: NotificationTemplate): NotificationTemplate {
  if (!value.title || !value.body) throw new Error(`Notification template ${id} is missing text`);
  if (!categoryValues.has(value.category)) throw new Error(`Invalid category in ${id}`);
  if (!priorityValues.has(value.priority)) throw new Error(`Invalid priority in ${id}`);
  if (!value.channels.every((channel) => channelValues.has(channel))) {
    throw new Error(`Invalid channel in ${id}`);
  }
  if (!value.targets.every((target) => targetValues.has(target))) {
    throw new Error(`Invalid target in ${id}`);
  }
  if (value.sound && !soundValues.has(value.sound)) throw new Error(`Invalid sound in ${id}`);
  return { ...value, id };
}

function load(locale: NotificationLocale): TemplateMap {
  const raw = locale === "ar" ? arTemplates : enTemplates;
  return Object.fromEntries(
    Object.entries(raw).map(([id, value]) => [
      id,
      assertTemplate(id, { id, ...(value as Omit<NotificationTemplate, "id">) }),
    ]),
  );
}

export class NotificationTemplateLoader {
  private readonly templatesByLocale: Record<NotificationLocale, TemplateMap> = {
    ar: load("ar"),
    en: load("en"),
  };

  getTemplate(locale: NotificationLocale, templateId: string): NotificationTemplate {
    const template = this.templatesByLocale[locale][templateId];
    if (!template) throw new Error(`Notification template not found: ${templateId}`);
    return template;
  }

  listTemplates(locale: NotificationLocale): NotificationTemplate[] {
    return Object.values(this.templatesByLocale[locale]);
  }
}
