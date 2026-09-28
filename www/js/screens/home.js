import { findGoal, goalProgress, nextTask, canFinishWeek, finishWeek, savedThisWeek, stageIndex, petMood, unreadChats } from '../game.js'
import { money, progress, ask, openSheet, showResult } from '../ui.js'
import { esc } from '../format.js'
import { play } from '../sound.js'
import { currentPet, moodTitle, petSays, nextStep, stageName, petProblems } from './common.js'

const nav = [
  ['plan', '📋', 'План'],
  ['shop', '🛒', 'Магазин'],
  ['tasks', '⭐', 'Задания'],
  ['savings', '🐷', 'Копилка'],
  ['progress', '📈', 'Прогресс'],
  ['adult', '👪', 'Взрослым'],
]

function statBars(app) {
  const { rules } = app.content
  const stats = app.state.stats
  return Object.keys(rules.stats)
    .map((k) => `
      <div class="stat">
        <span class="stat-name">${rules.stats[k].icon} ${rules.stats[k].name}</span>
        ${progress(stats[k], 100, { cls: `stat-${k}`, label: rules.stats[k].name })}
        <span class="stat-val">${stats[k]}</span>
      </div>`)
    .join('')
}

function goalCard(app) {
  const s = app.state
  const goal = findGoal(s, app.content.goals)
  if (!goal) {
    return `
      <button class="card link-card" data-action="go" data-to="savings">
        <span class="big-icon" aria-hidden="true">🎯</span>
        <span class="grow"><b>Цель не выбрана</b><span class="small muted">Выбери, на что копить</span></span>
        <span class="chev" aria-hidden="true">›</span>
      </button>`
  }
  const p = goalProgress(s, goal)
  return `
    <button class="card link-card" data-action="go" data-to="savings">
      <span class="big-icon" aria-hidden="true">${goal.icon}</span>
      <span class="grow">
        <b>Цель: ${esc(goal.name)}</b>
        ${progress(p.saved, goal.price, { cls: 'save', label: 'Сколько накоплено на цель' })}
        <span class="small muted">${p.saved} из ${goal.price} · осталось ${p.remaining}</span>
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </button>`
}

function weekCard(app) {
  const s = app.state
  const w = s.week
  const { categories } = app.content.rules
  if (w.phase === 'plan') {
    return `
      <section class="card week-card attention">
        <h2>📋 Неделя ${w.n}: сначала план</h2>
        <p>В кошельке ${money(s.wallet)}. Реши, сколько на нужное, на «хочу» и в копилку.</p>
        <button class="btn primary" data-action="go" data-to="plan">Составить план</button>
      </section>`
  }
  const need = (key, label) => `<li class="${w.bought[key] ? 'done' : ''}">${w.bought[key] ? '✔' : '○'} ${label}: ${w.bought[key] ? 'куплено' : 'нужно купить'}</li>`
  return `
    <section class="card week-card">
      <h2>📋 Неделя ${w.n}</h2>
      <ul class="checklist">${need('food', '🥣 Еда')}${need('care', '🛁 Уход')}</ul>
      <div class="plan-mini" aria-label="Потрачено и отложено из плана">
        <span class="${w.spent.need > w.plan.need ? 'warn' : ''}">${categories.need.icon} ${categories.need.name}: ${w.spent.need} из ${w.plan.need}${w.spent.need > w.plan.need ? ' ⚠' : ''}</span>
        <span class="${w.spent.want > w.plan.want ? 'warn' : ''}">${categories.want.icon} ${categories.want.name}: ${w.spent.want} из ${w.plan.want}${w.spent.want > w.plan.want ? ' ⚠' : ''}</span>
        <span>${categories.save.icon} ${categories.save.name}: ${savedThisWeek(w)} из ${w.plan.save}</span>
      </div>
      <p class="tip">👉 ${nextStep(s)}</p>
      <button class="btn secondary" data-action="finish-week">Завершить неделю</button>
    </section>`
}

function messageCard(app) {
  const { chats, contacts } = app.content.chats
  const unread = unreadChats(app.state, chats)
  if (!unread.length) return ''
  const who = contacts[unread[0].contact]
  return `
    <button class="card link-card" data-action="go" data-to="chat" data-id="${unread[0].id}">
      <span class="avatar" aria-hidden="true">${who.avatar}</span>
      <span class="grow"><span class="small muted">📱 Новое сообщение</span><b>${esc(who.name)}</b></span>
      ${unread.length > 1 ? `<span class="reward">ещё ${unread.length - 1}</span>` : ''}
      <span class="chev" aria-hidden="true">›</span>
    </button>`
}

function helpCard(app) {
  const problems = petProblems(app.state, app.content.rules)
  if (!problems.length) return ''
  return `
    <section class="card help-card">
      <h2>😢 Питомцу нужна помощь</h2>
      <ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul>
      <p class="small">Пока питомец голодный или грязный, игрушки радуют его вдвое меньше. Сначала нужное!</p>
      <button class="btn primary" data-action="go" data-to="shop">🛒 В магазин</button>
    </section>`
}

