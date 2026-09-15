import { notificationsDataSource, usersDataSource } from "../../../core";
import 'server-only';
import type { IDatabaseClient } from '../../../core/database/database-client.interface';
import type { BroadcastRecipient, NotificationPlatform } from '@asol/notifications-core';
interface RecipientAccumulator { uid:string; tokenCount:number; platforms:Set<NotificationPlatform>; providers:Set<string>; lastSeenAt?:string }
const UID_LOOKUP_CHUNK_SIZE=400;
export class BroadcastRecipientRepository {
  constructor(private readonly notifications:IDatabaseClient=notificationsDataSource, private readonly usersDatabase:IDatabaseClient=usersDataSource) {}
  async listReceivers():Promise<BroadcastRecipient[]> {
    const tokenRows=await this.notifications.execute(`SELECT uid, platform, provider, last_seen_at AS lastSeenAt FROM user_notification_tokens WHERE enabled = 1 AND deleted_at IS NULL`) as any[];
    const grouped=new Map<string,RecipientAccumulator>();
    for(const row of tokenRows){const current=grouped.get(row.uid)??{uid:row.uid,tokenCount:0,platforms:new Set<NotificationPlatform>(),providers:new Set<string>(),lastSeenAt:undefined};current.tokenCount++;current.platforms.add(row.platform);current.providers.add(row.provider);if(!current.lastSeenAt||String(row.lastSeenAt??'')>current.lastSeenAt)current.lastSeenAt=row.lastSeenAt??undefined;grouped.set(row.uid,current)}
    if(!grouped.size)return [];
    const identities=await this.loadIdentities([...grouped.keys()]);
    return [...grouped.values()].flatMap(item=>{const identity=identities.get(item.uid);return identity?[{uid:item.uid,phoneMasked:maskPhone(identity.phone),emailMasked:identity.email?maskEmail(identity.email):undefined,tokenCount:item.tokenCount,platforms:[...item.platforms],providers:[...item.providers],lastSeenAt:item.lastSeenAt}]:[]}).sort((a,b)=>b.tokenCount-a.tokenCount||a.uid.localeCompare(b.uid));
  }
  private async loadIdentities(uids:string[]):Promise<Map<string,{phone:string;email:string|null}>> {const identities=new Map<string,{phone:string;email:string|null}>();for(let i=0;i<uids.length;i+=UID_LOOKUP_CHUNK_SIZE){const chunk=uids.slice(i,i+UID_LOOKUP_CHUNK_SIZE);const rows=await this.usersDatabase.execute(`SELECT uid, phone, email FROM users WHERE uid IN (${chunk.map(()=>'?').join(',')}) AND deleted_at IS NULL`,chunk) as any[];for(const row of rows)identities.set(row.uid,{phone:row.phone,email:row.email})}return identities;}
}
function maskPhone(phone:string){const d=phone.replace(/\D/g,'');return d.length<=5?'*****':`${d.slice(0,3)}****${d.slice(-3)}`}
function maskEmail(email:string){const [name,domain]=email.split('@');return !name||!domain?'***':`${name.slice(0,2)}***@${domain}`}
export const broadcastRecipientRepository=new BroadcastRecipientRepository();
