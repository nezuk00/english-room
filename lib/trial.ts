/** A short, task-based lesson. Objective keys stay on the server. */
export const trialTasks = [
  {
    id: 'listen', title: 'Поймите вопрос бариста',
    instruction: 'Послушайте реплику. Какой выбор вам предлагают?',
    audio: '/audio/cafe-question.mp3', transcript: 'Would you like your coffee to stay or to go?',
    options: ['Выпить здесь или взять с собой', 'Добавить молоко или сахар', 'Оплатить картой или наличными'],
    answer: 0, hint: 'To stay — остаться. To go — взять с собой.',
    explanation: 'To stay or to go? — вопрос о том, где вы будете пить кофе. Можно ответить: To go, please.',
  },
  {
    id: 'order', title: 'Сделайте вежливый заказ',
    instruction: 'Вы хотите маленький кофе с собой. Выберите подходящую фразу, затем скажите её своими словами преподавателю.',
    options: ['I small coffee yesterday.', "I'd like a small coffee to go, please.", 'How many small coffee you?'],
    answer: 1, hint: "Начните с I'd like… и назовите размер, напиток и to go.",
    explanation: "I'd like a small coffee to go, please. I'd like помогает вежливо попросить; to go означает «с собой».",
  },
] as const;

export function publicTrialTasks() {
  return trialTasks.map(({answer, explanation, ...task}) => task);
}

export function trialProgress(rows: {content: string}[]) {
  const attempts = rows.flatMap(row => {try {const a = JSON.parse(row.content); return trialTasks.some(t => t.id === a.taskId) ? [a] : [];} catch {return [];}});
  return trialTasks.map(task => {
    const list = attempts.filter(a => a.taskId === task.id);
    return {taskId: task.id, attempts: list.length, complete: list.some(a => a.correct), firstTry: list.length ? !!list[0].correct : null, helped: list.some(a => a.helped)};
  });
}
