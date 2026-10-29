# Read-only SSH reader. Never invokes the collector or Docker.
import pathlib,json,datetime,collections,os
root=pathlib.Path('/var/log/vps-history')
files=sorted(root.glob('????-??-??.jsonl'))
rows=collections.deque(maxlen=289)
for f in files[-2:]:
    if f.stat().st_size>4*1024*1024+65536: raise RuntimeError('History file exceeds 4 MiB limit')
    with f.open() as stream:
        for line in stream:
            if len(line)>65536: continue
            try:
                r=json.loads(line);at=datetime.datetime.fromisoformat(r['at']).timestamp()*1000
                if at>datetime.datetime.now(datetime.timezone.utc).timestamp()*1000+60000: continue
                ticks=list(map(int,r['cpu_stat'].split()[1:9]));total=sum(ticks);idle=ticks[3]+ticks[4]
                mt=r.get('mem_total_kib');dt=r.get('disk_total_bytes');du=r.get('disk_used_bytes');it=r.get('inode_total');iu=r.get('inode_used')
                # Old records without totals are skipped rather than inferred from current hardware.
                if not all(v is not None for v in [mt,dt,du,it,iu,r.get('uptime_seconds')]):continue
                rows.append(dict(at=at,total=total,idle=idle,cpu=None,memory=100*(1-r['mem_available_kib']/mt),memoryUsed=(mt-r['mem_available_kib'])*1024,memoryTotal=mt*1024,disk=r['disk_used_percent'],diskUsed=du,diskTotal=dt,diskAvailable=r['disk_available_bytes'],inode=100*iu/it,inodeUsed=iu,inodeTotal=it,uptime=r['uptime_seconds'],load=' '.join(str(round(x,2)) for x in r['load']),cores=r['cpu_count']))
            except (ValueError,KeyError,TypeError,IndexError,ZeroDivisionError):continue
result=list(rows)
for prev,r in zip(result,result[1:]):
    delta=r['total']-prev['total']
    if delta>0 and r['uptime']>=prev['uptime']:r['cpu']=max(0,min(100,100*(1-(r['idle']-prev['idle'])/delta)))
if not result:raise RuntimeError('No compatible history records yet; wait for the collector timer')
print(json.dumps({'samples':result[-288:],'bytes':sum(f.stat().st_size for f in files),'files':len(files),'limitBytes':32*1024*1024},separators=(',',':')))
