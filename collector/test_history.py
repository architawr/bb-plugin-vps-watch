import unittest,tempfile,pathlib,subprocess,json,datetime
BASE=pathlib.Path(__file__).parent
class History(unittest.TestCase):
 def test_import_delta_and_missing_legacy_fields(self):
  with tempfile.TemporaryDirectory() as d:
   now=datetime.datetime.now(datetime.timezone.utc)
   row=dict(at=now.isoformat(),cpu_stat='cpu 100 0 100 800 0 0 0 0',mem_total_kib=1000,mem_available_kib=400,disk_total_bytes=1000,disk_used_bytes=500,disk_used_percent=50,disk_available_bytes=450,inode_total=1000,inode_used=100,uptime_seconds=1000,cpu_count=4,load=[1,2,3])
   second=dict(row,cpu_stat='cpu 130 0 120 850 0 0 0 0',uptime_seconds=1005,at=(now+datetime.timedelta(seconds=1)).isoformat())
   f=pathlib.Path(d)/(now.strftime('%Y-%m-%d')+'.jsonl');f.write_text('{}\n'+json.dumps(row)+'\n'+json.dumps(second)+'\n{partial')
   script=(BASE/'read-history.py').read_text().replace("pathlib.Path('/var/log/vps-history')",repr(d));script=script.replace('root='+repr(d),'root=pathlib.Path('+repr(d)+')')
   result=json.loads(subprocess.check_output(['python3','-c',script]))
   self.assertEqual(len(result['samples']),2);self.assertIsNone(result['samples'][0]['cpu']);self.assertEqual(result['samples'][1]['cpu'],50);self.assertEqual(result['samples'][0]['memoryUsed'],600*1024)
 def test_rotation_bounds(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)
   for n in range(1,10):(p/f'2026-10-{n:02}.jsonl').write_text('{}\n')
   now=datetime.datetime(2026,10,10,tzinfo=datetime.timezone.utc)
   target=p/'2026-10-10.jsonl';target.write_bytes(b'{}\n'*(4*1024*1024//3+1))
   code=(BASE/'vps-metrics.py').read_text().split('# Each daily file')[1]
   exec('import json,time\n# Each daily file'+code,{'p':p,'now':now,'r':{'ok':True}})
   files=list(p.glob('*.jsonl'));self.assertLessEqual(len(files),8);self.assertLessEqual(sum(f.stat().st_size for f in files),32*1024*1024);self.assertLessEqual(target.stat().st_size,4*1024*1024)
if __name__=='__main__':unittest.main()
