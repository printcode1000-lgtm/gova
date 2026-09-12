"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LoaderCircle, Power, UsersRound } from "lucide-react";
import {
  simulationActorUrl,
  type SimulationActorKey,
} from "@asol/simulation-core";
import {
  useSession,
  markPendingAuthLoginCompleted,
  sessionService,
} from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { OverlayChromeBranch } from "@/shared/ui/overlay-chrome-branch";
import {
  checkpointSimulationPath,
  createSimulationSession,
  getSimulationState,
  setSimulationMode,
  type SimulationStateView,
} from "../application/simulation-api";

const SIMULATION_ACTIVE_ATTRIBUTE = "data-asol-simulation-active";
const SIMULATION_TOOLBAR_ATTRIBUTE = "data-asol-simulation-toolbar";
const SIMULATION_HEIGHT_VAR = "--asol-simulation-toolbar-height";
function currentRoute(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function actorMatchesSession(
  state: SimulationStateView,
  session: ReturnType<typeof useSession>["session"],
): boolean {
  if (!state.actorKey || !session?.sessionToken) return false;
  const actor = state.actors.find((item) => item.key === state.actorKey);
  if (!actor) return false;
  if (actor.role === "super-admin") return isSuperAdmin(session);
  return Boolean(actor.expectedUid && session.uid === actor.expectedUid);
}

function targetUrl(
  state: SimulationStateView,
  key: SimulationActorKey,
): string {
  const actor = state.actors.find((item) => item.key === key);
  if (!actor) return "/";
  const hostname =
    typeof window === "undefined" ? "127.0.0.1" : window.location.hostname;
  return simulationActorUrl(actor, actor.resumePath, hostname);
}

export function SimulationRuntimeController() {
  const pathname = usePathname();
  const { session, isLoading, setSession } = useSession();
  const [state, setState] = React.useState<SimulationStateView | null>(null);
  const [bootstrapping, setBootstrapping] = React.useState(false);
  const [switchingTo, setSwitchingTo] =
    React.useState<SimulationActorKey | null>(null);
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let active = true;
    void getSimulationState()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const active = Boolean(state?.enabled && state.actorKey);
    if (active) root.setAttribute(SIMULATION_ACTIVE_ATTRIBUTE, "true");
    else root.removeAttribute(SIMULATION_ACTIVE_ATTRIBUTE);
    return () => root.removeAttribute(SIMULATION_ACTIVE_ATTRIBUTE);
  }, [state?.actorKey, state?.enabled]);

  React.useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    const root = document.documentElement;
    if (!toolbar || !state?.enabled || !state.actorKey) {
      root.style.removeProperty(SIMULATION_HEIGHT_VAR);
      return;
    }
    const publish = () =>
      root.style.setProperty(
        SIMULATION_HEIGHT_VAR,
        `${toolbar.offsetHeight}px`,
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(toolbar);
    return () => {
      observer.disconnect();
      root.style.removeProperty(SIMULATION_HEIGHT_VAR);
    };
  }, [state?.actorKey, state?.enabled]);
  React.useEffect(() => {
    if (!state?.enabled || !state.actorKey || isLoading || bootstrapping)
      return;
    if (actorMatchesSession(state, session)) return;
    let cancelled = false;
    setBootstrapping(true);
    void createSimulationSession()
      .then(async ({ session: next }) => {
        if (cancelled) return;
        const stored = await sessionService.saveSession(next);
        await markPendingAuthLoginCompleted({
          uid: stored.uid,
          phone: stored.phone,
        });
        setSession(stored);
        window.location.reload();
      })
      .catch((error) => {
        console.error("[Simulation] Actor bootstrap failed", error);
        setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, session, setSession, state]);

  React.useEffect(() => {
    if (!state?.enabled || !state.actorKey || !session?.sessionToken) return;
    if (!actorMatchesSession(state, session)) return;
    const timer = window.setTimeout(() => {
      void checkpointSimulationPath(
        currentRoute(),
        session.sessionToken!,
      ).catch(() => undefined);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [pathname, session, state]);

  const switchActor = async (key: SimulationActorKey) => {
    if (
      !state ||
      !session?.sessionToken ||
      key === state.actorKey ||
      switchingTo
    )
      return;
    setSwitchingTo(key);
    try {
      if (state.actorKey) {
        await checkpointSimulationPath(currentRoute(), session.sessionToken);
      }
      window.location.assign(targetUrl(state, key));
    } catch (error) {
      console.error("[Simulation] Actor switch failed", error);
      setSwitchingTo(null);
    }
  };
  const disableSimulation = async () => {
    if (!state || !session?.sessionToken || !isSuperAdmin(session)) return;
    setSwitchingTo("super-admin");
    try {
      await checkpointSimulationPath(currentRoute(), session.sessionToken);
      const next = await setSimulationMode(false, session.sessionToken);
      const hostname = window.location.hostname;
      window.location.assign(`http://${hostname}:3001${next.normalRoute}`);
    } catch (error) {
      console.error("[Simulation] Disable failed", error);
      setSwitchingTo(null);
    }
  };

  if (!state?.enabled || !state.actorKey) return null;
  const activeActor =
    state.actors.find((item) => item.key === state.actorKey) ?? null;
  const activeSuperAdmin = Boolean(session && isSuperAdmin(session));

  return (
    <OverlayChromeBranch
      ref={toolbarRef}
      id="features-dev-tools-presentation-simulationruntimecontroller-overlaychromebranch-1-sim100"
      className="fixed inset-x-0 top-0 z-[180] border-b border-primary/30 bg-surface/95 px-2 pb-2 pt-[calc(0.4rem+var(--asol-safe-area-top))] shadow-md backdrop-blur"
      {...{ [SIMULATION_TOOLBAR_ATTRIBUTE]: "true" }}
    >
      <div
        id="features-dev-tools-presentation-simulationruntimecontroller-div-2-sim101"
        className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto"
      >
        <div
          id="features-dev-tools-presentation-simulationruntimecontroller-div-3-sim102"
          className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
        >
          <UsersRound className="h-4 w-4" />
          محاكاة حقيقية
        </div>
        {state.actors.map((actor) => (
          <Button
            key={actor.key}
            type="button"
            size="sm"
            variant={actor.key === state.actorKey ? "default" : "outline"}
            disabled={Boolean(switchingTo) || bootstrapping}
            onClick={() => void switchActor(actor.key)}
            className="shrink-0 whitespace-nowrap"
            aria-current={actor.key === state.actorKey ? "page" : undefined}
          >
            {switchingTo === actor.key ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {actor.labelAr}
          </Button>
        ))}
        <div
          id="features-dev-tools-presentation-simulationruntimecontroller-div-4-sim103"
          className="ms-auto flex shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs"
        >
          <span
            id="features-dev-tools-presentation-simulationruntimecontroller-text-5-sim104"
            className="max-w-36 truncate"
            aria-label={activeActor?.labelAr}
          >
            {bootstrapping ? "تجهيز الجلسة..." : activeActor?.labelAr}
          </span>
          {activeSuperAdmin ? (
            <label
              id="features-dev-tools-presentation-simulationruntimecontroller-label-6-sim105"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Power className="h-3.5 w-3.5" />
              <span id="features-dev-tools-presentation-simulationruntimecontroller-text-7-sim106">
                المحاكاة
              </span>
              <Switch
                checked
                disabled={Boolean(switchingTo)}
                onCheckedChange={(checked) => {
                  if (!checked) void disableSimulation();
                }}
                aria-label="إيقاف وضع المحاكاة"
              />
            </label>
          ) : null}
        </div>
      </div>
    </OverlayChromeBranch>
  );
}
