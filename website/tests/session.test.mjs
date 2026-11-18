import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readClientSession } from '../server/utils/client-session.mjs';
const config={ backendTarget:'http://127.0.0.1',backendHost:'website.example.test',websiteUrl:'https://website.example.test',clientSessionCookie:'project_session_client'};
test('SSR forwards only the client cookie to the fixed host and sanitizes the resource', async()=>{
 const server=http.createServer((req,res)=>{assert.equal(req.headers.host,config.backendHost);assert.equal(req.headers.cookie,'project_session_client=signed');assert.equal(req.headers.authorization,undefined);assert.equal(req.url,'/api/v1/auth/me');res.setHeader('content-type','application/json');res.end(JSON.stringify({user:{id:1,name:'Client',email:'client@example.test',password:'PRIVATE'}}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {const result=await readClientSession({...config,backendTarget:'http://127.0.0.1:'+server.address().port},'project_session_admin=SECRET; project_session_client=signed; unrelated=OTHER');assert.deepEqual(result,{status:200,body:{user:{id:1,name:'Client',email:'client@example.test'}}});}
 finally {await new Promise(resolve=>server.close(resolve));}
});
test('SSR rejects ambiguous cookies and handles expired sessions or unavailable transport without private output',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw new Error('PRIVATE');};
 assert.equal((await readClientSession(config,'',fetcher)).status,401);
 assert.equal((await readClientSession(config,'project_session_client=a; project_session_client=b',fetcher)).status,401);assert.equal(calls,0);
 assert.deepEqual(await readClientSession(config,'project_session_client=a',fetcher),{status:503});
 assert.deepEqual(await readClientSession(config,'project_session_client=a',async()=>new Response(null,{status:401})),{status:401});
 assert.deepEqual(await readClientSession(config,'project_session_client=a',async()=>new Response('<html>PRIVATE</html>',{headers:{'content-type':'text/html'}})),{status:503});
});
