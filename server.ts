import { defineRpcContract, type BbPluginApi } from '@get-bb/plugin-sdk';
import { z } from 'zod';
import { collect, parse, type Sample } from './core';
const configSchema=z.object({host:z.string().regex(/^$|^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/),enabled:z.boolean(),minutes:z.number().int().min(5).max(60)});
type Config=z.infer<typeof configSchema>;
const sampleSchema=z.object({at:z.number(),cpu:z.number().nullable(),memory:z.number(),disk:z.number(),inode:z.number(),uptime:z.number(),load:z.string(),total:z.number(),idle:z.number(),memoryUsed:z.number().optional(),memoryTotal:z.number().optional(),diskUsed:z.number().optional(),diskTotal:z.number().optional(),diskAvailable:z.number().optional(),inodeUsed:z.number().optional(),inodeTotal:z.number().optional(),cores:z.number().optional()});
const stateSchema=z.object({config:configSchema,samples:z.array(sampleSchema),error:z.string().nullable(),attempt:z.number().nullable(),busy:z.boolean()});
export const rpcContract=defineRpcContract({status:{input:z.null(),output:stateSchema},configure:{input:configSchema,output:z.boolean()},refresh:{input:z.null(),output:stateSchema}});
export default async function plugin(bb:BbPluginApi){
 let config:Config=configSchema.parse(await bb.storage.kv.get('config')??{host:'',enabled:false,minutes:5});
 // Bound history to 288 measurements, well below the KV size limit.
 let samples:Sample[]=z.array(sampleSchema).parse(await bb.storage.kv.get('samples')??[]).slice(-288);
 let error:string|null=null,attempt:number|null=null,busy=false;
 let lastAttempt=0,disposed=false,generation=0;
 const controllers=new Set<AbortController>();
 const status=()=>({config,samples,error,attempt,busy});
 async function poll(){
  if(disposed||busy||!config.enabled||!config.host||Date.now()-lastAttempt<config.minutes*60000) return;
  const host=config.host,version=generation;busy=true;lastAttempt=Date.now();attempt=lastAttempt;
  const controller=new AbortController();controllers.add(controller);
  try{const raw=await collect(host,controller.signal);if(disposed||version!==generation)return;const sample=parse(raw,samples.at(-1));samples=[...samples,sample].slice(-288);await bb.storage.kv.set('samples',samples);error=null;}
  catch(cause){if(!disposed&&version===generation)error=cause instanceof Error?cause.message:'Ошибка SSH';}
  finally{controllers.delete(controller);busy=false;}
 }
 bb.rpc.register(rpcContract,{status:async()=>status(),configure:async(next)=>{
   const changed=next.host!==config.host;generation++;for(const c of controllers)c.abort();config=next;lastAttempt=0;error=null;
   await bb.storage.kv.set('config',config);
   if(changed){samples=[];await bb.storage.kv.set('samples',samples);}return true;
 },refresh:async()=>{await poll();return status();}});
 bb.cli.register({name:'vps-watch',summary:'Лёгкий мониторинг Linux VPS по SSH',commands:[{name:'status',summary:'Последние метрики без обращения к VPS',usage:'bb vps-watch status'}],async run(argv){if(argv[0]!=='status')return {exitCode:1,stderr:'Usage: bb vps-watch status'};return {exitCode:0,stdout:JSON.stringify(status())};}});
 bb.background.service('poll',{async start(signal){
  while(!signal.aborted){await poll();if(signal.aborted)break;await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,30000);signal.addEventListener('abort',done,{once:true});if(signal.aborted)done();});}
 }});
 bb.onDispose(()=>{disposed=true;for(const c of controllers)c.abort();});
}
