/**
 * The serializable shape `/dev/cloud-accounts` renders.
 *
 * Every value here is derived on the server from the code that owns it — account
 * declarations, the route-ownership registry, the storage account and profile
 * registries, the OTA target, the desired-schema manifests, `package.json`
 * scripts and each deployment's `vercel.json`. The client receives this object
 * and renders it; it never restates a fact of its own.
 */

export type CloudUsageStatus = "ok" | "missingCredentials" | "apiError";

export type VercelCloudAccountUsageMetric = {
  readonly label: string;
  readonly slug: string;
  readonly usedDisplay: string | null;
  readonly limitDisplay: string;
  readonly source: "focusBilling" | "dashboardOnly";
};

export type VercelCloudAccountUsage = {
  readonly status: CloudUsageStatus;
  readonly capturedAt: string | null;
  /** Dashboard slug of the team the token deploys into, as Vercel reports it. */
  readonly teamSlug: string | null;
  /** Login of the token's owner, as Vercel reports it. */
  readonly ownerEmail: string | null;
  readonly billingPeriodStart: string | null;
  readonly billingPeriodEnd: string | null;
  /** Billing plan of the team, as Vercel reports it. */
  readonly planLabel: string | null;
  /** `org/repo` the project is linked to in Vercel, or `null` when it has no Git link. */
  readonly gitRepository: string | null;
  readonly edgeRequestsLimit: number;
  readonly fastDataTransferBytesLimit: number;
  readonly deploymentsPerDayLimit: number;
  readonly buildsPerHourLimit: number;
  readonly projectsLimit: number;
  readonly runtimeLogsHoursLimit: number;
  readonly functionDurationSecondsLimit: number;
  readonly apiRateLimit: number | null;
  readonly apiRateLimitRemaining: number | null;
  readonly apiRateLimitReset: string | null;
  readonly billedCostUsd: number | null;
  readonly effectiveCostUsd: number | null;
  readonly billingLineCount: number | null;
  readonly topServices: readonly string[];
  readonly metrics: readonly VercelCloudAccountUsageMetric[];
  readonly message: string | null;
};

/** One Turso organization's reading, live or from the snapshot (same reader). */
export type TursoCloudAccountUsage = {
  readonly status: CloudUsageStatus;
  readonly capturedAt: string | null;
  readonly billingPeriodStart: string | null;
  readonly billingPeriodEnd: string | null;
  readonly plan: string | null;
  readonly overages: boolean | null;
  /** Login of the token's owner, as Turso reports it. */
  readonly ownerEmail: string | null;
  readonly ownerUsername: string | null;
  /** Database names the organization holds, as Turso reports them. */
  readonly cloudDatabaseNames: readonly string[];
  readonly rowsRead: number | null;
  readonly rowsReadLimit: number;
  readonly rowsWritten: number | null;
  readonly rowsWrittenLimit: number;
  readonly storageBytes: number | null;
  readonly storageBytesLimit: number;
  readonly bytesSynced: number | null;
  readonly bytesSyncedLimit: number;
  readonly inputBytes: number | null;
  readonly outputBytes: number | null;
  readonly databases: number | null;
  readonly databasesLimit: number;
  readonly locations: number | null;
  readonly locationsLimit: number;
  readonly groups: number | null;
  readonly groupsLimit: number;
  readonly message: string | null;
};

export type R2CloudAccountUsage = {
  readonly status: CloudUsageStatus;
  readonly capturedAt: string | null;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly classAOperations: number | null;
  readonly classAOperationsLimit: number;
  readonly classBOperations: number | null;
  readonly classBOperationsLimit: number;
  readonly storageBytes: number | null;
  readonly storageBytesLimit: number;
  readonly objectCount: number | null;
  readonly uploadCount: number | null;
  readonly operationTypes: readonly string[];
  readonly message: string | null;
};

export type R2CloudAccountContents = {
  readonly status: CloudUsageStatus;
  readonly capturedAt: string | null;
  readonly objectCount: number | null;
  readonly totalSizeBytes: number | null;
  readonly latestObjectKey: string | null;
  readonly latestObjectLastModified: string | null;
  readonly message: string | null;
};

export type VercelAccountFacts = {
  readonly name: string;
  readonly project: string;
  readonly email: string;
  /** `services/<name>` for a service, `null` for the repository-root app. */
  readonly serviceDir: string | null;
  /** The `package.json` script that deploys this account, as `npm run <key>`. */
  readonly deployCommand: string | null;
  /** How many environment keys the declaration lets this deployment hold. */
  readonly declaredEnvCount: number;
  /** Whether this deployment's `vercel.json` lets a Git push deploy it. */
  readonly gitAutoDeploy: boolean;
  /** Route patterns this account owns in `ROUTE_OWNERSHIP`. */
  readonly ownedRoutePatterns: readonly string[];
  /** True for the repository-root deployment: the app frontend and the `/api` compatibility boundary. */
  readonly servesFrontend: boolean;
  readonly usage: VercelCloudAccountUsage;
};

