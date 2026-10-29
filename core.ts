import { execFile } from 'node:child_process';
export const COMMAND = `LC_ALL=C; export LC_ALL; printf 'STAT\\n'; awk '/^cpu /{print} /^cpu[0-9]/{n++} END{print "CORES " n}' /proc/stat; printf 'MEM\\n'; cat /proc/meminfo; printf 'UP\\n'; cat /proc/uptime; printf 'LOAD\\n'; cat /proc/loadavg; printf 'DISK\\n'; df -Pk /; printf 'INODE\\n'; df -Pi /`;
export type Sample = { at: number; cpu: number | null; memory: number; disk: number; inode: number; uptime: number; load: string; total: number; idle: number; memoryUsed?: number; memoryTotal?: number; diskUsed?: number; diskTotal?: number; diskAvailable?: number; inodeUsed?: number; inodeTotal?: number; cores?: number };
export function parse(raw: string, previous?: Sample): Sample {
  const section = (start: string, end?: string) => raw.split(start+'\n')[1]?.split(end ? end+'\n' : '\0')[0]?.trim() ?? '';
  const ticks = section('STAT','MEM').split('\n')[0].split(/\s+/).slice(1).map(Number);
  if(ticks.length < 4 || ticks.some(x=>!Number.isFinite(x))) throw new Error('Некорректный /proc/stat');
  const total = ticks.slice(0,8).reduce((a,b)=>a+b,0), idle = ticks[3]+(ticks[4]??0);
  const mem = Object.fromEntries(section('MEM','UP').split('\n').map(l=>{const [key,value]=l.split(/:\s*/);return [key,Number(value?.split(/\s+/)[0])];}));
  const percent = (name:string,end?:string) => { const rows=section(name,end).split('\n'); const value=Number(rows.at(-1)?.trim().split(/\s+/)[4]?.replace('%','')); if(!Number.isFinite(value)) throw new Error('Некорректный df'); return value; };
  const capacity=(name:string,end?:string)=>{const row=section(name,end).split('\n').at(-1)!.trim().split(/\s+/);const [total,used,available]=row.slice(1,4).map(Number);if(![total,used,available].every(Number.isFinite)||total<=0||used<0||available<0)throw new Error('Некорректная ёмкость df');return {total,used,available};};
  const disk=capacity('DISK','INODE'),inode=capacity('INODE');
  const cores=Number(section('STAT','MEM').match(/CORES (\d+)/)?.[1])||undefined;
  const uptime=Number(section('UP','LOAD').split(/\s+/)[0]);
  if(!(mem.MemTotal>0) || !Number.isFinite(mem.MemAvailable) || !Number.isFinite(uptime)) throw new Error('Неполные системные метрики');
  const delta=previous && uptime>=previous.uptime ? total-previous.total : 0;
  return {memoryUsed:(mem.MemTotal-mem.MemAvailable)*1024,memoryTotal:mem.MemTotal*1024,diskUsed:disk.used*1024,diskTotal:disk.total*1024,diskAvailable:disk.available*1024,inodeUsed:inode.used,inodeTotal:inode.total,cores,at:Date.now(),cpu:delta>0 && previous ? Math.max(0,Math.min(100,100*(1-(idle-previous.idle)/delta))) : null,memory:100*(1-mem.MemAvailable/mem.MemTotal),disk:percent('DISK','INODE'),inode:percent('INODE'),uptime,load:section('LOAD','DISK').split(/\s+/).slice(0,3).join(' '),total,idle};
}
export function collect(host: string, signal: AbortSignal): Promise<string> {
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(host)) throw new Error('Укажите SSH alias: буквы, цифры, точка, дефис или подчёркивание');
  return new Promise((resolve,reject)=>execFile('ssh',['-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','-o','ConnectionAttempts=1','-o','ServerAliveInterval=5','-o','ServerAliveCountMax=1',host,COMMAND],{timeout:15000,maxBuffer:32768,signal},(error,stdout)=>error?reject(new Error('SSH: '+error.message.slice(0,400))):resolve(stdout)));
}
