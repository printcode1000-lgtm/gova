"use client";

import { capacitorPermissionService } from "../infrastructure/capacitor/capacitor-permission.service";

export class PermissionService {
  request() {
    return capacitorPermissionService.request();
  }

  current() {
    return capacitorPermissionService.getCurrent();
  }
}

export const notificationPermissionService = new PermissionService();
