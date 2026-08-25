import "server-only";

import { SIMULATION_USERS, type SimulationUser } from "@asol/simulation-core";
import { authService } from "@/features/auth/server";
import { CATEGORY_CONSTANTS, categoryService } from "@/features/categories";
import { EMPTY_STORE_DETAILS } from "@/features/profile";
import { profileService } from "@/features/profile/server";
import type {
  SimulationUserBootstrapResult,
  SimulationUserSpecialtySelection,
  SimulationUsersBootstrapResponse,
} from "../../domain/simulation-user-bootstrap.types";

interface SimulationSpecialtyAssignment {
  values: {
    main: number[];
    sub: Record<string, number[]>;
  };
  selection?: SimulationUserSpecialtySelection;
}

function sellerSpecialties(): SimulationSpecialtyAssignment {
  const main = categoryService
    .getProfileMainOptions()
    .find((item) => item.id !== CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID);
  if (!main) return { values: { main: [], sub: {} } };

  const child = categoryService
    .getProfileSubOptions(main.id, main.isCollection)
    .find((item) => item.selectable !== false && !item.isDoctorAppointmentGroup);
  const childId = child?.originalId ?? child?.id;
  const validChildId =
    typeof childId === "number" && Number.isInteger(childId) ? childId : undefined;

  return {
    values: {
      main: [main.id],
      sub: validChildId !== undefined ? { [String(main.id)]: [validChildId] } : {},
    },
    selection: {
      main: { id: main.id, nameAr: main.nameAr },
      ...(child && validChildId !== undefined
        ? { sub: { id: validChildId, nameAr: child.nameAr } }
        : {}),
    },
  };
}

function specialtiesFor(user: SimulationUser): SimulationSpecialtyAssignment {
  if (user.role === "delivery") {
    const delivery = categoryService
      .getProfileMainOptions()
      .find((item) => item.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID);
    return {
      values: { main: [CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID], sub: {} },
      ...(delivery
        ? {
            selection: {
              main: { id: delivery.id, nameAr: delivery.nameAr },
            },
          }
        : {}),
    };
  }
  if (user.role === "seller") return sellerSpecialties();
  return { values: { main: [], sub: {} } };
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
    const specialtyAssignment = specialtiesFor(user);
    await profileService.saveSpecialties({ uid, ...specialtyAssignment.values });
    return {
      id: user.id,
      uid,
      status: existing.exists ? "ready" : "created",
      specialtySelection: specialtyAssignment.selection,
    };
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
