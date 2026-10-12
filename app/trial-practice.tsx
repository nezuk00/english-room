'use client';
import {useRef,useState} from 'react';
type Row=Record<string,any>;
export default function TrialPractice({tasks,progress,completed,onAttempt}:{tasks:Row[],progress:Row[],completed:boolean,onAttempt:(id:string,option:number,helped:boolean,token:string)=>Promise<Row>}) {
 const [chosen,setChosen]=useState<Record<string,number>>({}),[help,setHelp]=useState<Record<string,boolean>>({}),[feedback,setFeedback]=useState<Record<string,Row>>({}),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const pending=useRef<Record<string,{signature:string,token:string}>>({});
 const attempt=async(task:Row)=>{
  if(busy||chosen[task.id]===undefined)return;
  setBusy(task.id);setError('');
  const signature=JSON.stringify([chosen[task.id],!!help[task.id]]);
  if(pending.current[task.id]?.signature!==signature)pending.current[task.id]={signature,token:crypto.randomUUID()};
  try{const r=await onAttempt(task.id,chosen[task.id],!!help[task.id],pending.current[task.id].token);delete pending.current[task.id];setFeedback(f=>({...f,[task.id]:r}));}
  catch(e){setError((e as Error).message)}finally{setBusy('')}
 };
 return <section className="trial-practice" aria-label="Практические задания">
  <p className="eyebrow">ПОСЛУШАЙТЕ → ПОПРОБУЙТЕ → ПОВТОРИТЕ</p><h2>Два шага перед разговором</h2>
  <p className="trial-caption">Преподаватель ведёт диалог выше. Эти задания можно выполнять в своём темпе; после ошибки доступна новая попытка.</p>
  {error&&<p role="alert" className="lesson-alert">{error}</p>}
  {tasks.map((task,index)=>{const p=progress.find(p=>p.taskId===task.id),done=p?.complete,f=feedback[task.id];return <article className="training-task" key={task.id}>
   <div className="training-title"><span>0{index+1}</span><h3>{task.title}</h3>{done&&<b>Выполнено</b>}</div>
   <p>{task.instruction}</p>
   {task.audio&&<><audio controls preload="none" src={task.audio} aria-label="Вопрос бариста"/><details onToggle={e=>{if(e.currentTarget.open)setHelp(h=>({...h,[task.id]:true}))}}><summary>Показать текст аудио</summary><p lang="en">{task.transcript}</p></details></>}
   <fieldset disabled={!!busy||done||completed} className="training-options"><legend className="sr-only">{task.title}</legend>{task.options.map((option:string,i:number)=><label key={i} className={chosen[task.id]===i?'selected':''}><input type="radio" name={task.id} checked={chosen[task.id]===i} onChange={()=>{setChosen(c=>({...c,[task.id]:i}));setFeedback(f=>({...f,[task.id]:undefined}));}}/><span>{option}</span></label>)}</fieldset>
   {!done&&!completed&&<div className="training-actions"><button className="primary small" disabled={!!busy||chosen[task.id]===undefined} onClick={()=>attempt(task)}>{busy===task.id?'Проверяем…':'Проверить ответ'}</button><button className="text-button" onClick={()=>setHelp(h=>({...h,[task.id]:true}))}>Подсказка</button></div>}
   {help[task.id]&&!done&&<p className="training-hint">{task.hint}</p>}
   {f&&<p role="status" className={'training-feedback '+(f.correct?'correct':'')}><b>{f.correct?'Верно.':'Попробуйте ещё раз.'}</b> {f.explanation}</p>}
   {p&&p.attempts>0&&<p className="trial-caption">Попыток: {p.attempts} · {p.firstTry&&!p.helped?'Верно с первой попытки без открытой подсказки':done?'Разобрали и закрепили':'Продолжаем практику'}</p>}
  </article>})}
 </section>;
}
