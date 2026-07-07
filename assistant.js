/**
 * Ассистент «Прогноша» — плавающая кнопка + чат-шторка + бриф.
 * Работает с данными кабинета через переданный контекст.
 * На этапе 1 — все ответы шаблонные (без LLM).
 * LLM (YandexGPT) подключим на этапе 2 через существующий контур ИИ-тренера.
 */

let ctxData = null;
let opened = false;

const CSS = `
/* Прогноша — плавающая кнопка */
.prognosha-fab{
  position:fixed;bottom:20px;right:20px;z-index:100;
  width:60px;height:60px;border-radius:50%;
  background:linear-gradient(150deg,var(--petrol),var(--petrol-deep));
  border:none;color:#fff;cursor:pointer;font-size:26px;
  box-shadow:0 6px 20px rgba(12,84,96,.35);
  display:flex;align-items:center;justify-content:center;
  animation:pFabBob 2.4s ease-in-out infinite;
  transition:transform .18s;
}
.prognosha-fab:hover{transform:scale(1.08)}
.prognosha-fab .p-fox{width:44px;height:44px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))}
@keyframes pFabBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.prognosha-fab .dot{
  position:absolute;top:6px;right:6px;
  width:12px;height:12px;background:var(--gold);border-radius:50%;
  border:2px solid #fff;
}

/* Шторка */
.prognosha-sheet{
  position:fixed;bottom:0;right:0;z-index:110;
  width:min(420px,100vw);height:min(72vh,720px);
  background:var(--card);border-radius:16px 16px 0 0;
  box-shadow:0 -8px 40px rgba(0,0,0,.14);
  display:flex;flex-direction:column;
  transform:translateY(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);
}
.prognosha-sheet.on{transform:translateY(0)}
@media(min-width:640px){
  .prognosha-sheet{margin:0 20px 20px 0;border-radius:16px;height:min(70vh,680px)}
}

.p-head{
  background:linear-gradient(150deg,var(--petrol),var(--petrol-deep));
  color:#fff;padding:14px 16px;
  border-radius:16px 16px 0 0;
  display:flex;align-items:center;gap:10px;
}
.p-head .p-face{width:36px;height:36px;background:#FFF7EE;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:2px;box-sizing:border-box}
.p-head .p-face svg{width:100%;height:100%}
.p-head .p-title{flex:1;font-weight:800;font-size:14px}
.p-head .p-sub{font-size:11px;opacity:.7;font-weight:600}
.p-close{background:rgba(255,255,255,.12);border:none;color:#fff;font-size:16px;width:32px;height:32px;border-radius:8px;cursor:pointer}

.p-body{flex:1;overflow-y:auto;padding:14px}
.p-brief{
  background:var(--petrol-soft);
  border-radius:14px;padding:14px;
  font-size:13.5px;line-height:1.55;color:var(--ink);
  border:1px solid rgba(12,84,96,.12);
}
.p-brief b{color:var(--petrol)}
.p-brief-h{font-size:11px;font-weight:800;color:var(--petrol);text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px}

.p-suggests{margin-top:12px;display:flex;flex-direction:column;gap:6px}
.p-suggest{background:var(--card-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer;text-align:left;font-family:inherit;transition:.1s}
.p-suggest:hover{background:var(--petrol-soft);border-color:var(--petrol);color:var(--petrol)}

.p-msg{margin-top:12px}
.p-msg.user{text-align:right}
.p-msg .p-bubble{display:inline-block;max-width:82%;padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.5;text-align:left}
.p-msg.user .p-bubble{background:var(--petrol);color:#fff;border-bottom-right-radius:5px}
.p-msg.bot .p-bubble{background:var(--card-2);color:var(--ink);border-bottom-left-radius:5px;border:1px solid var(--line)}
.p-msg.bot .p-bubble b{color:var(--petrol)}
.p-msg.bot .p-bubble em{font-style:normal;background:var(--gold-soft);color:var(--gold);padding:1px 6px;border-radius:6px;font-weight:800;font-size:12px}

.p-foot{border-top:1px solid var(--line);padding:12px;display:flex;gap:8px;align-items:center;background:var(--card)}
.p-input{flex:1;border:1px solid var(--line);border-radius:22px;padding:9px 14px;font-family:inherit;font-size:13.5px;outline:none;transition:.15s;background:var(--card-2)}
.p-input:focus{border-color:var(--petrol);background:var(--card)}
.p-send{background:var(--petrol);color:#fff;border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
.p-send:disabled{opacity:.4;cursor:not-allowed}
.p-typing{font-size:12px;color:var(--muted);padding:4px 8px}
`;

