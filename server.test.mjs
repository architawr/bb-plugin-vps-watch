import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFakePluginHost} from '@get-bb/plugin-sdk/testing';
import plugin from './dist/server.js';
test('RPC defaults, validation, configuration, CLI and cleanup',async()=>{
 const {bb,harness}=createFakePluginHost({pluginId:'vps-watch'});
 try {
 await plugin(bb);
 const a=await harness.behavior.callRpc('status',null);
 assert.equal(a.config.enabled,false);assert.equal(a.config.host,'');assert.deepEqual(a.samples,[]);
 await assert.rejects(()=>harness.behavior.callRpc('configure',{host:'-evil',enabled:true,minutes:5}));
 await assert.rejects(()=>harness.behavior.callRpc('configure',{host:'personal',enabled:true,minutes:1}));
 await harness.behavior.callRpc('configure',{host:'personal',enabled:false,minutes:15});
 const b=await harness.behavior.callRpc('refresh',null);
 assert.equal(b.config.host,'personal');assert.equal(b.attempt,null);
 const cli=await harness.behavior.runCli(['status']);assert.equal(cli.exitCode,0);assert.equal(JSON.parse(cli.stdout).config.minutes,15);
 } finally {await harness.lifecycle.dispose();}
});
