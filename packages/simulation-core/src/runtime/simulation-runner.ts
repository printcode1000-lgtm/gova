import type {
  PageInteractionDefinition,
  SimulationExecutionPort,
  SimulationProgressStep,
  SimulationRunResult,
  SimulationRuntime,
  SimulationUser,
  UserPageDefinition,
} from "../domain/simulation.types";
import { pickRandomSimulationImage } from "./random-image";

export interface RunPageInteractionInput {
  runtime: SimulationRuntime;
  page: UserPageDefinition;
  interaction: PageInteractionDefinition;
  user?: SimulationUser;
  internalCatalogImages?: readonly string[];
  port: SimulationExecutionPort;
  onProgress?: (steps: readonly SimulationProgressStep[]) => void;
}

function interpolate(value: string, user?: SimulationUser): string {
  return value
    .replaceAll("{{phone}}", user?.phone ?? "")
    .replaceAll("{{password}}", user?.password ?? "")
    .replaceAll("{{storeName}}", user?.storeName ?? "");
}

export async function runPageInteraction(
  input: RunPageInteractionInput,
): Promise<SimulationRunResult> {
  const steps: SimulationProgressStep[] = [
    { id: "environment", label: "تحديد بيئة التشغيل", status: "pending" },
    { id: "page", label: "تحميل الصفحة الحقيقية", status: "pending" },
    { id: "interaction", label: "تنفيذ تفاعل المستخدم الحقيقي", status: "pending" },
    { id: "result", label: "قراءة النتيجة النهائية", status: "pending" },
  ];
  const publish = () => input.onProgress?.(steps.map((step) => ({ ...step })));
  const begin = (id: string, detail?: string) => {
    const step = steps.find((candidate) => candidate.id === id)!;
    step.status = "running";
    step.detail = detail;
    step.startedAt = new Date().toISOString();
    publish();
  };
  const pass = (id: string, detail?: string) => {
    const step = steps.find((candidate) => candidate.id === id)!;
    step.status = "passed";
    step.detail = detail ?? step.detail;
    step.completedAt = new Date().toISOString();
    publish();
  };

  try {
    begin("environment", input.runtime);
    pass("environment", `المسار الفعلي للبيئة: ${input.runtime}`);

    begin("page", input.page.samplePath);
    await input.port.loadPage(input.page.samplePath);
    pass("page", input.page.samplePath);

    begin("interaction", input.interaction.label);
    for (const action of input.interaction.actions) {
      if (action.type === "set-value") {
        await input.port.setValue(action.target, interpolate(action.value, input.user));
      } else if (action.type === "select-first-option") {
        await input.port.selectFirstOption(action.target);
      } else if (action.type === "press-key") {
        await input.port.pressKey(action.target, action.key);
      } else if (action.type === "click") {
        await input.port.click(action.target, action.accessibleLabel);
      } else if (action.type === "set-internal-image") {
        await input.port.setInternalImage(
          action.target,
          pickRandomSimulationImage(input.internalCatalogImages ?? []),
        );
      } else if (action.type === "submit") {
        await input.port.submit(action.target);
      } else if (action.type === "wait-for-target") {
        await input.port.waitForTarget(action.target, action.timeoutMs);
      } else {
        await input.port.wait(action.milliseconds);
      }
    }
    pass("interaction");

    begin("result");
    pass("result", "اكتمل التفاعل داخل التطبيق الحقيقي دون Mock.");
    return {
      succeeded: true,
      runtime: input.runtime,
      pageId: input.page.id,
      interactionId: input.interaction.id,
      steps,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const active = steps.find((step) => step.status === "running");
    if (active) {
      active.status = "failed";
      active.detail = message;
      active.completedAt = new Date().toISOString();
    }
    publish();
    return {
      succeeded: false,
      runtime: input.runtime,
      pageId: input.page.id,
      interactionId: input.interaction.id,
      steps,
      error: message,
    };
  } finally {
    input.port.dispose();
  }
}