// Маскот «Прогноша» — оранжевая лиса. Самописный SVG (корпсеть режет внешние картинки).
const FOX_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block">
  <!-- уши: внешние (тёмно-оранжевые) -->
  <path d="M13 31 L5 4 L31 19 Z" fill="#CF5C17"/>
  <path d="M51 31 L59 4 L33 19 Z" fill="#CF5C17"/>
  <!-- уши: внутренние (кремовые) -->
  <path d="M15 27 L10 11 L27 20 Z" fill="#FCE3C6"/>
  <path d="M49 27 L54 11 L37 20 Z" fill="#FCE3C6"/>
  <!-- голова -->
  <path d="M12 24 C12 16 20 12.5 32 12.5 C44 12.5 52 16 52 24 C52 39 44 51 32 55.5 C20 51 12 39 12 24 Z" fill="#F27D2A"/>
  <!-- лобная проточина (кремовая) -->
  <path d="M32 13 L26.5 31 L32 37 L37.5 31 Z" fill="#FCE3C6"/>
  <!-- белая мордочка/щёки -->
  <path d="M32 30 C24.5 30 18.5 33 15.5 41.5 C19.5 50 26 53.5 32 55.5 C38 53.5 44.5 50 48.5 41.5 C45.5 33 39.5 30 32 30 Z" fill="#FFF7EE"/>
  <!-- глаза -->
  <ellipse cx="24" cy="28.5" rx="3.1" ry="4" fill="#2C2117"/>
  <ellipse cx="40" cy="28.5" rx="3.1" ry="4" fill="#2C2117"/>
  <circle cx="25.2" cy="27" r="1.05" fill="#fff"/>
  <circle cx="41.2" cy="27" r="1.05" fill="#fff"/>
  <!-- нос -->
  <path d="M32 43.5 C29.4 43.5 27.8 41.8 27.8 40.2 C27.8 38.7 29.7 38.2 32 38.2 C34.3 38.2 36.2 38.7 36.2 40.2 C36.2 41.8 34.6 43.5 32 43.5 Z" fill="#2C2117"/>
  <!-- ротик -->
  <path d="M32 43.5 L32 45.4" stroke="#D79A6A" stroke-width="1.1" stroke-linecap="round"/>
  <path d="M32 45.4 C30 47.2 28 47.2 26.8 46" stroke="#D79A6A" stroke-width="1.1" stroke-linecap="round" fill="none"/>
  <path d="M32 45.4 C34 47.2 36 47.2 37.2 46" stroke="#D79A6A" stroke-width="1.1" stroke-linecap="round" fill="none"/>
