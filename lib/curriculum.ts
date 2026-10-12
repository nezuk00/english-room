/** Original curriculum content for the English Room test MVP. */
import {publicTrialTasks} from './trial';

export type StageId = 'warmup' | 'learn' | 'practice' | 'review';
export type Level = 'A1' | 'A2' | 'B1';

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  /** Zero-based option index. Keep on the server until the answer is checked. */
  answer: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  level: Level;
  title: string;
  titleEnglish: string;
  goal: string;
  goalEnglish: string;
  durationMinutes: number;
  warmup: string;
  phrases: string[];
  dialogue: string[];
  practice: string;
  successCriteria: string[];
  quiz: QuizQuestion[];
};

export const tutors = [
  {
    id: 'mia',
    name: 'Mia',
    label: 'Поддержка и первые разговоры',
    tagline: 'Поддержка и первые разговоры',
    description: 'Помогает начать говорить: короткие вопросы, простые примеры и мягкие исправления.',
    recommendedLevels: ['A1', 'A2'] as Level[],
    style: 'warm',
    accentColor: '#E79579',
    instructions: 'Be warm, patient, and encouraging without exaggerated praise. Use short sentences and ask one question at a time. Respond to the meaning first, then gently correct at most one useful language error. If the learner is stuck, offer a short sentence starter. Keep vocabulary accessible to the selected level.',
  },
  {
    id: 'oliver',
    name: 'Oliver',
    label: 'Структура и понятные правила',
    tagline: 'Структура и понятные правила',
    description: 'Объясняет правило на примере и сразу помогает применить его в разговоре.',
    recommendedLevels: ['A1', 'A2', 'B1'] as Level[],
    style: 'structured',
    accentColor: '#7DA99A',
    instructions: 'Be calm, precise, and structured. Explain one useful rule in one plain English sentence, provide one relevant example, and invite the learner to use it. Correct at most two errors per reply. Always respond to the learner\'s actual meaning and do not turn every exchange into a grammar lecture.',
  },
  {
    id: 'zoe',
    name: 'Zoe',
    label: 'Свободная речь и уверенность',
    tagline: 'Свободная речь и уверенность',
    description: 'Ведёт живой диалог, задаёт уточняющие вопросы и помогает выражать мысли естественнее.',
    recommendedLevels: ['A2', 'B1'] as Level[],
    style: 'conversational',
    accentColor: '#A5A1CE',
    instructions: 'Be curious, natural, and conversational. Ask relevant follow-up questions and sustain the role-play using details the learner provides. After two or three exchanges, suggest one more natural phrasing if useful. Do not interrupt every sentence with corrections. Adapt your language to the selected level, including very simple English for A1.',
  },
] as const;

const stageDetails = [
  {
    id: 'warmup' as const,
    title: 'Разогрев',
    durationMinutes: 2,
    description: 'Начинаем с простого вопроса по теме.',
    instructions: 'Start with the lesson warm-up question. Ask one question at a time, use the response to choose a comfortable level of difficulty, and help the learner produce a short answer. Do not pretend to have assessed their CEFR level.',
  },
  {
    id: 'learn' as const,
    title: 'Разбираемся',
    durationMinutes: 4,
    description: 'Разбираем пример и три полезные фразы.',
    instructions: 'Introduce one useful phrase at a time using the model dialogue as context. Explain it briefly in plain English, then ask for the learner\'s own example. Avoid dumping the entire lesson into a single reply. Treat the dialogue as a learning example, not a conversation that already happened with this learner.',
  },
  {
    id: 'practice' as const,
    title: 'Разговариваем',
    durationMinutes: 6,
    description: 'Тренируем английский в ролевом диалоге.',
    instructions: 'Run the provided role-play interactively. Play only your assigned role. Respond to each learner message and ask one natural follow-up question. Help the learner reach the listed success criteria. Do not write the learner\'s entire side of the conversation or claim they completed a criterion without evidence.',
  },
  {
    id: 'review' as const,
    title: 'Закрепляем',
    durationMinutes: 3,
    description: 'Проверяем знания и выбираем следующий шаг.',
    instructions: 'Give a brief recap based only on the learner\'s observed responses: one specific success, one useful correction if supported, and one next practice step. The application checks the three multiple-choice questions separately; do not invent a quiz score, completed answers, or a proficiency certification. If no learner work is available, ask for one short example before giving personalized feedback.',
  },
] as const;

