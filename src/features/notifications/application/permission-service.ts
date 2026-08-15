import { nativePermissionService } from "../infrastructure/native/native-permission.service";

export class PermissionService {
  request() {
    return nativePermissionService.request();
  }

  current() {
    return nativePermissionService.getCurrent();
  }

  checkResult() {
    return nativePermissionService.checkResult();
  }

  requestResult() {
    return nativePermissionService.requestResult();
  }

  canOpenSettings() {
    return nativePermissionService.canOpenSettings();
  }

  openSettings() {
    return nativePermissionService.openSettings();
  }
}

export const notificationPermissionService = new PermissionService();
