import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:5190';
const uid='qa-'+Date.now(), report=[];
async function request(body,user=uid,query='',extra={}){
 const headers={'Content-Type':'application/json',Connection:'close',...extra};
 if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test';}
 const r=await fetch(base+'/api/room'+query,{signal:AbortSignal.timeout(20000),method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json()};
}
async function check(name,fn){await fn();report.push({name,passed:true});console.log('PASS '+name);}
let sid,turn,expiry,other;
await check('Anonymous writes rejected',async()=>{assert.equal((await request({action:'rent',tutorId:'mia',plan:'week'},null)).status,401)});
await check('Anonymous catalog excludes answer keys',async()=>{const r=await request(null,null);assert.equal(r.data.lessons.length,7);assert.equal(r.data.lessons[0].quiz[0].answer,undefined);assert.equal(r.data.lessons[0].trainingTasks[0].answer,undefined)});
await check('Protected lesson without rental rejected',async()=>{assert.equal((await request({action:'start',tutorId:'mia',lessonId:'first-conversation'})).status,403)});
await check('Rental activation succeeds',async()=>{assert.equal((await request({action:'rent',tutorId:'mia',plan:'week'})).status,200);const r=await request();expiry=r.data.rentals[0].expires;assert.ok(expiry>Date.now()+6*86400000)});
await check('Concurrent rental retries do not duplicate or extend',async()=>{await Promise.all([request({action:'rent',tutorId:'mia',plan:'month'}),request({action:'rent',tutorId:'mia',plan:'week'})]);const r=await request();assert.equal(r.data.rentals.length,1);assert.equal(r.data.rentals[0].expires,expiry)});
await check('Profile saved',async()=>{await request({action:'profile',name:'QA learner',level:'A2'});assert.equal((await request()).data.profile.level,'A2')});
await check('Lesson start saved',async()=>{const r=await request({action:'start',tutorId:'mia',lessonId:'first-conversation'});assert.equal(r.status,200);sid=r.data.session.id;assert.equal(r.data.messages[0].source,'lesson')});
await check('Cross-account session read and writes rejected',async()=>{assert.equal((await request(null,uid+'-other','?session='+sid)).status,404);assert.equal((await request({action:'stage',sessionId:sid,stage:1},uid+'-other')).status,404)});
await check('Step persists',async()=>{await request({action:'stage',sessionId:sid,stage:2});assert.equal((await request(null,uid,'?session='+sid)).data.session.stage,2)});
await check('Chat issues context for real browser inference',async()=>{turn=crypto.randomUUID();const r=await request({action:'chat',sessionId:sid,message:'I am Alex. I like reading.',token:turn});assert.equal(r.status,200);assert.equal(r.data.mode,'browser');assert.equal(r.data.context.at(-1).content,'I am Alex. I like reading.');assert.ok(r.data.context[0].content.includes('English only'))});
await check('Parallel chat is blocked',async()=>{assert.equal((await request({action:'chat',sessionId:sid,message:'Hello again',token:crypto.randomUUID()})).status,409)});
await check('Browser reply storage works (test transport, not inference)',async()=>{assert.equal((await request({action:'saveReply',sessionId:sid,token:turn,reply:'Test transport reply. What do you enjoy reading?'})).status,200)});
await check('Repeated completed chat does not duplicate',async()=>{const r=await request({action:'chat',sessionId:sid,message:'I am Alex. I like reading.',token:turn});assert.equal(r.status,200);assert.equal(r.data.source,'saved');assert.equal((await request(null,uid,'?session='+sid)).data.messages.length,3)});
await check('Malformed quiz rejected',async()=>{assert.equal((await request({action:'finish',sessionId:sid,answers:[0]})).status,400)});
await check('Canonical quiz score, not client score',async()=>{const r=await request({action:'finish',sessionId:sid,answers:[0,1,1],score:3});assert.equal(r.status,200);assert.equal(r.data.correct,2);assert.equal(r.data.feedback.length,3)});
await check('Finished lesson cannot score twice',async()=>{assert.equal((await request({action:'finish',sessionId:sid,answers:[0,1,2]})).status,200);assert.equal((await request(null,uid,'?session='+sid)).data.session.score,2)});
await check('Future booking saved; outside rental rejected',async()=>{assert.equal((await request({action:'book',tutorId:'mia',lessonId:'at-the-cafe',starts:Date.now()+3600000})).status,200);assert.equal((await request({action:'book',tutorId:'mia',lessonId:'at-the-cafe',starts:expiry+1000})).status,400)});
await check('Cancelled rental blocks already open lesson',async()=>{const r=await request({action:'start',tutorId:'mia',lessonId:'at-the-cafe'});other=r.data.session.id;await request({action:'cancelRental',tutorId:'mia'});assert.equal((await request({action:'chat',sessionId:other,message:'Hi',token:crypto.randomUUID()})).status,403);assert.equal((await request()).data.bookings.length,0)});
await check('Cross-origin writes rejected',async()=>{assert.equal((await request({action:'rent',tutorId:'mia',plan:'day'},uid,'',{Origin:'https://other.test'})).status,403)});
await check('Finished history survives rental cancellation',async()=>{assert.equal((await request(null,uid,'?session='+sid)).data.session.score,2)});
writeFileSync('qa-api-report.json',JSON.stringify({testedAt:new Date().toISOString(),origin:base,tests:report,cloudInference:'not configured; not tested',browserInference:'verified separately in UI'},null,2));
console.log(report.length+' checks passed');


