'use client';
import {ArrowUpRight,CheckCircle2,Play,RotateCcw,BookOpen} from 'lucide-react';
type Row=Record<string,any>;
export default function ModuleProgram({modules,lessons,sessions,level,busy,onStart,tutorId}:{modules:Row[],lessons:Row[],sessions:Row[],level:string,busy:boolean,onStart:(id:string)=>void,tutorId:string}){
 const mastered=(id:string)=>sessions.some(s=>s.lesson_id===id&&s.completed&&s.score>=2);
 const next=lessons.find(l=>(level==='all'||l.level===level)&&!mastered(l.id));
 return <div className="module-program">
  <div className="course-intro"><BookOpen size={22}/><p><b>Один урок — один небольшой навык.</b> Разговор, объяснение на примерах, практика и обратная связь. Можно идти по порядку или выбрать нужную тему.</p></div>
  {modules.filter(m=>level==='all'||m.level===level).map((m,index)=>{
   const done=m.lessons.filter(mastered).length;
   return <section className={'course-module module-'+m.level} key={m.id}>
    <div className="module-heading"><span className="module-index">{String(modules.indexOf(m)+1).padStart(2,'0')}</span><div><p className="eyebrow">МОДУЛЬ · {m.level}</p><h2>{m.title}</h2><p>{m.description}</p></div><div className="module-progress"><span>{done} / {m.lessons.length}</span><small>тем закреплено</small><div><i style={{width:`${done/m.lessons.length*100}%`}}/></div></div></div>
    <div className="module-lessons">{m.lessons.map((id:string,i:number)=>{
     const l=lessons.find(l=>l.id===id);if(!l)return null;
     const complete=sessions.some(s=>s.lesson_id===id&&s.completed),started=sessions.some(s=>s.lesson_id===id&&s.tutor_id===tutorId&&!s.completed),good=mastered(id),recommended=next?.id===id;
     return <article key={id} className={'module-lesson '+(recommended?'recommended':'')}><span className="lesson-index">{good?<CheckCircle2 size={22}/>:String(i+1).padStart(2,'0')}</span><div><div className="lesson-labels"><span>{l.durationMinutes||15} минут</span>{recommended&&<b>Ваш следующий шаг</b>}{good&&<b>Закреплено</b>}{complete&&!good&&<b>Полезно повторить</b>}</div><h3>{l.title}</h3><p>{l.goal}</p></div><button className={recommended?'primary':'secondary'} disabled={busy} onClick={()=>onStart(id)}>{started?'Продолжить':complete?'Повторить':'Начать'}{started?<Play size={16}/>:complete?<RotateCcw size={16}/>:<ArrowUpRight size={17}/>}</button></article>;
    })}</div><div className="module-outcome"><CheckCircle2 size={17}/><span>После модуля: {m.outcome}</span></div>
   </section>;
  })}<p className="fineprint">Тема закреплена, если в проверке не меньше 2 верных ответов из 3. Ошибки не закрывают доступ к следующим урокам.</p>
 </div>;
}
