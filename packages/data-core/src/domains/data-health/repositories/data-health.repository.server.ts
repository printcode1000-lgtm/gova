import { DataHealthPart12 } from "./data-health-repository-parts/data-health.repository.part-12";

export type { QuarantinedOriginalCleanupResult } from "./data-health-repository-parts/data-health.repository.part-12";

export class DataHealthRepository extends DataHealthPart12 {}

export const dataHealthRepository = new DataHealthRepository();
