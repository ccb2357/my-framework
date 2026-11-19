import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readPublicContent } from '../server/utils/public-content.mjs';
import { publicContentResource } from '../app/services/public-content.js';
const config={backendTarget:'http://127.0.0.1',backendHost:'website.example.test',websiteUrl:'https://website.example.test'};
const item={title:'Public title',body:'Public body',updatedAt:'2026-11-19T12:00:00Z'};
test('public resource whitelists data and rejects invalid envelopes, lengths and dates',()=>{
 assert.deepEqual(publicContentResource({data:null}),{data:null});
 assert.deepEqual(publicContentResource({data:{...item,password:'SECRET'},user:{id:1}}),{data:item});
 for(const input of [{},{data:{}},{data:{...item,title:''}},{data:{...item,title:'x'.repeat(161)}},{data:{...item,body:'x'.repeat(2001)}},{data:{...item,updatedAt:'2026-02-30T12:00:00Z'}},{data:{...item,updatedAt:'PRIVATE'}},{data:{...item,body:'a\0b'}}])assert.throws(()=>publicContentResource(input));
});
test('public bridge reads fresh data at a fixed destination and sends no cookies or credentials',async()=>{
 let calls=0;
 const server=http.createServer((req,res)=>{assert.equal(req.headers.host,config.backendHost);assert.equal(req.headers.cookie,undefined);assert.equal(req.headers.authorization,undefined);assert.equal(req.url,'/api/v1/website/content');assert.equal(req.method,'GET');calls++;res.setHeader('content-type','application/json');res.setHeader('set-cookie','PRIVATE=secret');res.end(JSON.stringify({data:{...item,title:'Version '+calls,private:'SECRET'}}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {const runtime={...config,backendTarget:'http://127.0.0.1:'+server.address().port};assert.equal((await readPublicContent(runtime)).body.data.title,'Version 1');assert.equal((await readPublicContent(runtime)).body.data.title,'Version 2');assert.equal(calls,2);}
 finally {await new Promise(resolve=>server.close(resolve));}
});
test('public bridge maps unavailable, HTML, redirect and invalid JSON to controlled failure',async()=>{
 const result=body=>new Response(body,{headers:{'content-type':'application/json'}});
 for(const fetcher of [async()=>{throw new Error('PRIVATE');},async()=>new Response('PRIVATE',{status:503}),async()=>new Response('<html>PRIVATE</html>'),async()=>new Response(null,{status:302}),async()=>result('invalid'),async()=>result('{}')])assert.deepEqual(await readPublicContent(config,fetcher),{status:503});
 assert.deepEqual(await readPublicContent(config,async()=>result('{"data":null}')),{status:200,body:{data:null}});
 assert.deepEqual(await readPublicContent(config,async()=>new Response(null,{status:429})),{status:429});
});