export const stages = stageDetails.map((stage) => stage.title);

/** All plans grant identical tutor features and require no payment in this MVP. */
export const plans = [
  {
    id: 'day',
    name: '24 часа',
    days: 1,
    durationHours: 24,
    price: 0,
    currency: 'RUB',
    billingMode: 'free_test',
    description: 'Попробовать преподавателя и пройти первое занятие.',
    priceLabel: 'Бесплатно в тестовом MVP',
  },
  {
    id: 'week',
    name: '7 дней',
    days: 7,
    durationHours: 168,
    price: 0,
    currency: 'RUB',
    billingMode: 'free_test',
    description: 'Заниматься в удобном темпе в течение недели.',
    priceLabel: 'Бесплатно в тестовом MVP',
  },
  {
    id: 'month',
    name: '30 дней',
    days: 30,
    durationHours: 720,
    price: 0,
    currency: 'RUB',
    billingMode: 'free_test',
    description: 'Выстроить привычку регулярно говорить по-английски.',
    priceLabel: 'Бесплатно в тестовом MVP',
  },
] as const;

export const lessons: Lesson[] = [
  {
    id: 'cafe-trial', level: 'A2', title: 'Ваш первый разговор в кафе', titleEnglish: 'Coffee, your way',
    goal: 'Заказать напиток и сэндвич с собой, уточнить заказ и спросить цену.',
    goalEnglish: 'Order a drink and a sandwich to go, answer a follow-up question and ask for the total.',
    durationMinutes: 18, warmup: 'What do you usually drink: tea or coffee?',
    phrases: ["I'd like a small coffee to go, please.", 'Could you repeat that, please?', 'How much is it altogether?'],
    dialogue: ['Barista: Hello! What would you like?', "Customer: I'd like a small coffee, please.", 'Barista: To stay or to go?', 'Customer: To go, please. How much is it altogether?', "Barista: That's three pounds fifty."],
    practice: 'You are a customer in an imaginary cafe. I am the barista. Menu: small coffee £3.50, tea £2.50, sandwich £4. Order a drink and a sandwich, choose to stay or to go, then ask for the total. First run: I can offer a hint. Second run: choose a different drink and try without a model. Ask me to repeat if needed. Prices are fictional.',
    successCriteria: ['Makes an understandable drink order', 'Answers to stay or to go', 'Asks about the total'],
    quiz: [
      {id:'cafe-trial-1', question:'The barista asks: To stay or to go? You want a takeaway. What do you say?', options:['To go, please.','With milk, please.','By card, please.'], answer:0, explanation:'To go means you will take your drink away. To stay means you will have it in the cafe.'},
      {id:'cafe-trial-2', question:'Choose a polite way to order a small tea.', options:['I small tea now.', "I'd like a small tea, please.",'How small tea is you?'], answer:1, explanation:"I'd like + your order + please is a useful polite pattern. Can I have a small tea, please? is also correct."},
      {id:'cafe-trial-3', question:'You ordered coffee and a sandwich. How do you ask for the total?', options:['How old is it?','Where is the coffee?', 'How much is it altogether?'], answer:2, explanation:'How much is it altogether? asks for the total price. The coffee and sandwich on our imaginary menu cost £7.50.'},
    ],
  },
  {
    id: 'first-conversation',
    level: 'A1',
    title: 'Первое знакомство',
    titleEnglish: 'A first conversation',
    goal: 'Поздороваться, представиться и задать встречный вопрос.',
    goalEnglish: 'Greet someone, introduce yourself, and ask a question in return.',
    durationMinutes: 15,
    warmup: 'Hi! What is your name? You can use an imaginary name.',
    phrases: ['My name is Alex.', "I'm from Moscow.", 'What do you like doing?'],
    dialogue: [
      "Tutor: Hi, I'm Mia. What's your name?",
      'Learner: My name is Alex.',
      'Tutor: Nice to meet you, Alex. Where are you from?',
      "Learner: I'm from Moscow. How about you?",
    ],
    practice: 'We are meeting at an English conversation club. Introduce yourself, tell me where you are from, and ask me one question. All personal details can be imaginary. Start when you are ready.',
    successCriteria: ['Introduces themselves', 'Shares one real or imaginary personal detail', 'Asks a relevant question'],
    quiz: [
      {
        id: 'first-conversation-1',
        question: 'Choose the correct sentence.',
        options: ['I am from Moscow.', 'I is from Moscow.', 'I from am Moscow.'],
        answer: 0,
        explanation: 'Use am with I: I am from Moscow.',
      },
      {
        id: 'first-conversation-2',
        question: "Someone says: 'Nice to meet you.' What is a suitable reply?",
        options: ["I'm twenty.", 'Nice to meet you too.', "It's a table."],
        answer: 1,
        explanation: 'Nice to meet you too is a friendly reply when you meet someone for the first time.',
      },
      {
        id: 'first-conversation-3',
        question: "Complete: 'What ___ your name?'",
        options: ['are', 'am', 'is'],
        answer: 2,
        explanation: 'Your name is singular, so use is: What is your name?',
      },
    ],
  },
  {
    id: 'at-the-cafe',
    level: 'A1',
    title: 'Заказ в кафе',
    titleEnglish: 'At the cafe',
    goal: 'Заказать напиток и уточнить цену.',
    goalEnglish: 'Order a drink and a snack, then ask about the price.',
    durationMinutes: 15,
    warmup: 'Do you prefer tea or coffee?',
    phrases: ["I'd like a tea, please.", 'Can I have some water?', 'How much is it?'],
    dialogue: [
      'Tutor: Hello! What would you like?',
      "Learner: I'd like a tea, please.",
      'Tutor: Of course. Anything else?',
      'Learner: A sandwich, please. How much is it?',
      "Tutor: It's six pounds altogether.",
    ],
    practice: "I'm the cafe assistant. You are the customer. Order one drink and one snack, then ask for the total. We can invent the menu and prices for this role-play. Hello! What would you like?",
    successCriteria: ['Orders a drink', 'Orders a snack', 'Asks about the price'],
    quiz: [
      {
        id: 'at-the-cafe-1',
        question: 'Which is a polite order?',
        options: ["I'd like a coffee, please.", 'I coffee yesterday.', 'What coffee you?'],
        answer: 0,
        explanation: 'Use I would like, or the short form I\'d like, with please to make a polite order.',
      },
      {
        id: 'at-the-cafe-2',
        question: 'You want to know the price. What do you ask?',
        options: ['Where are you from?', 'How much is it?', 'What is your name?'],
        answer: 1,
        explanation: 'How much is it? asks about the price of something.',
      },
      {
        id: 'at-the-cafe-3',
        question: "Complete: 'Can I have ___ water, please?'",
        options: ['a', 'an', 'some'],
        answer: 2,
        explanation: 'Water is uncountable here. Some water means an amount of water.',
      },
    ],
  },
  {
    id: 'finding-the-station',
    level: 'A2',
    title: 'Как добраться до станции',
    titleEnglish: 'Finding the station',
    goal: 'Спросить дорогу и проверить, правильно ли поняты указания.',
    goalEnglish: 'Ask for directions and check that you understood them.',
    durationMinutes: 15,
    warmup: 'How do you usually travel around your city?',
    phrases: ['How can I get to the station?', 'Go straight on and turn left.', 'Is it far from here?'],
    dialogue: [
      'Learner: Excuse me. How can I get to the station?',
      'Tutor: Go straight on, then turn left at the traffic lights.',
      'Learner: Turn left at the traffic lights?',
      "Tutor: That's right. The station is next to the bank.",
    ],
    practice: "You are visiting an imaginary town and need to find the station. I'm a local resident. Ask for directions, repeat one instruction to check it, and ask how long the walk takes.",
    successCriteria: ['Asks for directions', 'Checks one instruction', 'Asks about walking time'],
    quiz: [
      {
        id: 'finding-the-station-1',
        question: 'The station is next to the bank. Where is the station?',
        options: ['Beside the bank.', 'Inside the bank.', 'Far away from the bank.'],
        answer: 0,
        explanation: 'Next to and beside both mean very near something, at its side.',
      },
      {
        id: 'finding-the-station-2',
        question: 'Choose the correct instruction.',
        options: ['To turning left.', 'Turn left at the traffic lights.', 'Left you turned are.'],
        answer: 1,
        explanation: 'Begin a direct instruction with the base form of a verb: Turn left.',
      },
      {
        id: 'finding-the-station-3',
        question: 'You did not understand the directions. What can you say?',
        options: ['I finished my lunch.', 'The train was blue.', 'Could you repeat that, please?'],
        answer: 2,
        explanation: 'Could you repeat that, please? politely asks someone to say something again.',
      },
    ],
  },
  {
    id: 'weekend-trip',
    level: 'A2',
    title: 'Поездка на выходных',
    titleEnglish: 'A weekend trip',
    goal: 'Рассказать о прошедшей поездке и задать уточняющий вопрос.',
    goalEnglish: 'Talk about a past trip and ask a follow-up question.',
    durationMinutes: 15,
    warmup: 'Where did you go last weekend? You can invent a trip.',
    phrases: ['I went to a small town.', 'We stayed for two nights.', 'What did you enjoy most?'],
    dialogue: [
      'Tutor: Where did you go last weekend?',
      'Learner: I went to a small town near the sea.',
      'Tutor: How long did you stay?',
      'Learner: We stayed for two nights.',
      'Tutor: What did you enjoy most?',
      'Learner: I loved walking on the beach.',
    ],
    practice: "We're talking about our weekends. Tell me about a real or imaginary trip: where you went, what you did, and what you enjoyed. Ask me one question about my weekend too. The tutor's trip is an invented role-play example.",
    successCriteria: ['Describes a destination', 'Describes a past activity', 'Asks a follow-up question'],
    quiz: [
      {
        id: 'weekend-trip-1',
        question: "Complete: 'Yesterday I ___ to the beach.'",
        options: ['went', 'go', 'going'],
        answer: 0,
        explanation: 'Yesterday refers to a finished time in the past. The past simple form of go is went.',
      },
      {
        id: 'weekend-trip-2',
        question: 'Choose the correct question.',
        options: ['Where did you stayed?', 'Where did you stay?', 'Where you did staying?'],
        answer: 1,
        explanation: 'Use the base form of the main verb after did: Where did you stay?',
      },
      {
        id: 'weekend-trip-3',
        question: "Complete: 'We ___ the museum because it was closed.'",
        options: ["don't visited", "weren't visit", "didn't visit"],
        answer: 2,
        explanation: 'Make a past simple negative with did not, or didn\'t, followed by the base form: didn\'t visit.',
      },
    ],
  },
  {
    id: 'work-update',
    level: 'B1',
    title: 'Короткая рабочая встреча',
    titleEnglish: 'A short project update',
    goal: 'Рассказать о результате, обозначить проблему и предложить следующий шаг.',
    goalEnglish: 'Report a result, explain a problem, and suggest a next step.',
    durationMinutes: 15,
    warmup: 'What is one task you completed recently? It can be a study task or an imaginary task.',
    phrases: ["I've finished the first draft.", "I'm having trouble with the schedule.", 'Could we move the deadline to Friday?'],
    dialogue: [
      'Tutor: How is the project going?',
      "Learner: I've finished the first draft, but I need feedback.",
      'Tutor: Is anything blocking the next step?',
      "Learner: I'm waiting for the final figures.",
      'Tutor: What do you suggest?',
      'Learner: Could we review the draft today and add the figures tomorrow?',
    ],
    practice: "I'm your colleague in a short project meeting. Give an update on an imaginary project: one completed task, one problem, and one proposed next step. I'll ask realistic follow-up questions. You do not need to share real workplace information.",
    successCriteria: ['States a completed task', 'Explains a blocker', 'Proposes an actionable next step'],
    quiz: [
      {
        id: 'work-update-1',
        question: 'Choose the correct sentence.',
        options: ['I sent the report yesterday.', 'I have sent the report yesterday.', 'I send the report yesterday.'],
        answer: 0,
        explanation: 'Use the past simple with a finished past time such as yesterday: I sent the report yesterday.',
      },
      {
        id: 'work-update-2',
        question: 'Which request is the most appropriate for a colleague?',
        options: ['You send now, yes?', 'Could you send me your feedback by Friday?', 'Feedback yesterday send.'],
        answer: 1,
        explanation: 'Could you makes a polite request, and by Friday gives a clear deadline.',
      },
      {
        id: 'work-update-3',
        question: "Complete: 'I'm waiting ___ the final figures.'",
        options: ['at', 'to', 'for'],
        answer: 2,
        explanation: 'Use wait for before the person or thing you are waiting to receive or see.',
      },
    ],
  },
  {
    id: 'sharing-opinions',
    level: 'B1',
    title: 'Мнение и аргументы',
    titleEnglish: 'Sharing opinions',
    goal: 'Выразить мнение, объяснить причину и вежливо отреагировать на другую позицию.',
    goalEnglish: 'State an opinion, give a reason, and respond politely to a different view.',
    durationMinutes: 15,
    warmup: 'Do you prefer studying online or in a classroom?',
    phrases: ['In my opinion, online lessons are convenient.', 'One reason is that they save time.', 'I see your point, but I prefer learning with a group.'],
    dialogue: [
      'Tutor: Do you think online lessons are better?',
      "Learner: In my opinion, they're more convenient because they save travel time.",
      "Tutor: That's true, but some people miss meeting others.",
      'Learner: I see your point. A mix of online and classroom lessons might work best.',
    ],
    practice: "Let's discuss online lessons versus classroom lessons. Choose a preference and give one reason and one example. I'll offer a different perspective; respond politely. There is no correct opinion.",
    successCriteria: ['States a clear opinion', 'Supports it with a reason or example', 'Responds to the other viewpoint'],
    quiz: [
      {
        id: 'sharing-opinions-1',
        question: "Complete: 'I prefer online lessons ___ they save travel time.'",
        options: ['because', 'although', 'unless'],
        answer: 0,
        explanation: 'Because introduces the reason for a preference or opinion.',
      },
      {
        id: 'sharing-opinions-2',
        question: 'Which phrase expresses polite disagreement?',
        options: ['Your opinion is stupid.', 'I see your point, but I look at it differently.', 'I agree with everything you said.'],
        answer: 1,
        explanation: 'I see your point acknowledges the other view, and but introduces a different perspective politely.',
      },
      {
        id: 'sharing-opinions-3',
        question: 'Which sentence gives a reason for a preference?',
        options: ['My preference is my preference.', 'Online lessons exist.', 'I prefer classroom lessons because I enjoy meeting other students.'],
        answer: 2,
        explanation: 'This sentence states a preference and explains it with a specific reason.',
      },
    ],
  },
];

