import 'server-only';
import type { IDatabaseClient } from '../../../core/database/database-client.interface';
import type { OtaReleaseAuditEntry, OtaReleaseManifestRecord, OtaReleaseSummary } from '../entities';

interface OtaReleaseEntity { releaseId:string;version:string;manifestCreatedAt:string;baseUrl:string;size:number;fileCount:number;minimumNativeVersion:string;mandatory:boolean;notes:string;signature:string;manifestJson:string;approved:boolean;rolloutPercentage:number;approvedAt:string|null;approvedByUid:string|null;revokedAt:string|null;revokedByUid:string|null;discoveredAt:string;lastSeenAt:string }
interface OtaReleaseAuditEntity { id:string;releaseId:string;version:string;action:OtaReleaseAuditEntry['action'];actorUid:string|null;createdAt:string }
const RELEASE_SELECT=`SELECT release_id AS releaseId, version, manifest_created_at AS manifestCreatedAt, base_url AS baseUrl, size, file_count AS fileCount, minimum_native_version AS minimumNativeVersion, mandatory, notes, signature, manifest_json AS manifestJson, approved, rollout_percentage AS rolloutPercentage, approved_at AS approvedAt, approved_by_uid AS approvedByUid, revoked_at AS revokedAt, revoked_by_uid AS revokedByUid, discovered_at AS discoveredAt, last_seen_at AS lastSeenAt FROM ota_releases`;
const AUDIT_SELECT=`SELECT id, release_id AS releaseId, version, action, actor_uid AS actorUid, created_at AS createdAt FROM ota_release_audit`;
function releaseRow(row:any):OtaReleaseEntity{return{...row,size:Number(row.size),fileCount:Number(row.fileCount),mandatory:Boolean(row.mandatory),approved:Boolean(row.approved),rolloutPercentage:Number(row.rolloutPercentage)}}
export class OtaReleaseRepository {
 constructor(private readonly database:IDatabaseClient){}
 async getApproval(releaseId:string){const r=(await this.database.execute(`SELECT version, approved, rollout_percentage AS rolloutPercentage FROM ota_releases WHERE release_id=? LIMIT 1`,[releaseId]))[0] as any;return r?{version:r.version,approved:Boolean(r.approved),rolloutPercentage:Number(r.rolloutPercentage)}:null}
 async get(releaseId:string){const r=(await this.database.execute(`${RELEASE_SELECT} WHERE release_id=? LIMIT 1`,[releaseId]))[0];return r?toSummary(releaseRow(r)):null}
 async getManifest(releaseId:string){const r=(await this.database.execute('SELECT manifest_json AS manifestJson FROM ota_releases WHERE release_id=? LIMIT 1',[releaseId]))[0] as any;if(!r)return null;try{return JSON.parse(r.manifestJson)}catch{throw new Error('otaStoredManifestInvalid')}}
 async discover(manifest:OtaReleaseManifestRecord):Promise<OtaReleaseSummary>{const current=await this.get(manifest.releaseId),now=new Date().toISOString(),json=JSON.stringify(manifest);if(current){await this.database.execute(`UPDATE ota_releases SET version=?,manifest_created_at=?,base_url=?,size=?,file_count=?,minimum_native_version=?,mandatory=?,notes=?,signature=?,manifest_json=?,last_seen_at=? WHERE release_id=?`,[manifest.version,manifest.createdAt,manifest.baseUrl,manifest.size,manifest.fileCount,manifest.minimumNativeVersion,manifest.mandatory?1:0,manifest.notes,manifest.signature??'',json,now,manifest.releaseId])}else{await this.database.execute(`INSERT INTO ota_releases (release_id,version,manifest_created_at,base_url,size,file_count,minimum_native_version,mandatory,notes,signature,manifest_json,approved,rollout_percentage,discovered_at,last_seen_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,0,100,?,?)`,[manifest.releaseId,manifest.version,manifest.createdAt,manifest.baseUrl,manifest.size,manifest.fileCount,manifest.minimumNativeVersion,manifest.mandatory?1:0,manifest.notes,manifest.signature??'',json,now,now]);await this.addAudit({releaseId:manifest.releaseId,version:manifest.version,action:'discovered'})}const saved=await this.get(manifest.releaseId);if(!saved)throw new Error('otaReleaseSaveFailed');return saved}
 async setApproval(input:{releaseId:string;version:string;approved:boolean;rolloutPercentage:number;actorUid:string}){const current=await this.get(input.releaseId);if(!current||current.version!==input.version)throw new Error('otaReleaseNotFound');if(!Number.isInteger(input.rolloutPercentage)||input.rolloutPercentage<0||input.rolloutPercentage>100)throw new Error('otaRolloutInvalid');if(input.rolloutPercentage<current.rolloutPercentage)throw new Error('otaRolloutCannotDecrease');if(current.approved===input.approved&&current.rolloutPercentage===input.rolloutPercentage)return current;const now=new Date().toISOString();if(input.approved)await this.database.execute(`UPDATE ota_releases SET approved=1,rollout_percentage=?,approved_at=?,approved_by_uid=?,revoked_at=NULL,revoked_by_uid=NULL WHERE release_id=?`,[input.rolloutPercentage,now,input.actorUid,input.releaseId]);else await this.database.execute(`UPDATE ota_releases SET approved=0,rollout_percentage=?,revoked_at=?,revoked_by_uid=? WHERE release_id=?`,[input.rolloutPercentage,now,input.actorUid,input.releaseId]);await this.addAudit({releaseId:input.releaseId,version:input.version,action:current.approved!==input.approved?(input.approved?'approved':'revoked'):'rollout_changed',actorUid:input.actorUid});const saved=await this.get(input.releaseId);if(!saved)throw new Error('otaReleaseSaveFailed');return saved}
 async list(limit=50){return (await this.database.execute(`${RELEASE_SELECT} ORDER BY manifest_created_at DESC LIMIT ?`,[limit])).map(r=>toSummary(releaseRow(r)))}
 async listAudit(limit=100){return (await this.database.execute(`${AUDIT_SELECT} ORDER BY created_at DESC LIMIT ?`,[limit]) as any[]).map(toAuditEntry)}
 private async addAudit(input:{releaseId:string;version:string;action:OtaReleaseAuditEntry['action'];actorUid?:string}){await this.database.execute(`INSERT INTO ota_release_audit (id,release_id,version,action,actor_uid,created_at) VALUES (?,?,?,?,?,?)`,[crypto.randomUUID(),input.releaseId,input.version,input.action,input.actorUid??null,new Date().toISOString()])}
}
export function createOtaReleaseRepository(database:IDatabaseClient){return new OtaReleaseRepository(database)}