</svg>`;

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

export function initAssistant(data) {
  injectCss();
  ctxData = data;
  if (document.getElementById('prognosha-fab')) return;

  const fab = document.createElement('button');
  fab.id = 'prognosha-fab';
  fab.className = 'prognosha-fab';
  fab.innerHTML = `<span class="p-fox">${FOX_SVG}</span><span class="dot"></span>`;
  fab.title = 'Прогноша · ваш ассистент';
  fab.onclick = () => toggleSheet();
  document.body.appendChild(fab);

  const sheet = document.createElement('div');
  sheet.id = 'prognosha-sheet';
  sheet.className = 'prognosha-sheet';
  sheet.innerHTML = `
    <div class="p-head">
      <div class="p-face">${FOX_SVG}</div>
      <div style="flex:1">
        <div class="p-title">Прогноша</div>
        <div class="p-sub">твой ассистент по продажам</div>
      </div>
      <button class="p-close" onclick="window.__pClose()">✕</button>
    </div>
    <div class="p-body" id="p-body"></div>
    <div class="p-foot">
      <input class="p-input" id="p-input" placeholder="Спроси Прогношу…" onkeydown="if(event.key==='Enter')window.__pSend()">
      <button class="p-send" id="p-send" onclick="window.__pSend()">↑</button>
    </div>
  `;
  document.body.appendChild(sheet);

  renderBrief();
}

function toggleSheet(open) {
  const sheet = document.getElementById('prognosha-sheet');
  const shouldOpen = open != null ? open : !opened;
  opened = shouldOpen;
  sheet.classList.toggle('on', shouldOpen);
  if (shouldOpen) setTimeout(() => document.getElementById('p-input').focus(), 300);
}
window.__pClose = () => toggleSheet(false);

function renderBrief() {
  const d = ctxData;
  if (!d) return;
  const u = d.user || {};
  const ir = (d.ir_v2 && d.ir_v2.week && d.ir_v2.week.ir_total) || 0;
  const fc = d.forecast || {};
  const cm = fc.current_month || {};
  const factRev = cm.fact_revenue || 0;
  const forecastRev = cm.forecast_revenue || 0;
  const tasksCounts = (d.tasks && d.tasks.counts) || {};

  // Бриф-шаблон (без LLM). Собирается из данных.
  let title = '';
  let body = '';
  if (ir >= 70 && (tasksCounts.expired || 0) === 0) {
    title = 'Отличный темп!';
    body = `ИР недели <em>${ir}%</em>. Просроченных задач нет. Продолжай в том же духе — до конца месяца по прогнозу заработаешь <b>${fmt(cm.revenue_total || (factRev+forecastRev))} ₽</b> вала.`;
  } else if ((tasksCounts.expired || 0) > 0) {
    title = 'Есть просрочки';
    body = `У тебя <b>${tasksCounts.expired}</b> просроченных задач. Разбери их сначала — это быстро закроет пробелы. ИР недели <em>${ir}%</em>.`;
  } else if (ir < 50) {
    title = 'Нужно поднажать';
    body = `ИР недели <em>${ir}%</em> — ниже нормы. Посмотри вкладку «Тренер» — там подсказки где именно проседает воронка.`;
  } else {
    title = 'Идёшь ровно';
    body = `ИР <em>${ir}%</em>. Сегодня задач на день: <b>${tasksCounts.today || 0}</b>, на неделю: <b>${tasksCounts.week || 0}</b>. Открой «Задачи» — начни с самой срочной.`;
  }

  const html = `
    <div class="p-brief">
      <div class="p-brief-h">☀️ ${title}</div>
      ${body}
    </div>
    <div class="p-suggests">
      <button class="p-suggest" onclick="window.__pAsk('Что сделать сегодня?')">📋 Что сделать сегодня?</button>
      <button class="p-suggest" onclick="window.__pAsk('Почему ИР такой?')">🎓 Почему ИР такой?</button>
      <button class="p-suggest" onclick="window.__pAsk('Про доход и вал')">💰 Про доход и вал</button>
      <button class="p-suggest" onclick="window.__pAsk('Как поднять доход?')">🎯 Как поднять доход?</button>
    </div>`;
  document.getElementById('p-body').innerHTML = html;
}

function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n/1e6).toFixed(1).replace('.',',') + ' млн';
  if (n >= 1e3) return Math.round(n/1e3) + 'к';
  return String(Math.round(n));
}
function esc(s) { return String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function addMsg(role, html) {
  const body = document.getElementById('p-body');
  const wrap = document.createElement('div');
  wrap.className = 'p-msg ' + role;
  wrap.innerHTML = `<div class="p-bubble">${html}</div>`;
  body.appendChild(wrap);
  body.scrollTop = body.scrollHeight;
}

window.__pAsk = (q) => {
  addMsg('user', esc(q));
  setTimeout(() => {
    const answer = generateAnswer(q);
    addMsg('bot', answer);
  }, 350);
};

window.__pSend = () => {
  const input = document.getElementById('p-input');
  const q = (input.value || '').trim();
  if (!q) return;
  input.value = '';
  window.__pAsk(q);
};

/**
 * Шаблонная генерация ответов на этапе 1.
 * По ключевым словам вопроса → выбираем шаблон и подставляем данные пользователя.
 * НЕ ПРИДУМЫВАЕМ ЧИСЛА — если нет данных, честно говорим.
 * На этапе 2 заменим на YandexGPT с тем же контекстом.
 */
function generateAnswer(q) {
  const d = ctxData;
  if (!d) return 'Данных пока нет — попробуй перезагрузить кабинет.';
  const ql = q.toLowerCase();
  const u = d.user || {};
  const ir = (d.ir_v2 && d.ir_v2.week);
  const fc = d.forecast || {};
  const cm = fc.current_month || {};
  const goal = d.goal || {};
  const tasks = d.tasks || {};
  const counts = tasks.counts || {};

  // Что сделать сегодня
  if (/сегодня|день|срочн|задач/.test(ql)) {
    const todayCount = counts.today || 0;
    const expiredCount = counts.expired || 0;
    if (expiredCount > 0) {
      return `Сначала разбери <b>${expiredCount}</b> просроченных — там уже пропущенные дедлайны. Потом ${todayCount} задач на сегодня. Открой вкладку <b>«Задачи»</b>, фильтр «⚠ Просрочено».`;
    }
    if (todayCount > 0) {
      return `На сегодня <b>${todayCount}</b> задач. Открой вкладку <b>«Задачи»</b> — там список с приоритетами.`;
    }
    return `На сегодня задач нет. Может, есть время подтянуть слабое место? Посмотри вкладку <b>«Тренер»</b>.`;
  }

  // ИР
  if (/ир|индекс|развит/.test(ql)) {
    if (!ir) return 'Индекс развития ещё не рассчитан на этой неделе.';
    const b = ir.breakdown || {};
    const c1 = (b.c1 && b.c1.total) ?? 0;
    const c2 = (b.c2 && b.c2.total) ?? 0;
    const c3 = (b.c3 && b.c3.total) ?? 0;
    const c4 = (b.c4 && b.c4.total) ?? 0;
    const parts = [
      { name: 'поток', v: c1 },
      { name: 'горячие', v: c2 },
      { name: 'задатки', v: c3 },
      { name: 'вал', v: c4 },
    ];
    const weakest = parts.sort((a, b) => a.v - b.v)[0];
    return `Твой ИР недели — <em>${ir.ir_total}%</em>. Он состоит из 4 частей поровну: поток <b>${c1}%</b> · горячие <b>${c2}%</b> · задатки <b>${c3}%</b> · вал <b>${c4}%</b>.<br><br>Самое слабое — <b>${weakest.name}</b> (${weakest.v}%). Открой вкладку <b>«Тренер»</b> — там подсказки как поднять именно это.`;
  }

  // Доход и вал
  if (/доход|вал|деньг|зп|заработ/.test(ql)) {
    const factRev = cm.fact_revenue || 0;
    const forecastRev = cm.forecast_revenue || 0;
    const totalRev = cm.revenue_total || (factRev + forecastRev);
    const income = cm.fact_income || 0;
    return `<b>Вал</b> — это оборот твоих сделок (комиссия агентства). По нему считаются план и ИР.<br><br><b>Доход</b> — твоя ЗП. Это ≈ <em>48%</em> от вала.<br><br>За текущий месяц: вал факт <b>${fmt(factRev)} ₽</b>${forecastRev > 0 ? `, прогноз-остаток <b>+${fmt(forecastRev)}</b> → итого <b>${fmt(totalRev)} ₽</b>` : ''}. Доход факт: <b>${fmt(income)} ₽</b>.`;
  }

  // Как поднять доход / что делать
  if (/поднять|подним|улучш|как расти|что делать|расти/.test(ql)) {
    if (!ir) return 'Смотри вкладку «Прогноз» — там график цикла и путь к цели. Дальше «Тренер» — конкретные слабые места.';
    const b = ir.breakdown || {};
    const parts = [
      { name: 'потока (входящих клиентов)', v: (b.c1 && b.c1.total) ?? 0, action: 'Проверь, что все лиды принимаются в течение часа. Триггер «холодный клиент» разбирай тем же днём.' },
      { name: 'горячих клиентов', v: (b.c2 && b.c2.total) ?? 0, action: 'Из тёплых клиентов должны появляться горячие. Смотри касания раз в 3 дня минимум.' },
      { name: 'задатков', v: (b.c3 && b.c3.total) ?? 0, action: 'Готовь клиента к внесению задатка заранее — показывай ЖК, обсуждай ипотеку, снимай страхи.' },
      { name: 'вала (закрытых сделок)', v: (b.c4 && b.c4.total) ?? 0, action: 'Задатки должны доходить до сделки. Проверь, что нет клиентов зависших на этапе задатка > 1 мес.' },
    ];
    const weakest = parts.sort((a, b) => a.v - b.v)[0];
    return `Самое слабое место — <b>${weakest.name}</b> (${weakest.v}%). <br><br>${weakest.action}<br><br>Подробнее — во вкладке <b>«Тренер»</b>, там разбор по каждому этапу.`;
  }

  // Цель
  if (/цель|target|план/.test(ql)) {
    if (!goal || !goal.target_revenue_month) return 'Цель пока не установлена. Открой вкладку «Прогноз» — там можно поставить.';
    const inc = u.income_month || 0;
    const tgt = goal.target_revenue_month || 0;
    const pct = tgt > 0 ? Math.round(inc/tgt*100) : 0;
    return `Твоя текущая цель по доходу — <b>${fmt(tgt)} ₽</b> в месяц. Средний за 12 мес: <em>${fmt(inc)} ₽</em> (${pct}% цели).<br><br>${pct >= 90 ? 'Отлично идёшь!' : pct >= 60 ? 'Держишь темп. Ещё чуть-чуть.' : 'Нужно подтянуть — открой «Прогноз» → «Как я иду к цели», там видно куда движешься.'}`;
  }

  // Дефолт
  return `Я пока только учусь отвечать. Могу рассказать про <b>ИР</b>, <b>доход и вал</b>, <b>задачи</b>, <b>цель</b>. На этапе 2 подключим полноценный ИИ — тогда смогу отвечать на любые вопросы про твою работу.<br><br>А пока попробуй одну из подсказок выше.`;
}
