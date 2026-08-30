"use client";

import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/utils";
import {
  getContactVisualColor,
  getContactVisualIcon,
} from "@/shared/ui/contact-visual-style";
import {
  buildContactGroups,
  isDirectGroup,
  isExternalHref,
} from "./contact-action-bar-model";
import type {
  ContactActionBarProps,
  ContactGroup,
  CustomActionButton as CustomActionButtonModel,
} from "./contact-action-bar.types";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

export type {
  ContactActionBarData,
  ContactActionEmail,
  ContactActionLocation,
  ContactActionPhone,
  ContactActionSocialLink,
  ContactActionWebsite,
  CustomActionButton,
} from "./contact-action-bar.types";

export function ContactActionBar({
  data,
  className,
  label = "وسائل التواصل",
  compact = false,
  customActions,
  id,
}: ContactActionBarProps & { id?: string }) {
  const groups = React.useMemo(() => buildContactGroups(data), [data]);
  if (groups.length === 0 && !customActions?.length) return null;

  return (
    <section {...uiAttributes({ uid: "shared.contact-action-bar.section-ZYs2a7", id: "shared.contact-action-bar.section" })}
      id={id}
      className={cn(
        "rounded-xl border border-outline-variant bg-surface/90 px-3 py-3 shadow-sm",
        className,
      )}
    >
      <div {...uiAttributes({ uid: "shared.contact-action-bar.div-r3m6NT", id: "shared.contact-action-bar.div" })} className="flex items-center gap-3">
        {!compact ? (
          <span {...uiAttributes({ uid: "shared.contact-action-bar.span-Mg8K60", id: "shared.contact-action-bar.span" })} className="shrink-0 text-xs font-semibold text-on-surface-variant">
            {label}
          </span>
        ) : null}
        <div {...uiAttributes({ uid: "shared.contact-action-bar.div.2-I561Xt", id: "shared.contact-action-bar.div.2" })}
          data-snapshot-scroll
          data-snapshot-id="profile-preview-contact-actions"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {groups.map((group) => (
            <ContactActionGroup key={group.id} group={group} />
          ))}
          {customActions?.map((action) => (
            <CustomActionButton key={action.id} action={action} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactActionGroup({ id, group }: { group: ContactGroup } & { id?: string }) {
  const instance = createOpaqueUiInstanceId("contact-group", String(group.id));
  const color = getContactVisualColor(group.id);
  const icon = getContactVisualIcon(group.id);
  if (group.options.length === 1 && isDirectGroup(group.id)) {
    const option = group.options[0]!;
    return (
      <Button ui={{ uid: "shared.contact-action-bar.button-o3LhfO", id: "shared.contact-action-bar.button", instance: instance }} id={id}
        asChild
        type="button"
        size="icon"
        variant="outline"
        className="h-10 w-10 shrink-0 rounded-full border bg-surface/80"
        style={{
          color,
          borderColor: `${color}66`,
          background: `linear-gradient(135deg, ${color}1F, ${color}08)`,
        }}
        aria-label={group.label}
      >
        <a {...uiAttributes({ uid: "shared.contact-action-bar.a-e81Sqh", id: "shared.contact-action-bar.a", instance: instance })}
          href={option.href}
          target={isExternalHref(option.href) ? "_blank" : undefined}
          rel={isExternalHref(option.href) ? "noreferrer" : undefined}
        >
          <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ui={{ uid: "shared.contact-action-bar.button.2-CH0TPR", id: "shared.contact-action-bar.button.2", instance: instance }}
          id={id}
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0 rounded-full border bg-surface/80"
          style={{
            color,
            borderColor: `${color}66`,
            background: `linear-gradient(135deg, ${color}1F, ${color}08)`,
          }}
          aria-label={group.label}
        >
          <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-64">
        <div {...uiAttributes({ uid: "shared.contact-action-bar.div.3-490vsH", id: "shared.contact-action-bar.div.3", instance: instance })} dir="rtl">
          <DropdownMenuLabel ui={{ uid: "shared.contact-action-bar.dropdown-menu-label-7sAWZ8", id: "shared.contact-action-bar.dropdown-menu-label", instance: instance }} className="flex items-center gap-2" style={{ color }}>
            <FontAwesomeIcon icon={icon} className="h-4 w-4" />
            {group.label}
          </DropdownMenuLabel>
          {group.options.map((option) => (
            <DropdownMenuItem key={option.id} ui={{ uid: "shared.contact-action-bar.dropdown-menu-item-pPmT47", id: "shared.contact-action-bar.dropdown-menu-item" , instance: createOpaqueUiInstanceId("iter-f3d11f04bc", String(option.id))}} asChild>
              <a {...uiAttributes({ uid: "shared.contact-action-bar.a.2-VyGAE3", id: "shared.contact-action-bar.a.2" , instance: createOpaqueUiInstanceId("iter-611c428815", String(option.id))})}
                href={option.href}
                target={isExternalHref(option.href) ? "_blank" : undefined}
                rel={isExternalHref(option.href) ? "noreferrer" : undefined}
                className="flex min-w-0 flex-col items-start rounded-md"
                style={{
                  backgroundColor: `${color}0D`,
                  borderInlineStart: `3px solid ${color}`,
                }}
              >
                <span {...uiAttributes({ uid: "shared.contact-action-bar.span.2-rw7MXq", id: "shared.contact-action-bar.span.2" , instance: createOpaqueUiInstanceId("iter-87d28ebcde", String(option.id))})} className="max-w-56 truncate font-medium">
                  {option.label}
                </span>
                {option.detail ? (
                  <span {...uiAttributes({ uid: "shared.contact-action-bar.span.3-5OS1nm", id: "shared.contact-action-bar.span.3" , instance: createOpaqueUiInstanceId("iter-5e5b0a0d45", String(option.id))})} className="max-w-56 truncate text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                ) : null}
              </a>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CustomActionButton({ id, action }: { action: CustomActionButtonModel } & { id?: string }) {
  const instance = createOpaqueUiInstanceId("custom-action", String(action.id));
  const color = action.color || "rgb(79, 70, 229)";
  return (
    <Button ui={{ uid: "shared.contact-action-bar.button.3-WMLKz3", id: "shared.contact-action-bar.button.3", instance: instance }} id={id}
      type="button"
      size="icon"
      variant="outline"
      className="h-10 w-10 shrink-0 rounded-full border bg-surface/80"
      style={{
        color,
        borderColor: `${color}66`,
        background: `linear-gradient(135deg, ${color}1F, ${color}08)`,
      }}
      aria-label={action.label}
      onClick={action.onClick}
    >
      {action.icon}
    </Button>
  );
}
