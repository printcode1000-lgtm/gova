import type {
  NotificationCategory,
  NotificationPriority,
  NotificationSound,
} from "./enums";
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "./enums";
import {
  NotificationChannelIds,
  SUPER_ADMIN_BROADCAST_SOURCE,
  type NotificationChannelId,
} from "./notification-sound";

export const NotificationTestScenarioIds = {
  General: "general",
  Orders: "orders",
  Chat: "chat",
  Updates: "updates",
  Urgent: "urgent",
  Silent: "silent",
} as const;

export type NotificationTestScenarioId =
  (typeof NotificationTestScenarioIds)[keyof typeof NotificationTestScenarioIds];

export interface NotificationTestScenario {
  id: NotificationTestScenarioId;
  label: string;
  description: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  sound: NotificationSound;
  source: string;
  channelId: NotificationChannelId;
  audible: boolean;
}

const TEST_SOURCE = "super_admin_notification_test";

export const NOTIFICATION_TEST_SCENARIOS: readonly NotificationTestScenario[] = [
  {
    id: NotificationTestScenarioIds.General,
    label: "إشعار عام",
    description: "القناة العامة والنغمة المخصصة.",
    category: NotificationCategories.System,
    priority: NotificationPriorities.Normal,
    sound: NotificationSounds.Default,
    source: TEST_SOURCE,
    channelId: NotificationChannelIds.General,
    audible: true,
  },
  {
    id: NotificationTestScenarioIds.Orders,
    label: "طلب",
    description: "تحديثات الطلبات والشحن والإرجاع.",
    category: NotificationCategories.Orders,
    priority: NotificationPriorities.High,
    sound: NotificationSounds.Default,
    source: TEST_SOURCE,
    channelId: NotificationChannelIds.Orders,
    audible: true,
  },
  {
    id: NotificationTestScenarioIds.Chat,
    label: "محادثة",
    description: "الرسائل والمحادثات الجديدة.",
    category: NotificationCategories.Chat,
    priority: NotificationPriorities.High,
    sound: NotificationSounds.Default,
    source: TEST_SOURCE,
    channelId: NotificationChannelIds.Chat,
    audible: true,
  },
  {
    id: NotificationTestScenarioIds.Updates,
    label: "تحديث",
    description: "إعلانات وتحديثات السوبر أدمن.",
    category: NotificationCategories.System,
    priority: NotificationPriorities.Normal,
    sound: NotificationSounds.Default,
    source: SUPER_ADMIN_BROADCAST_SOURCE,
    channelId: NotificationChannelIds.Updates,
    audible: true,
  },
  {
    id: NotificationTestScenarioIds.Urgent,
    label: "عاجل",
    description: "أعلى أهمية مع النغمة المخصصة والاهتزاز.",
    category: NotificationCategories.System,
    priority: NotificationPriorities.Critical,
    sound: NotificationSounds.Urgent,
    source: TEST_SOURCE,
    channelId: NotificationChannelIds.Urgent,
    audible: true,
  },
  {
    id: NotificationTestScenarioIds.Silent,
    label: "صامت",
    description: "اختبار تحكّم بلا صوت أو اهتزاز.",
    category: NotificationCategories.System,
    priority: NotificationPriorities.Low,
    sound: NotificationSounds.Silent,
    source: TEST_SOURCE,
    channelId: NotificationChannelIds.Silent,
    audible: false,
  },
];

export function getNotificationTestScenario(
  id: unknown,
): NotificationTestScenario | null {
  return (
    NOTIFICATION_TEST_SCENARIOS.find((scenario) => scenario.id === id) ?? null
  );
}
