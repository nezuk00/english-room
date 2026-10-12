import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5190',uid='trial-qa-'+Date.now();
async function req(body,who=uid,query=''){const r=await fetch(origin+'/api/room'+query,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(who?{'oai-authenticated-user-id':who,'oai-authenticated-user-email':who+'@example.test'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name);}
await req();
await test('Trial requires login',async()=>assert.equal((await req({action:'trial'},null)).status,401));
const {data:{session}}=await req({action:'trial'}),sessionId=session.id;
await test('One-click trial opens A2 cafe and free access',async()=>{assert.equal(session.lesson_id,'cafe-trial');assert.equal((await req()).data.rentals.length,1)});
await test('Retry reuses unfinished session without extending access',async()=>{const before=(await req()).data.rentals[0].expires;assert.equal((await req({action:'trial'})).data.session.id,sessionId);assert.equal((await req()).data.rentals[0].expires,before)});
const token=crypto.randomUUID();
const attempt={action:'exercise',sessionId,taskId:'listen',option:1,helped:false,token};
await test('Wrong attempt provides feedback and stays incomplete',async()=>{const r=await req(attempt);assert.equal(r.data.correct,false);assert.equal(r.data.training[0].complete,false);assert.match(r.data.explanation,/To stay/)});
await test('Transport retry does not double-count',async()=>{assert.equal((await req(attempt)).data.training[0].attempts,1)});
await test('A token cannot be reused for a different answer',async()=>{assert.equal((await req({...attempt,option:0})).status,409)});
await test('Retry with support is recorded separately from first success',async()=>{const r=await req({...attempt,option:0,helped:true,token:crypto.randomUUID()});assert.equal(r.data.training[0].complete,true);assert.equal(r.data.training[0].firstTry,false);assert.equal(r.data.training[0].attempts,2);assert.equal(r.data.training[0].helped,true)});
await test('Cross-account exercise rejected',async()=>assert.equal((await req(attempt,uid+'-other')).status,404));
await test('Invalid task and choice rejected',async()=>{assert.equal((await req({...attempt,taskId:'injected'})).status,400);assert.equal((await req({...attempt,option:10})).status,400)});
await test('Reload preserves progress without exposing hidden attempt JSON in chat',async()=>{const r=await req(null,uid,'?session='+sessionId);assert.equal(r.data.training[0].complete,true);assert.equal(r.data.messages.length,1)});
await test('Teacher receives saved progress without answer keys',async()=>{const r=await req({action:'teacher',sessionId});assert.equal(JSON.parse(r.data.dynamicVariables.history).training[0].attempts,2);assert.equal(JSON.parse(r.data.dynamicVariables.lesson_context).trainingTasks[0].answer,undefined)});
await req({action:'stage',sessionId,stage:3});
await req({action:'quizAnswer',sessionId,question:0,option:0});await req({action:'quizAnswer',sessionId,question:1,option:1});
await test('Trial completes using authoritative quiz score',async()=>{const r=await req({action:'quizAnswer',sessionId,question:2,option:2});assert.equal(r.data.result.correct,3);assert.ok(r.data.completed)});
await test('Completed trial refuses more exercise attempts',async()=>assert.equal((await req({...attempt,token:crypto.randomUUID()})).status,409));
await test('Completed trial can be repeated as a new session',async()=>assert.notEqual((await req({action:'trial'})).data.session.id,sessionId));
console.log(count+' trial checks passed');
