"use client";

import { capacitorPermissionService } from "../infrastructure/capacitor/capacitor-permission.service";

export class PermissionService {
  request() {
    return capacitorPermissionService.request();
  }

  current() {
    return capacitorPermissionService.getCurrent();
  }

  checkResult() {
    return capacitorPermissionService.checkResult();
  }

  requestResult() {
    return capacitorPermissionService.requestResult();
  }

  canOpenSettings() {
    return capacitorPermissionService.canOpenSettings();
  }

  openSettings() {
    return capacitorPermissionService.openSettings();
  }
}

export const notificationPermissionService = new PermissionService();
