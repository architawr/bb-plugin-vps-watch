#!/usr/bin/python3
import json,time,datetime,pathlib,subprocess,os
p=pathlib.Path('/var/log/vps-history'); now=datetime.datetime.now(datetime.timezone.utc)
m={k:int(v.strip().split()[0]) for k,v in (l.split(':',1) for l in pathlib.Path('/proc/meminfo').read_text().splitlines())}
v=dict(l.split() for l in pathlib.Path('/proc/vmstat').read_text().splitlines())
d=os.statvfs('/')
r={'at':now.isoformat(),'load':os.getloadavg(),'mem_available_kib':m['MemAvailable'],'swap_used_kib':m['SwapTotal']-m['SwapFree'],'pswpin':int(v['pswpin']),'pswpout':int(v['pswpout']),'memory_pressure':pathlib.Path('/proc/pressure/memory').read_text(),'cpu_stat':pathlib.Path('/proc/stat').read_text().splitlines()[0],'diskstats':pathlib.Path('/proc/diskstats').read_text(),'disk_available_bytes':d.f_bavail*d.f_frsize}
r.update(mem_total_kib=m['MemTotal'],disk_total_bytes=d.f_blocks*d.f_frsize,disk_used_bytes=(d.f_blocks-d.f_bfree)*d.f_frsize,disk_used_percent=100*(d.f_blocks-d.f_bfree)/max(1,d.f_blocks-d.f_bfree+d.f_bavail),inode_total=d.f_files,inode_used=d.f_files-d.f_ffree,uptime_seconds=float(pathlib.Path('/proc/uptime').read_text().split()[0]),cpu_count=os.cpu_count())
s=subprocess.run(['docker','stats','--no-stream','--format','{{json .}}'],capture_output=True,text=True,timeout=25)
r['containers']=[json.loads(l) for l in s.stdout.splitlines() if l]; r['docker_error']=s.returncode
r['process_rss']=subprocess.check_output(['ps','-eo','pid,comm,rss','--sort=-rss'],text=True).splitlines()[:16]
# Each daily file stays <= 4 MiB; at most eight daily files (<= 32 MiB).
p.mkdir(mode=0o700,parents=True,exist_ok=True)
target=p/(now.strftime('%Y-%m-%d')+'.jsonl')
line=(json.dumps(r)+'\n').encode()
if len(line)>65536: raise RuntimeError('Metric record exceeds 64 KiB')
if target.exists() and target.stat().st_size+len(line)>4*1024*1024:
    with target.open('rb') as f:
        f.seek(max(0,target.stat().st_size-2*1024*1024)); f.readline(); tail=f.read()
    tmp=target.with_suffix('.tmp');tmp.write_bytes(tail);tmp.replace(target)
with target.open('ab') as f:f.write(line)
files=sorted(p.glob('????-??-??.jsonl'))
for f in files:
    if f not in files[-8:] or time.time()-f.stat().st_mtime>8*86400:f.unlink()
