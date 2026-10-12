'use client';
import {useEffect,useRef,useState} from 'react';
import type {Conversation as ConversationType} from '@elevenlabs/client';
import {Mic,MicOff,MessageCircle,Send,Pause,LoaderCircle,CheckCircle2,Volume2,BookOpen,ArrowLeft} from 'lucide-react';
import {toast} from 'sonner';
import TrialPractice from './trial-practice';
type Row=Record<string,any>;
const stages=['Знакомимся с темой','Разбираем фразы','Практикуем','Закрепляем'];
const stageCopy=['Ответьте на вопрос преподавателя. Он подберёт темп по вашим ответам.','Разберите примеры и попробуйте составить свои предложения.','Поговорите в ситуации из жизни. Преподаватель поддержит диалог.','Ответьте на три вопроса голосом, текстом или выберите варианты ниже.'];
async function request(body?:Row,query=''){
 const r=await fetch('/api/room'+query,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const data=await r.json() as Row;
 if(!r.ok)throw new Error(data.error||'Не удалось связаться с преподавателем.');return data;
}

export default function LessonRoom({initial,lesson,tutor,initialMessages,initialResult,initialTraining=[],onClose,onComplete}:{initial:Row,lesson:Row,tutor:Row,initialMessages:Row[],initialResult:Row|null,initialTraining?:Row[],onClose:()=>void,onComplete:()=>void}){
 const [training,setTraining]=useState<Row[]>(initialTraining);
 const [session,setSession]=useState(initial),[messages,setMessages]=useState(initialMessages),[result,setResult]=useState(initialResult);
 const [status,setStatus]=useState('disconnected'),[mode,setMode]=useState('listening'),[textOnly,setTextOnly]=useState(false),[muted,setMuted]=useState(false),[draft,setDraft]=useState('');
 const [error,setError]=useState(''),[savingError,setSavingError]=useState(''),[busy,setBusy]=useState(false),[stageReason,setStageReason]=useState(''),[volume,setVolume]=useState(.85);
 const [answers,setAnswers]=useState<Record<number,number>>(()=>JSON.parse(initial.answers||'{}'));
 const connection=useRef<ConversationType|null>(null),mounted=useRef(true),generation=useRef(0),starting=useRef(false),sessionRef=useRef(initial),bottom=useRef<HTMLDivElement>(null),saveQueue=useRef(Promise.resolve()),pendingSaves=useRef(new Map<string,Row>()),callId=useRef(''),expiry=useRef(0),eventTime=useRef(0),messageTimes=useRef(new Map<string,number>());
 const outboxKey='english-room:outbox:'+initial.id;
 const persistOutbox=()=>{try{localStorage.setItem(outboxKey,JSON.stringify([...pendingSaves.current.values()]));return true}catch{return false}};
 const connected=status==='connected';
 const setCurrent=(next:Row)=>{sessionRef.current=next;setSession(next)};
 const syncQuizStage=async()=>{
  if(sessionRef.current.stage===3||sessionRef.current.completed)return;
  await request({action:'stage',sessionId:initial.id,stage:3});
  setCurrent({...sessionRef.current,stage:3});
 };
 const save=(body:Row)=>{
  pendingSaves.current.set(body.token,body);
  persistOutbox();
  saveQueue.current=saveQueue.current.then(async()=>{
   try{await request(body);if(pendingSaves.current.get(body.token)===body)pendingSaves.current.delete(body.token);persistOutbox();if(mounted.current&&!pendingSaves.current.size)setSavingError('')}
   catch{if(mounted.current)setSavingError('Часть разговора ещё не сохранена. Нажмите «Повторить сохранение».')}
  });
 };
 const append=(role:string,content:string,token:string)=>{
  if(!mounted.current||!content.trim())return;
  const clean=content.replace(/\[(?:laughs|sighs|chuckles|whispers|excited|sad|curious|thoughtful|warm|friendly|calm|happy|pause|short pause|long pause)\]/gi,'').trim();
  const row={id:token,role,content:clean,source:'elevenlabs'};
  setMessages(ms=>ms.some(m=>m.id===token)?ms.map(m=>m.id===token?row:m):[...ms,row]);
  const created=messageTimes.current.get(token)||Math.max(Date.now(),eventTime.current+1);eventTime.current=created;messageTimes.current.set(token,created);
  save({action:'voiceMessage',sessionId:initial.id,token,message:clean,role,created});
 };
 const stop=async()=>{
  if(!connection.current)generation.current++;
  starting.current=false;
  const c=connection.current;connection.current=null;
  if(c)await c.endSession().catch(()=>{});
  generation.current++;
  if(mounted.current){setStatus('disconnected');setMode('listening');setMuted(false)}
 };
 useEffect(()=>{
  mounted.current=true;
  try{const pending=JSON.parse(localStorage.getItem(outboxKey)||'[]');for(const body of pending){if(body.sessionId!==initial.id)continue;save(body);setMessages(ms=>ms.some(m=>m.id===body.token||m.id?.endsWith(':voice:'+body.token))?ms:[...ms,{id:body.token,role:body.role,content:body.message,source:'elevenlabs'}])}}catch{}
  const timer=setInterval(()=>{if(connection.current&&expiry.current&&Date.now()>=expiry.current){void stop();setError('Аренда закончилась. Разговор сохранён; активируйте доступ снова.')}},5000);
  return()=>{mounted.current=false;generation.current++;clearInterval(timer);void connection.current?.endSession().catch(()=>{});connection.current=null};
 },[]);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[messages]);
 const start=async(onlyText=false)=>{
  if(starting.current||connection.current||sessionRef.current.completed)return connection.current;
  starting.current=true;const epoch=++generation.current;
  setError('');setStatus('connecting');setTextOnly(onlyText);
  try{
   await saveQueue.current;
   const config=await request({action:'teacher',sessionId:initial.id});
   const {Conversation}=await import('@elevenlabs/client');
   if(!mounted.current||epoch!==generation.current)return null;
   expiry.current=config.expires;callId.current=crypto.randomUUID();
   const c=await Conversation.startSession({
    agentId:config.agentId,connectionType:'websocket',textOnly:onlyText,
    dynamicVariables:config.dynamicVariables,
    onStatusChange:({status})=>{if(mounted.current&&epoch===generation.current)setStatus(status)},
    onModeChange:({mode})=>{if(mounted.current&&epoch===generation.current)setMode(mode)},
    onMessage:({message,role,event_id})=>{if(epoch===generation.current){append(role==='user'?'user':'assistant',message,callId.current+':'+role+':'+event_id);if(role==='agent'&&lesson.quiz.some((q:Row)=>message.includes(q.question)))void syncQuizStage().catch(()=>setError('Не удалось открыть проверку. Повторите подключение.'))}},
    onAgentResponseCorrection:({corrected_agent_response,event_id})=>{if(epoch===generation.current)append('assistant',corrected_agent_response,callId.current+':agent:'+event_id)},
    onError:()=>{if(mounted.current&&epoch===generation.current)setError('Голосовой сервис недоступен. Проверьте соединение и лимит ElevenLabs, затем попробуйте снова.')},
    onDisconnect:(details)=>{if(mounted.current&&epoch===generation.current){connection.current=null;setStatus('disconnected');if(details.reason==='error')setError('Соединение прервалось. Можно продолжить с сохранённого места.')}},
    clientTools:{
     set_lesson_stage:async({stage,reason}:{stage:number,reason:string})=>{
      try{
       if(epoch!==generation.current)throw new Error('Lesson disconnected');
       await request({action:'stage',sessionId:initial.id,stage});
       setCurrent({...sessionRef.current,stage});setStageReason(String(reason).slice(0,240));
       return JSON.stringify({ok:true,stage});
      }catch{return JSON.stringify({ok:false,error:'Stage could not be saved. Keep the current stage and ask the student to reconnect.'})}
     },
     submit_quiz_answer:async({question,option}:{question:number,option:number})=>{
      try{
       if(epoch!==generation.current)throw new Error('Lesson disconnected');
       await syncQuizStage();
       const r=await request({action:'quizAnswer',sessionId:initial.id,question,option});
       setCurrent(r.session);setAnswers(JSON.parse(r.session.answers||'{}'));
       if(r.completed){setResult(r.result||r);onComplete()}
       return JSON.stringify({ok:true,completed:r.completed,correct:r.correct,answer:r.answer,explanation:r.explanation,nextQuestion:r.nextQuestion,result:r.result});
      }catch{return JSON.stringify({ok:false,error:'The answer could not be saved. Do not invent a grade. Ask the student to use the answer buttons.'})}
     },
    },
   });
   if(!mounted.current||epoch!==generation.current){await c.endSession();return null}
   connection.current=c;if(!onlyText)c.setVolume({volume});setStatus('connected');return c;
  }catch(e){if(mounted.current&&epoch===generation.current){setStatus('disconnected');setError(onlyText?'Не удалось начать разговор. Проверьте интернет и доступность ElevenLabs.':'Не удалось включить голос. Разрешите микрофон в браузере или выберите «Заниматься текстом».')}return null}
  finally{if(epoch===generation.current)starting.current=false}
 };
 const send=async(text=draft)=>{
  if(!text.trim()||busy||sessionRef.current.completed)return;
  setBusy(true);
  try{
   const c=connection.current||await start(true);if(!c)return;
   const value=text.trim();c.sendUserMessage(value);append('user',value,crypto.randomUUID());setDraft('');
  }catch{setError('Не удалось отправить ответ. Попробуйте ещё раз.')}
  finally{setBusy(false)}
 };
 const chooseAnswer=async(q:number,a:number)=>{
  setBusy(true);
  try{
   const r=await request({action:'quizAnswer',sessionId:initial.id,question:q,option:a});
   setCurrent(r.session);setAnswers(JSON.parse(r.session.answers||'{}'));
   append('user',lesson.quiz[q].options[a],crypto.randomUUID());
   if(r.completed){setResult(r.result||r);onComplete()}
   if(connection.current){connection.current.sendUserMessage(`I selected "${lesson.quiz[q].options[a]}" for question ${q+1} using the answer buttons.`);connection.current.sendContextualUpdate(`The server already recorded this choice. Feedback: ${JSON.stringify({question:q,correct:r.correct,answer:r.answer,explanation:r.explanation,completed:r.completed,result:r.result})}. Do not resubmit it. Explain this feedback briefly and continue with the next unanswered question, or close the completed lesson.`)}
   else toast(r.explanation);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 const exercise=async(taskId:string,option:number,helped:boolean,token:string)=>{const r=await request({action:'exercise',sessionId:initial.id,taskId,option,helped,token});setTraining(r.training);connection.current?.sendContextualUpdate('Training task saved by the application: '+JSON.stringify({taskId,correct:r.correct,helped,progress:r.training})+'. Do not treat a choice click as independent speaking ability. Continue the active conversation.');return r;};
 const advance=async(stage:number)=>{if(busy)return;setBusy(true);try{await request({action:'stage',sessionId:initial.id,stage});setCurrent({...sessionRef.current,stage});setStageReason('You chose to continue to the next activity.');if(connection.current){connection.current.sendContextualUpdate('The application saved stage '+stage+' after the learner chose to continue. Honor this stage.');await send(stage===2?'I am ready for our cafe role-play. Please be the barista and ask me one question.':'I am ready for the three review questions. Please ask the first unanswered question.');}}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 const close=async()=>{await stop();await saveQueue.current;if(pendingSaves.current.size){if(persistOutbox()){toast('Несохранённые ответы оставлены на этом устройстве. Откройте урок, чтобы повторить сохранение.')}else{setError('Не удалось сохранить черновик. Скачайте разговор перед выходом.');return}}onClose()};
 const downloadTranscript=()=>{const blob=new Blob([messages.map(m=>(m.role==='user'?'You':tutor.name)+': '+m.content).join('\n\n')],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='english-room-lesson.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const nextQuiz=lesson.quiz.findIndex((_:any,i:number)=>!Number.isInteger(answers[i]));
 return <main className="lesson-shell">
  <div className="lesson-heading"><button className="text-button" onClick={close}><ArrowLeft size={16}/> К модулям</button><span>{lesson.level} · {lesson.title}</span><span className="badge">Преподаватель ведёт урок</span></div>
  <div className="lesson-grid"><section className="lesson-main">
   <div className="teacher-line"><span className={'avatar '+tutor.id}>{tutor.name[0]}</span><div><h1>{tutor.name}</h1><p>Ваш ИИ-преподаватель · English Room</p></div><span className={'teacher-status '+(connected?'online':'')}>{connected?(textOnly?'На связи':mode==='speaking'?'Говорит':'Слушает'):status==='connecting'?'Подключается':'Готов к занятию'}</span></div>
   <div className="lesson-steps">{stages.map((label,i)=><div key={label} className={session.stage===i?'current':session.stage>i?'done':''}><span>{session.stage>i?<CheckCircle2 size={16}/>:i+1}</span>{label}</div>)}</div>
   {!session.completed&&<div className="voice-desk">
    <div className={'voice-wave '+(connected&&!textOnly&&mode==='speaking'?'speaking':'')} aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i}/>)}</div>
    <div className="voice-desk-copy"><strong>{connected?(textOnly?'Урок в переписке':mode==='speaking'?'Слушайте и отвечайте в своём темпе':'Ваша очередь — можно говорить'):'Начните разговор с преподавателем'}</strong><p>{connected?'Можно попросить повторить, объяснить проще или сделать паузу.':'Естественная речь, живой диалог и подсказки по ходу занятия.'}</p></div>
    {connected?<div className="voice-controls">{!textOnly&&<button className={'secondary small '+(muted?'is-muted':'')} onClick={()=>{connection.current?.setMicMuted(!muted);setMuted(!muted)}}>{muted?<MicOff size={17}/>:<Mic size={17}/>} {muted?'Включить микрофон':'Микрофон включён'}</button>}<button className="secondary small" onClick={stop}><Pause size={16}/> Пауза</button></div>:<div className="voice-controls"><button className="primary" disabled={status==='connecting'} onClick={()=>start(false)}>{status==='connecting'?<LoaderCircle size={18} className="spin"/>:<Mic size={18}/>} Начать голосовой урок</button><button className="text-button" disabled={status==='connecting'} onClick={()=>start(true)}>Заниматься текстом</button>{status==='connecting'&&<button className="text-button" onClick={stop}>Отменить подключение</button>}</div>}
   </div>}
   {error&&<div role="alert" className="lesson-alert">{error}</div>}
   {savingError&&<div role="alert" className="lesson-alert">{savingError}<button className="text-button" onClick={()=>{for(const body of [...pendingSaves.current.values()])save(body)}}>Повторить сохранение</button><button className="text-button" onClick={downloadTranscript}>Скачать разговор</button><button className="text-button" onClick={async()=>{await stop();onClose()}}>Выйти без ожидания</button></div>}
   {session.completed&&<div className="lesson-summary"><CheckCircle2 size={34}/><div><p className="eyebrow">ЗАНЯТИЕ СОХРАНЕНО</p><h2>{session.score} из 3 · {session.score>=2?'Хорошая практика!':'Есть что повторить'}</h2><p>{session.score>=2?'Продолжайте модуль или повторите фразы своими словами.':'Вернитесь к примерам и попробуйте ещё раз — это часть обучения.'}</p></div>{connected&&<button className="secondary small" onClick={stop}>Завершить разговор</button>}</div>}
   <div className="chat-messages" aria-live="polite">
    {messages.map((m,i)=><div className={'message '+m.role} key={m.id||i}><div><div className="message-meta">{m.role==='user'?'Вы':tutor.name}{m.source==='lesson'?' · тема урока':''}</div><div className="bubble" lang="en">{m.content}</div></div></div>)}
    <div ref={bottom}/>
   </div>
   {!session.completed&&<div className="composer"><div className="quick-actions"><button disabled={busy||status==='connecting'} onClick={()=>send('Please give me a hint and a sentence starter.')}>Нужна подсказка</button><button disabled={busy||status==='connecting'} onClick={()=>send('Please explain that in simpler English.')}>Объясни проще</button><button disabled={busy||status==='connecting'} onClick={()=>send('Please repeat your last question slowly.')}>Повтори</button></div><form onSubmit={e=>{e.preventDefault();send()}}><textarea aria-label="Ваш ответ на английском" placeholder="Your turn. Можно говорить или написать ответ…" value={draft} maxLength={1200} onChange={e=>{setDraft(e.target.value);connection.current?.sendUserActivity()}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}/><button className="send-button" aria-label="Отправить" disabled={busy||status==='connecting'||!draft.trim()}><Send size={20}/></button></form><small>Enter — отправить · Shift + Enter — новая строка</small></div>}
   {lesson.trainingTasks&&<><TrialPractice tasks={lesson.trainingTasks} progress={training} completed={!!session.completed} onAttempt={exercise}/>{!session.completed&&session.stage<3&&<div className="training-actions" style={{padding:'0 26px 24px'}}><button className="secondary small" disabled={busy} onClick={()=>advance(session.stage<2?2:3)}>{session.stage<2?'Перейти к разговорной практике':'Перейти к проверке'}</button><span className="trial-caption">Можно продолжить в своём темпе.</span></div>}</>}
   {session.stage===3&&!session.completed&&<div className="quiz"><p className="eyebrow">МИНИ-ПРОВЕРКА · {Math.max(0,nextQuiz)+1} ИЗ 3</p><h2>Голосом или одним нажатием</h2>{lesson.quiz.map((q:any,i:number)=><fieldset key={i} className="question" disabled={busy||i!==nextQuiz}><legend>{i+1}. {q.question}</legend>{q.options.map((opt:string,j:number)=><label key={j} className={answers[i]===j?'selected':''}><input type="radio" name={'q'+i} checked={answers[i]===j} onChange={()=>chooseAnswer(i,j)}/>{opt}</label>)}</fieldset>)}</div>}
   {session.completed&&result&&<div className="quiz">{lesson.trainingTasks&&<section className="trial-recap"><h3>Как прошли задания</h3><p>Это результат упражнений; разбор вашей речи — в разговоре с Mia выше.</p>{lesson.trainingTasks.map((task:Row)=>{const p=training.find(p=>p.taskId===task.id);return <p key={task.id}><b>{task.title}:</b> {!p?.complete?'ещё не выполнено':p.firstTry&&!p.helped?'с первой попытки без открытой подсказки':'закрепили с повторением или опорой'}.</p>})}<p>Завтра попробуйте без примера: заказать чай и сэндвич, уточнить «с собой» и спросить общую цену.</p></section>}{result.feedback?.map((f:Row,i:number)=><div className={'feedback '+(f.correct?'correct':'')} key={i}><b>{f.correct?'✓':'○'} {f.question}</b><p>{f.answer}</p><small>{f.explanation}</small></div>)}<button className="primary" onClick={close}>Вернуться к программе</button></div>}
  </section><aside className="lesson-side">{lesson.id==='cafe-trial'&&<div className="side-box cafe-menu"><p className="eyebrow">МЕНЮ ДЛЯ РОЛЕВОЙ ИГРЫ</p><h3>The little café</h3><dl><div><dt>Small coffee</dt><dd>£3.50</dd></div><div><dt>Tea</dt><dd>£2.50</dd></div><div><dt>Sandwich</dt><dd>£4.00</dd></div></dl><p className="fineprint">Вы — покупатель, Mia — бариста. Закажите напиток и еду, уточните «здесь / с собой» и спросите цену. Цены условные.</p></div>}
   {!connected&&!session.completed&&<div className="side-box"><p className="eyebrow">ПОСЛУШАЙТЕ ГОЛОС</p><p className="teacher-note">Пример речи преподавателя. В уроке он отвечает на ваши слова.</p><audio aria-label="Пример голоса преподавателя" controls preload="none" src="/audio/teacher-sample.wav" style={{width:'100%',height:36,marginTop:15}}/></div>}
   <div className="side-box"><p className="eyebrow">ВАШ РЕЗУЛЬТАТ СЕГОДНЯ</p><h3>{lesson.goal}</h3><div className="stage-note"><BookOpen size={19}/><p>{stageCopy[session.stage]}</p></div>{stageReason&&<p className="teacher-note" lang="en">{stageReason}</p>}</div>
   <div className="side-box"><p className="eyebrow">ОПОРА ДЛЯ РАЗГОВОРА</p><div className="phrase-list">{lesson.phrases.map((p:string)=><div key={p}><span lang="en">{p}</span><button className="audio-button" disabled={!connected||textOnly||!!session.completed} aria-label={'Произнеси '+p} title="Преподаватель произнесёт фразу в голосовом уроке" onClick={()=>send(`Please model this phrase naturally, then return to our current task: "${p}"`)}><Volume2 size={18}/></button></div>)}</div>{session.stage===1&&<details className="lesson-example"><summary>Пример диалога</summary>{lesson.dialogue.map((line:string,i:number)=><p lang="en" key={i}>{line}</p>)}</details>}{session.stage===2&&<p className="teacher-note" lang="en">{lesson.practice}</p>}</div>
   {connected&&!textOnly&&<div className="side-box"><label className="field-label" htmlFor="teacher-volume">Громкость преподавателя<input id="teacher-volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);connection.current?.setVolume({volume:v})}}/></label><p className="fineprint">Чтобы перебить преподавателя, просто начните говорить.</p></div>}
   <div className="teacher-details"><MessageCircle size={18}/><p>Разговор обрабатывает ElevenLabs. Микрофон включается только при запуске голосового урока. В переписке он не нужен.</p></div>
   <p className="fineprint">ИИ ведёт практику и может ошибаться. Баллы отражают ответы на вопросы урока, а не официальный уровень языка.</p>
  </aside></div>
 </main>;
}
