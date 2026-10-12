# Локальный запуск

1. Установите Node.js 22.13+ (рекомендуется 24), затем выполните `npm ci`.
2. Выполните `npm run build`.
3. Создайте локальную базу:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_silent_lifeguard.sql
```

4. Запустите `npm run dev -- --port 5189 --hostname 127.0.0.1` и откройте http://127.0.0.1:5189. В локальной версии вход включает демонстрационный профиль.

## Диалог с собственным агентом

Скопируйте `.dev.vars.example` в `.dev.vars` и задайте `ELEVENLABS_AGENT_ID` своего агента. Используйте `teacherPrompt` из `lib/teaching.ts`, первую реплику `{{opening}}` и динамические переменные: teacher_name, teacher_style, student_name, lesson_context, stage, history, opening. Язык — английский. Исходный пилот использовал GPT-4.1 и голос Jessica; конкретная модель озвучки зависит от доступности в вашем аккаунте.

Добавьте клиентские инструменты с ожиданием ответа:

- `set_lesson_stage(stage: integer, reason: string)`: индексы 0 — знакомство, 1 — фразы, 2 — практика, 3 — проверка.
- `submit_quiz_answer(question: integer, option: integer)`: индексы вопроса и варианта начинаются с нуля; правильность определяет сервер.

Разрешённые домены должны соответствовать вашему развёртыванию. API-ключи держите только в секретах сервера. Для открытого оплачиваемого сервиса нужна выдача signed URLs после проверки пользователя, отдельная защита расходов и доверенная аутентификация — этот MVP её не реализует. Нельзя размещать Worker с доступным извне подставлением oai-authenticated-user-* заголовков: производственная среда должна проверять и формировать их сама.

## Проверки API

Для проверок используйте только локальную базу. После сборки и миграции запустите:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 5190 --inspector-port 0 --var ELEVENLABS_AGENT_ID:agent_synthetic_fixture
```

В другом терминале:

```sh
npm run typecheck
node tests/api-flow.mjs
node tests/teacher-flow.mjs
node tests/trial-flow.mjs
```

Фиктивный ID нужен только для проверки структуры ответа сервера: тесты не устанавливают соединение с ElevenLabs. Для ручного диалога замените его ID своего агента.
