import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { tutors, lessons, plans, publicLessons, tutorInstructions } from '../../../lib/curriculum';
import { learningModules } from '../../../lib/teaching';
import {trialTasks, trialProgress} from '../../../lib/trial';
export const dynamic = 'force-dynamic';
const bindings = () => env as unknown as { DB: D1Database; OPENAI_API_KEY?: string; OPENAI_MODEL?: string; ELEVENLABS_AGENT_ID?: string };
const json = (data: unknown, status = 200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
class Problem extends Error { constructor(message:string,public status=400){super(message)} }
const fail = (m:string,s=400):never => {throw new Problem(m,s)};
const str = (x:unknown,max=1200) => typeof x==='string' && x.trim().length>0 && x.length<=max ? x.trim() : fail('Проверьте заполненные поля.');
async function identity(){ const u=await getChatGPTUser(); if(!u) fail('Войдите, чтобы продолжить.',401); return u!; }
async function active(db:D1Database,uid:string,tutor:string){ const r=await db.prepare('SELECT * FROM rentals WHERE user_id=? AND tutor_id=? AND cancelled=0 AND expires>?').bind(uid,tutor,Date.now()).first(); if(!r) fail('Аренда закончилась. Выберите срок доступа в разделе преподавателей.',403); return r; }
async function session(db:D1Database,uid:string,id:string,write=false){ const s=await db.prepare('SELECT * FROM sessions WHERE id=? AND user_id=?').bind(id,uid).first<any>(); if(!s) fail('Занятие не найдено.',404); if(write){if(s.completed)fail('Это занятие уже завершено.',409);await active(db,uid,s.tutor_id);}return s; }
async function conversation(db:D1Database,id:string){return (await db.prepare("SELECT role,content,source,id,created FROM messages WHERE session_id=? AND source!='exercise' ORDER BY created,id").bind(id).all()).results;}
async function exercises(db:D1Database,id:string){return trialProgress((await db.prepare("SELECT content FROM messages WHERE session_id=? AND source='exercise' ORDER BY created,id").bind(id).all<{content:string}>()).results);}
function quizResult(s:any){const l=lessons.find(l=>l.id===s.lesson_id)!;const a=JSON.parse(s.answers||'[]');return {ok:true,correct:s.score,total:l.quiz.length,feedback:l.quiz.map((q,i)=>({question:q.question,correct:a[i]===q.answer,answer:q.options[q.answer],explanation:q.explanation}))};}
export async function GET(req:Request){
 try{
  const user=await getChatGPTUser(); const catalog={tutors,lessons:publicLessons(),plans,modules:learningModules,cloud:!!bindings().OPENAI_API_KEY,voiceTeacher:true};
  if(!user)return json({user:null,...catalog});
  const db=bindings().DB; if(!db)fail('Хранилище временно недоступно.',503);
  await db.prepare('INSERT OR IGNORE INTO profiles(id,name,level) VALUES(?,?,?)').bind(user.userId,user.fullName||'Студент','A1').run();
  const sid=new URL(req.url).searchParams.get('session');
  if(sid){const s=await session(db,user.userId,sid);return json({session:s,messages:await conversation(db,sid),training:await exercises(db,sid),result:s.completed?quizResult(s):null});}
  const [profile,rentals,sessions,bookings]=await Promise.all([
   db.prepare('SELECT * FROM profiles WHERE id=?').bind(user.userId).first(),
   db.prepare('SELECT * FROM rentals WHERE user_id=?').bind(user.userId).all(),
   db.prepare('SELECT * FROM sessions WHERE user_id=? ORDER BY started DESC LIMIT 100').bind(user.userId).all(),
   db.prepare('SELECT * FROM bookings WHERE user_id=? AND starts>? ORDER BY starts LIMIT 20').bind(user.userId,Date.now()-86400000).all()
  ]);
  return json({user:{name:user.fullName,email:user.email},profile,rentals:rentals.results,sessions:sessions.results,bookings:bookings.results,serverTime:Date.now(),...catalog});
 }catch(e){return handle(e);}
}
function handle(e:unknown){if(e instanceof Problem)return json({error:e.message},e.status); console.error('English Room operation failed',e instanceof Error?e.message:'Unknown');return json({error:'Не удалось сохранить или загрузить данные. Попробуйте ещё раз.'},503);}
export async function POST(req:Request){
 try{
  const raw=await req.text(); if(raw.length>18000)fail('Слишком длинный запрос.',413);
  if(req.headers.get('origin') && req.headers.get('origin')!==new URL(req.url).origin)fail('Недопустимый источник запроса.',403);
  if(!req.headers.get('content-type')?.includes('application/json'))fail('Ожидается JSON.',415);
  let body:any;try{body=JSON.parse(raw)}catch{fail('Некорректный запрос.')}
  const u=await identity(), uid=u.userId,db=bindings().DB, now=Date.now();
  if(!db)fail('Хранилище временно недоступно.',503);
  const action=str(body.action,30);
  if(action==='profile'){
   const name=str(body.name,60),level=str(body.level,2);if(!['A1','A2','B1'].includes(level))fail('Выберите уровень.');
   await db.prepare('INSERT INTO profiles(id,name,level) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,level=excluded.level').bind(uid,name,level).run();return json({ok:true});
  }
  if(action==='rent'){
   const tutor=tutors.find(t=>t.id===body.tutorId),plan=plans.find(p=>p.id===body.plan);
   if(!tutor||!plan)fail('Выберите преподавателя и срок.');
   await db.prepare('INSERT INTO rentals(id,user_id,tutor_id,plan,starts,expires,cancelled) VALUES(?,?,?,?,?,?,0) ON CONFLICT(user_id,tutor_id) DO UPDATE SET plan=excluded.plan,starts=excluded.starts,expires=excluded.expires,cancelled=0 WHERE rentals.expires<=? OR rentals.cancelled=1').bind(crypto.randomUUID(),uid,tutor!.id,plan!.id,now,now+plan!.days*86400000,now).run();
   return json({ok:true});
  }
  if(action==='cancelRental'){
   const tid=str(body.tutorId,30);await db.batch([db.prepare('UPDATE rentals SET cancelled=1 WHERE user_id=? AND tutor_id=?').bind(uid,tid),db.prepare('DELETE FROM bookings WHERE user_id=? AND tutor_id=?').bind(uid,tid)]);return json({ok:true});
  }
  if(action==='book'){
   const tutor=tutors.find(t=>t.id===body.tutorId), lesson=lessons.find(l=>l.id===body.lessonId);
   if(!tutor||!lesson)fail('Выберите тему и преподавателя.');
   const r:any=await active(db,uid,tutor!.id), when=Number(body.starts);
   if(!Number.isFinite(when)||when<now+60000||when>now+30*86400000||when>=r.expires)fail('Выберите будущее время в пределах срока аренды.');
   const count=await db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE user_id=? AND starts>?').bind(uid,now).first<any>();if(count.n>=20)fail('Можно запланировать до 20 занятий.');
   await db.prepare('INSERT INTO bookings(id,user_id,tutor_id,lesson_id,starts) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),uid,tutor!.id,lesson!.id,when).run();return json({ok:true});
  }
  if(action==='cancelBooking'){await db.prepare('DELETE FROM bookings WHERE id=? AND user_id=?').bind(str(body.id,80),uid).run();return json({ok:true});}
  if(action==='trial'){
   // A free trial opens Mia directly, preserving any longer active access.
   body.tutorId='mia'; body.lessonId='cafe-trial';
   await db.prepare('INSERT INTO rentals(id,user_id,tutor_id,plan,starts,expires,cancelled) VALUES(?,?,?,?,?,?,0) ON CONFLICT(user_id,tutor_id) DO UPDATE SET plan=excluded.plan,starts=excluded.starts,expires=excluded.expires,cancelled=0 WHERE rentals.expires<=? OR rentals.cancelled=1').bind(crypto.randomUUID(),uid,'mia','day',now,now+86400000,now).run();
  }
  if(action==='start'||action==='trial'){
   const tutor=tutors.find(t=>t.id===body.tutorId),lesson=lessons.find(l=>l.id===body.lessonId);if(!tutor||!lesson)fail('Выберите тему и преподавателя.');
   await active(db,uid,tutor!.id);
   let s=await db.prepare('SELECT * FROM sessions WHERE user_id=? AND tutor_id=? AND lesson_id=? AND completed IS NULL ORDER BY started DESC LIMIT 1').bind(uid,tutor!.id,lesson!.id).first<any>();
   if(!s){
    const id=crypto.randomUUID();
    await db.batch([db.prepare('INSERT INTO sessions(id,user_id,tutor_id,lesson_id,stage,started) VALUES(?,?,?,?,0,?)').bind(id,uid,tutor!.id,lesson!.id,now),db.prepare('INSERT INTO messages(id,session_id,role,content,source,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,'assistant',lesson!.warmup,'lesson',now)]);
    s=await session(db,uid,id);
   }
   return json({session:s,messages:await conversation(db,s.id),training:await exercises(db,s.id)});
  }
  const sid=str(body.sessionId,80),s=await session(db,uid,sid),lesson=lessons.find(l=>l.id===s.lesson_id)!;
  if(action==='exercise'){
   await active(db,uid,s.tutor_id);
   if(s.completed)fail('Занятие завершено. Начните новую попытку.',409);
   if(lesson.id!=='cafe-trial')fail('Задание не найдено.',404);
   const task=trialTasks.find(t=>t.id===body.taskId),option=body.option,token=str(body.token,80);
   if(!task||!Number.isInteger(option)||option<0||option>=task.options.length||!/^[a-zA-Z0-9-]{8,80}$/.test(token))fail('Проверьте ответ.');
   const id=sid+':exercise:'+token,prior=await db.prepare('SELECT content FROM messages WHERE id=? AND session_id=?').bind(id,sid).first<{content:string}>();
   const count=await db.prepare("SELECT COUNT(*) AS n FROM messages WHERE session_id=? AND source='exercise'").bind(sid).first<{n:number}>();
   if(!prior&&count!.n>=30)fail('Сохранено 30 попыток. Продолжите разговор с преподавателем.',429);
   const attempt=prior?JSON.parse(prior.content):{taskId:task!.id,option,correct:option===task!.answer,helped:body.helped===true};
   if(prior&&(attempt.taskId!==body.taskId||attempt.option!==option))fail('Повторите отправку с новым номером попытки.',409);
   await db.prepare('INSERT OR IGNORE INTO messages(id,session_id,role,content,source,created) VALUES(?,?,?,?,?,?)').bind(id,sid,'user',JSON.stringify(attempt),'exercise',now).run();
   return json({ok:true,correct:attempt.correct,explanation:task!.explanation,training:await exercises(db,sid)});
  }
  if(action==='voiceMessage'){
   // Saving captured history consumes no provider credits; allow delayed retries after expiry.
   const token=str(body.token,160),content=str(body.message,5000),role=body.role;
   if(!/^[a-zA-Z0-9:-]{8,160}$/.test(token)||!['user','assistant'].includes(role))fail('Некорректное сообщение.');
   const count=await db.prepare('SELECT COUNT(*) AS n FROM messages WHERE session_id=?').bind(sid).first<any>();
   if(count.n>=200)fail('Достигнут лимит сообщений в уроке.',429);
   const created=Number.isSafeInteger(body.created)?Math.min(now,Math.max(s.started,body.created)):now;
   await db.prepare('INSERT INTO messages(id,session_id,role,content,source,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content WHERE messages.session_id=excluded.session_id AND messages.role=excluded.role').bind(sid+':voice:'+token,sid,role,content,'elevenlabs',created).run();
   return json({ok:true});
  }
  if(action==='quizAnswer'){
   await active(db,uid,s.tutor_id);
   if(s.completed)return json({ok:true,result:quizResult(s),completed:true,session:s,nextQuestion:-1});
   if(s.stage!==3)fail('Сначала пройдите разговорную практику.',409);
   const qi=body.question,oi=body.option;
   if(!Number.isInteger(qi)||qi<0||qi>=lesson.quiz.length||!Number.isInteger(oi)||oi<0||oi>=lesson.quiz[qi].options.length)fail('Выберите существующий ответ.');
   const a=JSON.parse(s.answers||'[]');
   const next=lesson.quiz.findIndex((_,i)=>!Number.isInteger(a[i]));
   if(qi>next)fail('Ответьте на текущий вопрос.',409);
   if(!Number.isInteger(a[qi])){
    a[qi]=oi;
    const completed=lesson.quiz.every((_,i)=>Number.isInteger(a[i]));
    const score=completed?a.filter((v:number,i:number)=>v===lesson.quiz[i].answer).length:null;
    const saved=await db.prepare('UPDATE sessions SET answers=?,completed=?,score=? WHERE id=? AND user_id=? AND completed IS NULL AND answers IS ?').bind(JSON.stringify(a),completed?now:null,score,sid,uid,s.answers??null).run();
    if(!saved.meta.changes)fail('Ответ уже изменился. Повторите запрос.',409);
   }
   const current=await session(db,uid,sid),savedAnswers=JSON.parse(current.answers||'[]'),q=lesson.quiz[qi];
   return json({ok:true,completed:!!current.completed,session:current,question:qi,correct:savedAnswers[qi]===q.answer,answer:q.options[q.answer],explanation:q.explanation,nextQuestion:lesson.quiz.findIndex((_,i)=>!Number.isInteger(savedAnswers[i])),result:current.completed?quizResult(current):null});
  }
  if(action==='finish'&&s.completed)return json(quizResult(s));
  if(s.completed)fail('Это занятие уже завершено.',409);
  await active(db,uid,s.tutor_id);
  if(action==='teacher'){
   const profile=await db.prepare('SELECT name FROM profiles WHERE id=?').bind(uid).first<any>();
   const history=(await conversation(db,sid)).slice(-24).map((m:any)=>({role:m.role,content:m.content}));
   const mentor=tutors.find(t=>t.id===s.tutor_id)!;
   const publicLesson=publicLessons().find(l=>l.id===lesson.id);
   const agentId=bindings().ELEVENLABS_AGENT_ID;
   if(!agentId) fail('Для диалога настройте собственного агента ElevenLabs: ELEVENLABS_AGENT_ID.',503);
   return json({agentId,expires:(await active(db,uid,s.tutor_id) as any).expires,dynamicVariables:{teacher_name:mentor.name,teacher_style:mentor.instructions,student_name:profile?.name||'Learner',lesson_context:JSON.stringify(publicLesson),stage:String(s.stage),history:JSON.stringify({messages:history,quizAnswers:JSON.parse(s.answers||'[]'),training:await exercises(db,sid)}),opening:history.length<=1?`Hi! I'm ${mentor.name}, your AI English teacher. ${lesson.warmup}`:`Welcome back! I'm ${mentor.name}, your AI English teacher. Let's pick up where we left off.`}});
  }
  if(action==='stage'){
   const stage=Number(body.stage);if(!Number.isInteger(stage)||stage<0||stage>3)fail('Некорректный этап.');
   await db.prepare('UPDATE sessions SET stage=? WHERE id=? AND user_id=?').bind(stage,sid,uid).run();return json({ok:true});
  }
  if(action==='finish'){
   const a=body.answers;if(!Array.isArray(a)||a.length!==lesson.quiz.length||a.some((v:any,i:number)=>!Number.isInteger(v)||v<0||v>=lesson.quiz[i].options.length))fail('Ответьте на все вопросы.');
   const correct=a.filter((v:number,i:number)=>v===lesson.quiz[i].answer).length;
   const result=await db.prepare('UPDATE sessions SET completed=?,score=?,answers=?,stage=3 WHERE id=? AND user_id=? AND completed IS NULL').bind(now,correct,JSON.stringify(a),sid,uid).run();
   return json(quizResult(await session(db,uid,sid)));
  }
  if(action==='saveReply'){
   const token=str(body.token,80),reply=str(body.reply,5000);
   if(s.pending!==token)fail('Этот ответ больше не ожидается. Обновите занятие.',409);
   await db.batch([db.prepare('INSERT OR IGNORE INTO messages(id,session_id,role,content,source,created) VALUES(?,?,?,?,?,?)').bind(sid+':'+token+':a',sid,'assistant',reply,'browser',now),db.prepare('UPDATE sessions SET pending=NULL,pending_at=NULL WHERE id=? AND pending=?').bind(sid,token)]);
   return json({ok:true});
  }
  if(action==='chat'){
   const content=str(body.message,1200),token=str(body.token,80);if(!/^[a-zA-Z0-9-]{8,80}$/.test(token))fail('Некорректный запрос.');
   const mid=sid+':'+token,done=await db.prepare('SELECT content FROM messages WHERE id=? AND session_id=?').bind(mid+':a',sid).first<any>();if(done)return json({reply:done.content,source:'saved'});
   const existing=await db.prepare('SELECT content FROM messages WHERE id=? AND session_id=?').bind(mid+':u',sid).first<any>();if(existing&&existing.content!==content)fail('Не удалось повторить изменённое сообщение.',409);
   const count=await db.prepare('SELECT COUNT(*) AS n FROM messages WHERE session_id=? AND role=?').bind(sid,'user').first<any>();if(count.n>=50&&!existing)fail('В этом занятии достигнут лимит 50 сообщений. Завершите урок и начните новый.');
   const claim=bindings().OPENAI_API_KEY
    ? await db.prepare('UPDATE sessions SET pending=?,pending_at=? WHERE id=? AND (pending IS NULL OR pending_at<?)').bind(token,now,sid,now-180000).run()
    : await db.prepare('UPDATE sessions SET pending=?,pending_at=? WHERE id=? AND (pending IS NULL OR pending_at<? OR pending=?)').bind(token,now,sid,now-180000,token).run();
   if(!claim.meta.changes)fail('Предыдущий ответ ещё готовится. Повторите попытку через несколько минут.',409);
   await db.prepare('INSERT OR IGNORE INTO messages(id,session_id,role,content,source,created) VALUES(?,?,?,?,?,?)').bind(mid+':u',sid,'user',content,'user',now).run();
   const fullHistory=(await conversation(db,sid)).slice(-12).map((m:any)=>({role:m.role,content:m.content}));
   const history: {role:string,content:string}[]=[]; let budget=6000;
   for(let i=fullHistory.length-1;i>=0;i--){const m=fullHistory[i];if(m.content.length>budget&&history.length)break;history.unshift(m);budget-=m.content.length;}
   const context=[{role:'system',content:tutorInstructions(s.tutor_id,s.lesson_id,s.stage)},...history];
   const config=bindings();
   if(!config.OPENAI_API_KEY)return json({mode:'browser',token,context});
   try{
    const recent=await db.prepare('SELECT COUNT(*) AS n FROM messages m JOIN sessions s ON s.id=m.session_id WHERE s.user_id=? AND m.role=? AND m.created>?').bind(uid,'user',now-3600000).first<any>();
    if(recent.n>60)fail('Лимит облачного ИИ — 60 сообщений в час. Продолжите позже.',429);
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+config.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:config.OPENAI_MODEL||'gpt-4.1-mini',instructions:context[0].content,input:history,max_output_tokens:300,store:false}),signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw new Error('AI provider unavailable: '+response.status);
    const data:any=await response.json();const reply=(data.output||[]).flatMap((o:any)=>o.content||[]).filter((o:any)=>o.type==='output_text').map((o:any)=>o.text).join('\n');if(!reply)throw new Error('Empty AI response');
    await active(db,uid,s.tutor_id);
    await db.batch([db.prepare('INSERT OR IGNORE INTO messages(id,session_id,role,content,source,created) VALUES(?,?,?,?,?,?)').bind(mid+':a',sid,'assistant',reply,'cloud',Date.now()),db.prepare('UPDATE sessions SET pending=NULL,pending_at=NULL WHERE id=? AND pending=?').bind(sid,token)]);
    return json({reply,source:'cloud'});
   }catch(e){await db.prepare('UPDATE sessions SET pending=NULL,pending_at=NULL WHERE id=? AND pending=?').bind(sid,token).run();if(e instanceof Problem)throw e;fail('ИИ временно не ответил. Ваше сообщение сохранено; повторите отправку.',502);}
  }
  if(action==='abortReply'){await db.prepare('UPDATE sessions SET pending=NULL,pending_at=NULL WHERE id=? AND pending=?').bind(sid,str(body.token,80)).run();return json({ok:true});}
  fail('Действие не найдено.');
 }catch(e){return handle(e);}
}