export type CloudAccountRoutePattern = {
  readonly pattern: string;
  readonly methods: readonly string[];
  readonly description: string;
};

export type CloudAccountRouteGroup = {
  readonly owner: string;
  readonly project: string;
  readonly patterns: readonly CloudAccountRoutePattern[];
};

/** What the repository-root deployment answers under `/api`, from its build and `src/proxy.ts`. */
export type GovaBoundaryFacts = {
  readonly project: string;
  /** API routes the deployment keeps and answers itself. */
  readonly keptRoutes: readonly { readonly pattern: string; readonly methods: readonly string[] }[];
  readonly boundaryMatcher: string;
  readonly boundaryMethods: readonly string[];
  readonly redirectStatus: number;
  readonly unownedStatus: number;
  readonly unownedError: string;
};

export type TursoDatabaseFacts = {
  readonly label: string;
  /** The database name in Turso, from the host of its configured URL. */
  readonly cloudName: string;
  readonly tables: readonly string[];
  /** Vercel projects whose declared environment carries this database's credentials. */
  readonly readers: readonly string[];
};

export type TursoAccountFacts = {
  /** Organization name, read from its environment key. */
  readonly organization: string;
  readonly organizationEnv: string;
  readonly databases: readonly TursoDatabaseFacts[];
  /** Union of every database reader, in declaration order. */
  readonly readers: readonly string[];
  readonly usage: TursoCloudAccountUsage;
};

export type R2AccountFacts = {
  readonly id: string;
  readonly accountId: string;
  readonly email: string;
  readonly bucketName: string;
  readonly publicUrl: string;
  readonly envPrefix: string;
  /** Storage provider ids whose profiles resolve here, the owning package for OTA, or `null` when unused. */
  readonly target: string | null;
  readonly usage: R2CloudAccountUsage;
  readonly contents: R2CloudAccountContents;
};

export type StorageDestinationFacts = {
  /** Storage profile id, or the package that writes the destination. */
  readonly source: string;
  readonly r2AccountId: string;
  readonly folder: string;
};

/** A logical database whose configured URL names no known organization. */
export type TursoUnassignedDatabase = {
  readonly label: string;
  readonly urlEnv: string;
};

export type CloudAccountsCommands = {
  readonly secretsBackup: string;
  readonly architectureCheck: string;
  readonly vercelUsage: string;
  readonly tursoUsage: string;
  readonly r2Usage: string;
  readonly r2Contents: string;
  readonly pushVercelEnv: string;
};

export type CloudAccountsFacts = {
  readonly localEnvFile: string;
  /** The environment contract the Turso organizations are read from. */
  readonly envContractFile: string;
  /** Whether Git ignores the local secrets file. */
  readonly localEnvFileGitIgnored: boolean;
  /** The project `db:push:vercel-env` reconciles, from the declaration its script imports. */
  readonly pushVercelEnvProject: string | null;
  /** The architecture rule that forbids a deployment importing an inter-account channel. */
  readonly isolationRule: string;
  readonly routingCatalogPath: string;
  readonly otaPackage: string;
  readonly bridgePackage: string;
  readonly commands: CloudAccountsCommands;
  readonly vercel: readonly VercelAccountFacts[];
  readonly routeGroups: readonly CloudAccountRouteGroup[];
  readonly govaBoundary: GovaBoundaryFacts | null;
  readonly turso: readonly TursoAccountFacts[];
  readonly tursoUnassigned: readonly TursoUnassignedDatabase[];
  readonly r2: readonly R2AccountFacts[];
  readonly storageDestinations: readonly StorageDestinationFacts[];
};

export type LiveR2UsageRow = R2CloudAccountUsage & { readonly id: string };


export type LiveTursoUsageRow = TursoCloudAccountUsage & { readonly id: string };

/** Envelope every live `/api/dev/cloud-accounts/*` read returns. */
export type LiveCloudAccountsResponse<Row> = {
  readonly capturedAt: string;
  readonly accounts: readonly Row[];
};

export type LiveR2ContentsRow = R2CloudAccountContents & { readonly id: string };

export type LiveVercelUsageRow = VercelCloudAccountUsage & { readonly id: string };

/** Live rows by account id, per source; empty until that source's tab is opened. */
export type CloudAccountsLiveUsage = {
  readonly vercel: Readonly<Record<string, LiveVercelUsageRow>>;
  readonly turso: Readonly<Record<string, LiveTursoUsageRow>>;
  readonly r2Usage: Readonly<Record<string, LiveR2UsageRow>>;
  readonly r2Contents: Readonly<Record<string, LiveR2ContentsRow>>;
};