function taskCard(app) {
  const { tasks, topics } = app.content.tasks
  const t = nextTask(app.state, tasks)
  if (!t) {
    const later = app.state.demo ? '' : ' Новые откроются на следующей неделе.'
    return `<section class="card"><p>⭐ Все открытые задания выполнены!${later}</p></section>`
  }
  const topic = topics[t.topic]
  return `
    <button class="card link-card" data-action="go" data-to="task" data-id="${t.id}">
      <span class="big-icon" aria-hidden="true">${topic.icon}</span>
      <span class="grow"><span class="small muted">Задание · ${topic.name}</span><b>${t.title}</b></span>
      <span class="reward">+${t.reward}</span>
    </button>`
}

export default {
  render(app) {
    const s = app.state
    const { rules } = app.content
    const mood = petMood(s.stats)
    const stage = rules.stages[stageIndex(s.stars, rules.stages)]
    const unread = unreadChats(s, app.content.chats.chats).length
    return `
      <main class="screen home">
        <header class="bar">
          <div class="grow">
            <b>Неделя ${s.week.n}</b>
            ${s.demo ? '<span class="small"><span class="badge">ДЕМО</span></span>' : ''}
          </div>
          <button class="icon-btn phone-btn" data-action="go" data-to="phone" aria-label="Телефон, новых сообщений: ${unread}">📱${unread ? `<span class="dot">${unread}</span>` : ''}</button>
          <button class="icon-btn" data-action="help" aria-label="Как играть">?</button>
          <button class="icon-btn" data-action="go" data-to="settings" aria-label="Настройки">⚙</button>
        </header>

        <section class="card pet-card">
          <button class="pet-btn" data-action="pet" aria-label="Питомец ${esc(s.pet.name)}. Нажми, чтобы узнать больше">${currentPet(app, 140)}</button>
          <div class="pet-info">
            <h2>${esc(s.pet.name)} <span class="stage-tag">${stageName(stage, s.pet)}</span></h2>
            <p class="mood">${moodTitle[mood]}</p>
            ${statBars(app)}
          </div>
          <p class="bubble">${petSays(s.stats, s.pet)}</p>
        </section>

        ${helpCard(app)}

        <div class="money-row">
          <button class="card money-card" data-action="go" data-to="shop">
            <span class="small muted">Кошелёк</span>${money(s.wallet, 'big')}
          </button>
          <button class="card money-card" data-action="go" data-to="savings">
            <span class="small muted">Копилка</span>${money(s.savings, 'big')}
          </button>
        </div>

        ${goalCard(app)}
        ${weekCard(app)}
        ${messageCard(app)}
        ${taskCard(app)}

        <nav class="grid-nav" aria-label="Разделы">
          ${nav.map(([to, icon, label]) => `<button class="nav-btn" data-action="go" data-to="${to}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}
        </nav>
      </main>`
  },

  actions: {
    pet(app) {
      const s = app.state
      const { rules } = app.content
      openSheet(`
        <div class="center">${currentPet(app, 180)}</div>
        <h2>${esc(s.pet.name)}: ${moodTitle[petMood(s.stats)]}</h2>
        <p class="bubble">${petSays(s.stats, s.pet)}</p>
        <p class="small">Настроение зависит от трёх вещей: ${Object.values(rules.stats).map((x) => `${x.icon} ${x.name.toLowerCase()}`).join(', ')}. Еда и уход покупаются в «Нужном», игрушки – в «Хочу». За неделю показатели немного снижаются – как у настоящего питомца.</p>
        <div class="sheet-actions">
          <button class="btn primary" data-action="edit-pet">Изменить внешний вид</button>
          <button class="btn ghost" data-action="close-sheet">Закрыть</button>
        </div>`)
    },

    'edit-pet'(app) {
      app.go('create', { edit: true })
    },

    async 'finish-week'(app) {
      const s = app.state
      const can = canFinishWeek(s)
      if (!can.ok) {
        showResult({
          icon: '📋',
          title: 'Сначала план',
          text: 'Неделю можно завершить, когда план на неё утверждён.',
          buttons: '<button class="btn primary" data-action="go" data-to="plan">Составить план</button>',
        })
        return
      }
      const w = s.week
      const notes = []
      if (!w.bought.food) notes.push('еда ещё не куплена – питомец проголодается')
      if (!w.bought.care) notes.push('уход ещё не куплен')
      const planSave = w.plan.save - savedThisWeek(w)
      if (planSave > 0) notes.push(`в копилку по плану осталось отложить ${planSave}`)
      const body = notes.length
        ? `<p>Проверь перед концом недели:</p><ul>${notes.map((n) => `<li>${n}</li>`).join('')}</ul>`
        : '<p>Всё нужное сделано. Посмотрим итоги?</p>'
      const ok = await ask({ title: `Завершить неделю ${w.n}?`, body, yes: 'Завершить', no: notes.length ? 'Ещё не всё' : 'Подождать' })
      if (!ok) return

      const res = finishWeek(s, app.content.rules)
      app.save()
      play(res.summary.stageAfter > res.summary.stageBefore ? 'grow' : 'ok')
      app.go('summary', { index: s.history.length - 1, fresh: true })
    },
  },
}