export type PublicQuizQuestion = Omit<QuizQuestion, 'answer' | 'explanation'>;
export type PublicLesson = Omit<Lesson, 'quiz'> & { quiz: PublicQuizQuestion[] };

/** Use this result in client payloads. Keep the original lessons on the server. */
export function publicLessons(): PublicLesson[] {
  return lessons.map((lesson) => ({
    ...lesson,
    ...(lesson.id==='cafe-trial' ? {trainingTasks:publicTrialTasks()} : {}),
    phrases: [...lesson.phrases],
    dialogue: [...lesson.dialogue],
    successCriteria: [...lesson.successCriteria],
    quiz: lesson.quiz.map((question) => ({
      id: question.id,
      question: question.question,
      options: [...question.options],
    })),
  }));
}

/** Server-side system instructions. The returned prompt contains English only. */
export function tutorInstructions(tutorId: string, lessonId: string, stage: number): string {
  const tutor = tutors.find((item) => item.id === tutorId);
  const lesson = lessons.find((item) => item.id === lessonId);
  const activeStage = Number.isInteger(stage) ? stageDetails[stage] : undefined;

  if (!tutor) throw new RangeError('Unknown tutor.');
  if (!lesson) throw new RangeError('Unknown lesson.');
  if (!activeStage) throw new RangeError('Unknown lesson stage.');

  return [
    `You are ${tutor.name}, an AI English tutor in English Room.`,
    'Use English only in every learner-facing reply, including explanations, feedback, examples, hints, summaries, and error messages. Do not translate into another language. If a learner writes in another language or requests a translation, respond kindly in simple English, explain the meaning using easier English, and offer an English sentence starter. Do not quote non-English learner text.',
    'Be transparent that you are an AI tutor. Do not claim to be a human, a native speaker, or an accredited examiner. Personal experiences in a role-play are imaginary examples.',
    tutor.instructions,
    `Lesson: ${lesson.titleEnglish}. Selected difficulty: ${lesson.level}.`,
    `Learning goal: ${lesson.goalEnglish}`,
    `Current stage: ${activeStage.id}. ${activeStage.instructions}`,
    'The approximate total lesson duration is 15 minutes. Time is guidance, not a forced cutoff. The application controls stages, access, lesson completion, and scores. Do not claim to have changed any of them.',
    'Use the actual conversation history. Respond specifically to what the learner said. Never invent learner answers, errors, achievements, quiz results, or previous conversations.',
    'Accept semantically correct answers and reasonable language variations. Do not require the exact wording of a model answer. Different personal opinions are not language mistakes.',
    'Usually keep each reply to 30-80 words, and shorter for A1. Ask at most one question per reply. Do not overwhelm the learner with a full lesson script.',
    'If the learner asks for help, give a small hint, a simple explanation, or a sentence starter before inviting another attempt. If they ask a direct language question, answer it clearly and then return to the lesson naturally.',
    'Use fictional personal details freely for practice. Do not require real names, addresses, employer details, or other private information.',
    'Selected A1, A2, or B1 difficulty is a self-assessment, not a certified CEFR result. Do not infer or certify a CEFR level from one lesson. Never assess pronunciation from typed text or a transcript alone.',
    `Warm-up: ${lesson.warmup}`,
    `Useful phrases:\n${lesson.phrases.map((phrase) => `- ${phrase}`).join('\n')}`,
    `Model dialogue (example only; not learner history):\n${lesson.dialogue.join('\n')}`,
    `Role-play: ${lesson.practice}`,
    `Practice goals:\n${lesson.successCriteria.map((criterion) => `- ${criterion}`).join('\n')}`,
    'Multiple-choice answer keys are intentionally absent from these instructions. Check results are supplied by the application. Feedback on free conversation is formative guidance, not an objective test score.',
  ].join('\n\n');
}
