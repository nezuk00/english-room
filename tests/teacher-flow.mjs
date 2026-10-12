import assert from 'node:assert/strict';
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:5190',uid='teacher-qa-'+Date.now();
const headers={'Content-Type':'application/json','oai-authenticated-user-id':uid,'oai-authenticated-user-email':uid+'@example.test'};
async function req(body,extra={}){const r=await fetch(base+'/api/room',{method:body?'POST':'GET',headers:{...headers,...extra},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});return{status:r.status,data:await r.json()}}
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS '+name)}
await req();await req({action:'rent',tutorId:'mia',plan:'day'});
const {data:{session}}=await req({action:'start',tutorId:'mia',lessonId:'first-conversation'}),sessionId=session.id;
await test('Three modules returned in course order',async()=>{const r=await req();assert.deepEqual(r.data.modules.map(m=>m.level),['A1','A2','B1'])});
await test('Teacher receives history, style and public quiz without answers',async()=>{const r=await req({action:'teacher',sessionId});assert.equal(r.status,200);assert.match(r.data.agentId,/^agent_/);const l=JSON.parse(r.data.dynamicVariables.lesson_context);assert.equal(l.quiz[0].answer,undefined);assert.match(r.data.dynamicVariables.teacher_style,/patient/)});
await test('Teacher access denied to another account',async()=>{assert.equal((await req({action:'teacher',sessionId},{'oai-authenticated-user-id':uid+'other'})).status,404)});
await test('Quiz cannot run before practice stage',async()=>{assert.equal((await req({action:'quizAnswer',sessionId,question:0,option:0})).status,409)});
await req({action:'stage',sessionId,stage:3});
await test('Quiz rejects skipped and invalid questions',async()=>{assert.equal((await req({action:'quizAnswer',sessionId,question:1,option:0})).status,409);assert.equal((await req({action:'quizAnswer',sessionId,question:0,option:99})).status,400)});
await test('Saved quiz choice is immutable on retry',async()=>{await req({action:'quizAnswer',sessionId,question:0,option:0});const r=await req({action:'quizAnswer',sessionId,question:0,option:1});assert.equal(JSON.parse(r.data.session.answers)[0],0)});
await test('Three answers auto-complete with canonical score',async()=>{await req({action:'quizAnswer',sessionId,question:1,option:1});const r=await req({action:'quizAnswer',sessionId,question:2,option:2});assert.equal(r.data.completed,true);assert.equal(r.data.result.correct,3)});
await test('Final answer retry returns the same result shape',async()=>{const r=await req({action:'quizAnswer',sessionId,question:2,option:1});assert.equal(r.data.result.correct,3);assert.equal(r.data.completed,true)});
const firstTime=session.started+1,token1=crypto.randomUUID(),token2=crypto.randomUUID();
await req({action:'voiceMessage',sessionId,token:token2,message:'Second synthetic transport message',role:'assistant',created:firstTime+100});
await req({action:'cancelRental',tutorId:'mia'});
await test('Expired or cancelled rental blocks new provider sessions',async()=>{assert.notEqual((await req({action:'teacher',sessionId})).status,200)});
await test('Delayed transcript persists after rental cancellation',async()=>{assert.equal((await req({action:'voiceMessage',sessionId,token:token1,message:'First synthetic transport message',role:'user',created:firstTime})).status,200)});
await test('Transcript corrections replace text without duplicate or order changes',async()=>{
 await req({action:'voiceMessage',sessionId,token:token2,message:'Corrected synthetic transport message',role:'assistant',created:Date.now()});
 const r=await fetch(base+'/api/room?session='+sessionId,{headers});const data=await r.json(),m=data.messages.filter(m=>m.source==='elevenlabs');
 assert.equal(m.length,2);assert.equal(m[0].role,'user');assert.equal(m[1].content,'Corrected synthetic transport message');assert.equal(m[1].created,firstTime+100);
});
console.log(count+' teacher checks passed');

