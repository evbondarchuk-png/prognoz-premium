# CLAUDE.md — «Премиум» (Прогноз v2)

> Claude Code читает этот файл при запуске в репо `prognoz-premium`. Читай целиком.
> Бизнес-логика (ИР, план, вал/доход, светофор, ночной цикл, архиватор) — общая с v1
> и подробно описана в `/Users/egor/prognoz-dashboard/CLAUDE.md`. Здесь — специфика
> Премиума, ассистента «Прогноша» и MAX-бота. Общий handoff-документ:
> `~/Downloads/PROGNOZ-HANDOFF-2026-07-08.md`.

---

## 0. Журнал последних работ (07–08.07.2026)

- **Создан Премиум v2 с нуля** (07.07): каркас, дизайн-токены (петроль/золото/Golos),
  login, auth-guard с автороутингом по ролям; кабинет партнёра `index.html` (5 табов),
  кабинет руководителя `senior.html` (МОП/РОП/АУП). Всё на реальных данных общего бэка.
- **Ассистент «Прогноша»** (07–08.07): плавающая кнопка + чат-шторка + бриф → маскот-лиса
  (SVG) → **5 эмоций по состоянию** (proud/happy/cheer/stern/alarm) с анимацией →
  чат подключён к **YandexGPT** (`askPrognosha`) → контекст обогащён историей/планами/задачами.
- **MAX-бот** (07–08.07): базовый функционал → реальный API MAX → **эпопея с сертификатом
  Минцифры** (undici игнорировал CA → перешли на нативный `https.request`) → регистрация
  webhook → меню команд. Пилот на 27890 привязался и работает.
- **v1 (prognoz-dashboard)** параллельно 06–07.07: архиватор n8n до v3.9 (flowCur remap),
  перебор блока «Задачи» (15-мин слоты, список, модалка), вкладка «Прогноз» (split
  факт/прогноз, прогноз позиции светофора). См. dashboard/CLAUDE.md §7, §11.

---

## 1. Что это

**«Премиум»** — новая версия (v2) дашборда «Прогноз» для АН «Этажи». Отдельный фронт,
**ОБЩИЙ бэкенд** с v1 (те же Cloud Functions в `prognoz-archive`, та же RTDB). Не путать:
- v1 «Прогноз» — `prognoz.info`, репо `prognoz-dashboard`.
- v2 «Премиум» — `premium.prognoz.info`, репо `prognoz-premium` (этот).

Любая правка `prognoz-functions/functions/` влияет на оба фронта.

