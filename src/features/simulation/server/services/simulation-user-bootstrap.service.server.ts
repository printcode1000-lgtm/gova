import "server-only";

import { SIMULATION_USERS, type SimulationUser } from "@asol/simulation-core";
import { authService } from "@/features/auth/server";
import { CATEGORY_CONSTANTS, categoryService } from "@/features/categories";
import { EMPTY_STORE_DETAILS } from "@/features/profile";
import { profileService } from "@/features/profile/server";
import type {
  SimulationUserBootstrapResult,
  SimulationUsersBootstrapResponse,
} from "../../domain/simulation-user-bootstrap.types";

function sellerSpecialties() {
  const main = categoryService
    .getProfileMainOptions()
    .find((item) => item.id !== CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID);
  if (!main) return { main: [] as number[], sub: {} as Record<string, number[]> };
  const child = categoryService
    .getProfileSubOptions(main.id, main.isCollection)
    .find((item) => item.selectable !== false && !item.isDoctorAppointmentGroup);
  const childId = child?.originalId ?? child?.id;
  return {
    main: [main.id],
    sub: typeof childId === "number" && Number.isInteger(childId)
      ? { [String(main.id)]: [childId] }
      : {},
  };
}

function specialtiesFor(user: SimulationUser) {
  if (user.role === "delivery") {
    return { main: [CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID], sub: {} };
  }
  if (user.role === "seller") return sellerSpecialties();
  return { main: [], sub: {} };
}

async function ensureSimulationUser(
  user: SimulationUser,
): Promise<SimulationUserBootstrapResult> {
  try {
    const existing = await authService.checkPhone(user.phone);
    let uid: string;
    if (existing.exists) {
      uid = (await authService.login({ phone: user.phone, password: user.password })).uid;
    } else {
      uid = (
        await authService.register({
          phone: user.phone,
          password: user.password,
          confirmPassword: user.password,
          phoneVerified: true,
          email: "",
        })
      ).uid;
    }
    await profileService.saveStoreDetails({
      uid,
      ...EMPTY_STORE_DETAILS,
      storeName: user.storeName,
      storeDescription: `حساب محاكاة ثابت — ${user.storeName}`,
    });
    await profileService.saveSpecialties({ uid, ...specialtiesFor(user) });
    return { id: user.id, uid, status: existing.exists ? "ready" : "created" };
  } catch (error) {
    return {
      id: user.id,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function ensureSimulationUsers(): Promise<SimulationUsersBootstrapResponse> {
  const users: SimulationUserBootstrapResult[] = [];
  for (const user of SIMULATION_USERS) users.push(await ensureSimulationUser(user));
  return { users };
}