/**
 * Capability lists come from the retained manifest, not from columns.
 *
 * The manifest is the signed source of truth and is stored whole, so mirroring
 * these into columns would add a migration and a second copy that can disagree
 * with the signature. A row whose manifest cannot be parsed reports empty lists
 * rather than failing the whole dashboard.
 */
function capabilitiesFromManifest(manifestJson: string): {
  requiredCapabilities: string[];
  optionalCapabilities: string[];
} {
  try {
    const manifest = JSON.parse(manifestJson) as {
      requiredCapabilities?: unknown;
      optionalCapabilities?: unknown;
    };
    const list = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((key): key is string => typeof key === 'string')
        : [];
    return {
      requiredCapabilities: list(manifest.requiredCapabilities),
      optionalCapabilities: list(manifest.optionalCapabilities),
    };
  } catch {
    return { requiredCapabilities: [], optionalCapabilities: [] };
  }
}

function toSummary(row: OtaReleaseEntity): OtaReleaseSummary {
  return {
    ...capabilitiesFromManifest(row.manifestJson),
    releaseId: row.releaseId,
    version: row.version,
    manifestCreatedAt: row.manifestCreatedAt,
    baseUrl: row.baseUrl,
    size: row.size,
    fileCount: row.fileCount,
    minimumNativeVersion: row.minimumNativeVersion,
    mandatory: row.mandatory,
    notes: row.notes,
    signature: row.signature,
    approved: row.approved,
    rolloutPercentage: row.rolloutPercentage,
    approvedAt: row.approvedAt ?? undefined,
    approvedByUid: row.approvedByUid ?? undefined,
    revokedAt: row.revokedAt ?? undefined,
    revokedByUid: row.revokedByUid ?? undefined,
    discoveredAt: row.discoveredAt,
    lastSeenAt: row.lastSeenAt,
  };
}

function toAuditEntry(row: OtaReleaseAuditEntity): OtaReleaseAuditEntry {
  return {
    id: row.id,
    releaseId: row.releaseId,
    version: row.version,
    action: row.action,
    actorUid: row.actorUid ?? undefined,
    createdAt: row.createdAt,
  };
}