Заказчик — **Бондарчук Егор**, код **27890** (он же АУП + управляющий + продающий
партнёр одновременно; зона `mid_401_500`, место #496). Не программист — по-русски, просто,
шаг за шагом. Оркестратор «Коля-проектник» (веб-чат) периодически недоступен → архитектуру
ведёт Claude Code напрямую с Егором.

**Стек:** статический фронт (HTML + ванильный JS, без сборки; графики — самописный SVG),
GitHub Pages; бэкенд — Firebase Cloud Functions Gen2 (Node 22) + RTDB + Auth.
**Дизайн v2:** петроль `#0C5460` + золото `#A86A12`, шрифт **Golos Text**, радиусы 16/12
(токены в `tokens.css`).

---

## 2. Ресурсы и деплой

- **Сайт:** `https://premium.prognoz.info` (CNAME → evbondarchuk-png.github.io).
- **Репо:** `github.com/evbondarchuk-png/prognoz-premium` (Public — нужно для Pages).
  Деплой фронта: `git push` → GitHub Pages (~2 мин). Иногда падает transient-ошибкой —
  пустой коммит / Re-run failed jobs.
- **Бэкенд:** `/Users/egor/prognoz-functions` → GitHub Actions деплоит функции при push
  (~3 мин). Локальный `firebase deploy` НЕ использовать (корпсеть режет). Admin/onCall
  из CI — trigger-файлом `.github/triggers/*.json` `{"action":"fnName","payload":{}}`.
- **Firebase:** проект `prognoz-archive`, регион `europe-west1`. ⚠️ **В zsh писать
  `--project prognoz-archive` инлайн**, не через переменную (zsh не разбивает слова).
- **CDN self-hosted:** Firebase SDK 10.7.0 в `libs/` + import map (gstatic→/libs/) —
  корпсеть «Этажей» режет gstatic. **Импорт `assistant.js?v=N` версионирован** —
  бампать N при правках, иначе браузер держит старый ES-модуль (⌘⇧R не всегда сбрасывает).

---

## 3. Файлы фронта

| Файл | Кабинет / роль |
|---|---|
| `login.html` | Вход (Email OTP), петроль-тема |
| `auth-guard.js` | Защита + автороутинг: realtor→index, mop/rop/aup→senior |
| `index.html` | **Партнёр** — 5 табов: Главная/Прогноз/Тренер/Клиенты/Задачи |
| `senior.html` | **Руководитель** (МОП/РОП/АУП в одном файле, view group/department/company) |
| `assistant.js` | **Прогноша** — маскот-лиса + чат (см. §4) |
| `calendar.js` | Движок задач (перенесён из v1) |
| `tokens.css` | Дизайн-токены |
| `mascot/` | Слоты под рисованные картинки эмоций `fox-*.webp` (опц.) |

Кабинет партнёра читает `getDashboard({view:'partner'})`, руководитель — `group`/`department`/`company`.
Табы «Клиенты» — заглушка Coming Soon 01.09.2026. Задачи — list-view + модалка через `calendar.js`.

---

## 4. Ассистент «Прогноша» (`assistant.js` + `functions/prognosha.js`)

### Маскот — оранжевая лиса (SVG), эмоции по состоянию
Детальный самописный SVG (по референсу Егора): чёрные кончики ушей, кремовое нутро, зелёные
прищур-глаза, вздёрнутая бровь, ухмылка, намёк на белую грудь. Анимации (CSS keyframes):
дыхание, моргание, подёргивание ушей, игра бровью, искры (гордая), капелька (тревога).
Уважает `prefers-reduced-motion`.

**5 выражений** = «база + лицо по эмоции» (`FOX_BASE` + `FOX_FACE[emo]`, `foxSvg(emotion)`):
- `proud` (ИР ≥ 90% / серия хороших недель) · `happy` (норма 70–90%) · `cheer` (45–70%) ·
  `stern` (риск Н1–Н2) · `alarm` (Н3–Н4). Выбор — `pickFoxEmotion(d)` по `d.ir_v2.week` + `d.n_risk`.
- **Предпросмотр:** `?fox=stern` (proud/happy/cheer/alarm) в URL.
- Растровый вариант: положить `mascot/fox-<emo>.webp` и раскомментировать img-ветку в `foxHTML`.

### Чат — YandexGPT с гардом
Свободные вопросы → Cloud Function **`askPrognosha`** (`functions/prognosha.js`, onCall).
Бриф и кнопки-подсказки — **шаблонные** (`generateAnswer`, бесплатны). При недоступности ИИ —
тихий откат на шаблоны.

- **LLM:** YandexGPT (`lib/yandexgpt.js`, `gpt://{folder}/yandexgpt/latest`), секреты
  `YANDEX_API_KEY`+`YANDEX_FOLDER_ID` (живые, фолдер `b1gcv10n0di4eto543sv`, баланс есть).
  Цена ~1,2 ₽/1000 токенов; вызов только на «живой» вопрос (~1–1,5 ₽), не на заходы.
- **Гард:** системный промпт — «числа ТОЛЬКО из контекста, не выдумывай; нет данных —
  честно скажи». Персонаж — Прогноша (свой бэкенд не палит).
- **Контекст (`buildContext`)** — только по `auth.uid` (данные самого спрашивающего):
  профиль, ИР недели + разбивка c1..c4 + **недельный тренд**, **история ИР по месяцам**
  (`/ir_monthly`), вал/доход тек.мес (факт из `snapshot.revenue_total_month`, доход ×0.48),
  цель, **план месяца + нормы этапов** (`/plans/{code}` по `snapshot.plan_id`), **целевая
  зона** (имя из `/data_division/.../zones/{id}/basics`), **топ-5 задач** с заголовками.
  Кап контекста ~1800 символов.
- ⚠️ **Руководителям агрегат КОМАНДЫ пока НЕ передаётся** — ИИ видит только их личные цифры
  (открытый вопрос: добавлять ли командный контекст МОП/РОП).
- Фиксы внутри: разбивка `c1..c4` — это объекты `{total,buyer,seller}`, брать `.total`;
  `current_month.fact_income` бэк не пишет → доход = `revenue_total_month*0.48`.

---

## 5. MAX-бот «Мой прогноз» (`functions/maxBot.js`) — пилот работает

Ещё один «рот» общего бэка (утренний бриф, срочные сигналы, задачи с кнопкой ✓).
Экспорт: `maxWebhook`, `maxSendBrief` (08:00 МСК будни), `maxTestSend`, `maxRegisterWebhookAdmin`.

**Архитектура — webhook (НЕ long-polling / Cloud Run).** MAX Bot API телеграмоподобен:
- Регистрация — `POST https://platform-api2.max.ru/subscriptions` (токен в заголовке
  `Authorization`, НЕ query; тело `{url, update_types:[message_created,message_callback,
  bot_started], secret}`). Делает `maxRegisterWebhookAdmin` (зовётся trigger-файлом после деплоя).
  Исход — в `/config/max/last_register`.
- Приём — `maxWebhook` (onRequest, HTTPS 443), валидирует `X-Max-Bot-Api-Secret` против
  `/config/max/webhook_secret`.
- Отправка — `POST /messages?chat_id=…` (токен в заголовке, `format:'html'`, inline-кнопки).
- Меню команд бота — `PATCH /me`. Инлайн-кнопки под сообщениями + кнопка «▶️ Начать».
- Привязка: `/start` → код → OTP → `/integrations/max/{код}`. **OTP пока шлётся в чат
  (пилотное упрощение) — боевой = письмо на корпоративную почту (следующая задача).**

**⚠️ ГЛАВНЫЙ УРОК:** `platform-api2.max.ru` отдаёт TLS-сертификат Минцифры РФ →
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. Сертификаты (root+sub) лежат в `functions/certs/`,
НО **`undici` (глобальный fetch + dispatcher) их игнорировал**. Решение: нативный
`https.request` с явным `ca:[...tls.rootCertificates, root, sub]`. **Не возвращаться на
undici для вызовов MAX.** Секрет `MAX_BOT_TOKEN` (Егор светил токен в чате — перевыпустить).

---

## 6. Принципы и грабли

- Язык — русский, просто. Шаг за шагом: сделал → показал → «ок» → дальше.
- Не ломать работающее (авторизация/OTP). Перед деплоем функций — `node --check`.
- **zsh:** `--project prognoz-archive` инлайн, не через `$P`.
- **Кэш ES-модулей:** бампать `assistant.js?v=N` при правках `assistant.js`.
- **GitHub Pages** падает transient — пустой коммит / Re-run.
- **MAX/сертификат** — только нативный `https` (не undici). См. §5.
- **`/tasks` без `.indexOn: assignee_code`** — фильтр по партнёру качает всю ветку
  (~33 000). Кандидат на индекс (ускорит ассистента, getDashboard, MAX-бот).
- Секреты не печатать; значения не светить.

---

## 7. Открытые задачи (порядок с Егором)

1. **Боевой OTP на почту в MAX** — вместо кода-в-чат письмо через SMTP Hostia
   (переиспользовать `requestOtp`/`getTransport` из `functions/index.js`).
2. **Индекс `.indexOn: assignee_code` на `/tasks`** — ускорит три места.
3. **Google-календарь** (TZ-A37), **session-report** (TZ-A33).
4. Доводка `senior.html` под эталоны (`~/Downloads/*-cabinet.html`).
5. Опц.: командный контекст руководителям в Прогноше; YandexGPT Lite для простых вопросов;
   лимит вопросов/день; рисованные картинки маскота `mascot/fox-*.webp`.

Пакет ТЗ: `~/Downloads/prognoz-v2-dlya-koli.zip` (TZ-A35 Премиум, A36 MAX, A37 календарь,
A38 сводное; макеты `partner-hybrid.html` и др.).

---

## 8. Первоисточники

- **`/Users/egor/prognoz-dashboard/CLAUDE.md`** — общая бизнес-логика (ИР/план/вал/светофор,
  ночной цикл, архиватор v3.9, TZ-A26..A29). Главный источник по расчётам.
- `~/Downloads/PROGNOZ-HANDOFF-2026-07-08.md` — сводный handoff.
- `~/Downloads/PROGNOZ-DIALOG-*.md` — сырые диалоги (июнь, июль).
- auto-memory `~/.claude/projects/-Users-egor/memory/` (project-premium-v2, reference-max-bot и др.).
