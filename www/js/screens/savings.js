import {
  deposit, withdraw, withdrawPreview, findGoal, allGoals, goalProgress, chooseGoal, addCustomGoal,
  reachGoal, isGoalDone, savedThisWeek,
} from '../game.js'
import { header, money, progress, openSheet, updateSheet, closeSheet, showResult, changeRow, ask, toast } from '../ui.js'
import { esc, weeksText } from '../format.js'
import { play } from '../sound.js'
import { statRows } from './common.js'

let takeAmount = 5
let custom = null

function etaText(p) {
  if (p.remaining === 0) return 'Монеток уже хватает – мечту можно исполнить!'
  if (p.weeks === null) return 'Срок посчитаем, когда в копилке появятся пополнения.'
  return `Если откладывать как обычно – в среднем ${p.avg} в неделю, – понадобится ещё примерно ${weeksText(p.weeks)}.`
}

function goalBlock(app) {
  const s = app.state
  const goal = findGoal(s, app.content.goals)
  if (!goal) {
    return `<section class="card attention"><p>🎯 Цель не выбрана. Выбери её в списке ниже – так понятнее, зачем копить.</p></section>`
  }
  const p = goalProgress(s, goal)
  return `
    <section class="card goal-big">
      <div class="row"><span class="big-icon" aria-hidden="true">${goal.icon}</span>
        <div class="grow"><span class="small muted">Текущая цель</span><h2>${esc(goal.name)}</h2></div>
        ${money(goal.price)}
      </div>
      ${progress(p.saved, goal.price, { cls: 'save thick', label: 'Прогресс цели' })}
      <div class="goal-nums">
        <span>Накоплено <b>${p.saved}</b></span>
        <span>Цена <b>${goal.price}</b></span>
        <span>Осталось <b>${p.remaining}</b></span>
      </div>
      <p class="small">${etaText(p)}</p>
      ${p.remaining === 0 ? `<button class="btn primary big" data-action="reach" data-id="${goal.id}">🎉 Исполнить мечту!</button>` : ''}
    </section>`
}

function depositBlock(app) {
  const s = app.state
  const w = s.week
  if (w.phase !== 'active') {
    return `<section class="card"><p>Пополнять копилку можно после того, как готов план на неделю.</p>
      <button class="btn primary" data-action="go" data-to="plan">Составить план</button></section>`
  }
  const byPlan = w.plan.save - savedThisWeek(w)
  const btn = (amount, label) =>
    `<button class="btn secondary" data-action="deposit" data-amount="${amount}" ${amount > s.wallet || amount <= 0 ? 'disabled' : ''}>${label}</button>`
  return `
    <section class="card">
      <h2>Положить в копилку</h2>
      <p class="small muted">В кошельке ${s.wallet}. ${byPlan > 0 ? `По плану на этой неделе ещё ${byPlan}.` : 'План по копилке на эту неделю выполнен.'}</p>
      <div class="btn-grid">
        ${btn(5, '+5')}${btn(10, '+10')}${btn(20, '+20')}
        ${byPlan > 0 ? btn(byPlan, `+${byPlan} по плану`) : ''}
      </div>
    </section>`
}

function goalsList(app) {
  const s = app.state
  return allGoals(s, app.content.goals)
    .map((g) => {
      let right
      if (isGoalDone(s, g.id)) right = '<span class="mark ok">✔ исполнена</span>'
      else if (s.goal === g.id) right = '<span class="mark">выбрана</span>'
      else right = `<button class="btn small-btn" data-action="choose" data-id="${g.id}">Выбрать</button>`
      return `
        <div class="card item-card">
          <span class="item-icon" aria-hidden="true">${g.icon}</span>
          <div class="grow"><b>${esc(g.name)}</b><div class="small muted">${g.text ? esc(g.text) + ' · ' : ''}цена ${g.price}</div></div>
          ${right}
        </div>`
    })
    .join('')
}

function takeSheetHtml(app) {
  const s = app.state
  const goal = findGoal(s, app.content.goals)
  const step = app.content.rules.planStep
  let rows = changeRow('Копилка', s.savings, s.savings - takeAmount) + changeRow('Кошелёк', s.wallet, s.wallet + takeAmount)
  if (goal) {
    const p = withdrawPreview(s, goal, takeAmount)
    rows += changeRow('До цели осталось', p.remainingBefore, p.remainingAfter)
    if (p.weeksBefore !== null && p.weeksAfter !== null) {
      rows += changeRow('Срок до цели, недель', p.weeksBefore, p.weeksAfter)
    }
  }
  return `
    <div class="sheet-icon" aria-hidden="true">🐷</div>
    <h2>Взять из копилки?</h2>
    <p>Сколько взять:</p>
    <div class="stepper">
      <button class="round-btn" data-action="take-dec" ${takeAmount <= step ? 'disabled' : ''} aria-label="Меньше">−</button>
      <span class="plan-val">${takeAmount}</span>
      <button class="round-btn" data-action="take-inc" ${takeAmount + step > s.savings ? 'disabled' : ''} aria-label="Больше">+</button>
    </div>
    <div class="changes">${rows}</div>
    <p class="small">Монетки из копилки лучше брать только на нужное. Мечта от этого отодвинется.</p>
    <div class="sheet-actions">
      <button class="btn danger" data-action="take-confirm">Да, взять ${takeAmount}</button>
      <button class="btn ghost" data-action="close-sheet">Не надо</button>
    </div>`
}

function customSheetHtml(app) {
  const { icons, prices } = app.content.goals.custom
  return `
    <h2>Своя цель</h2>
    <label class="label" for="goal-name">Как назовём?</label>
    <input id="goal-name" class="field" data-input="goal-name" maxlength="20" autocomplete="off" value="${esc(custom.name)}" placeholder="Например, Мяч для питомца">
    <p class="label">Картинка</p>
    <div class="chips">${icons.map((i) => `<button class="chip icon-chip ${custom.icon === i ? 'on' : ''}" data-action="custom-icon" data-value="${i}" aria-pressed="${custom.icon === i}">${i}</button>`).join('')}</div>
    <p class="label">Сколько стоит</p>
    <div class="chips">${prices.map((p) => `<button class="chip ${custom.price === p ? 'on' : ''}" data-action="custom-price" data-value="${p}" aria-pressed="${custom.price === p}">${p}</button>`).join('')}</div>
    <div class="sheet-actions">
      <button class="btn primary" data-action="custom-save">Сохранить цель</button>
      <button class="btn ghost" data-action="close-sheet">Отмена</button>
    </div>`
}

export default {
  render(app) {
    const s = app.state
    return `
      <main class="screen">
        ${header('Копилка', { extra: `<span class="bar-money">🐷 ${s.savings}</span>` })}
        ${goalBlock(app)}
        ${depositBlock(app)}
        <button class="btn ghost" data-action="take" ${s.savings === 0 ? 'disabled' : ''}>Взять из копилки</button>
        <h2>Цели</h2>
        <p class="small muted">Монетки в копилке общие: если сменить цель, они пойдут на новую.</p>
        ${goalsList(app)}
        <button class="btn secondary" data-action="custom">＋ Своя цель</button>
      </main>`
  },

  inputs: {
    'goal-name': (app, value) => { custom.name = value },
  },

  actions: {
    deposit(app, data) {
      const s = app.state
      const { rules, goals } = app.content
      const amount = Number(data.amount)
      const goal = findGoal(s, goals)
      const before = { wallet: s.wallet, savings: s.savings, stats: { ...s.stats }, left: goal ? goalProgress(s, goal).remaining : 0 }
      const res = deposit(s, amount, rules)
      if (!res.ok) {
        toast('Столько в кошельке нет')
        return
      }
      app.commit()
      play('coin')
      let rows = changeRow('Кошелёк', before.wallet, s.wallet) + changeRow('Копилка', before.savings, s.savings)
      if (goal) rows += changeRow('До цели осталось', before.left, goalProgress(s, goal).remaining)
      rows += statRows(rules, before.stats, s.stats)
      showResult({
        icon: '🐷',
        title: `+${amount} в копилку`,
        rows,
        text: res.joy > 0 ? 'Питомец радуется: копить на мечту – здорово!' : '',
        tip: goal ? etaText(goalProgress(s, goal)) : 'Выбери цель – так будет видно, сколько осталось.',
      })
    },

    take(app) {
      takeAmount = Math.min(app.content.rules.planStep, app.state.savings)
      openSheet(takeSheetHtml(app))
    },
    'take-inc'(app) {
      takeAmount = Math.min(app.state.savings, takeAmount + app.content.rules.planStep)
      updateSheet(takeSheetHtml(app))
    },
    'take-dec'(app) {
      takeAmount = Math.max(app.content.rules.planStep, takeAmount - app.content.rules.planStep)
      updateSheet(takeSheetHtml(app))
    },
    'take-confirm'(app) {
      const s = app.state
      const before = s.savings
      if (!withdraw(s, takeAmount).ok) return
      closeSheet()
      app.commit()
      showResult({
        icon: '↩️',
        title: `Из копилки взято ${takeAmount}`,
        rows: changeRow('Копилка', before, s.savings) + changeRow('Кошелёк', s.wallet - takeAmount, s.wallet),
        tip: 'Чтобы догнать цель, можно отложить побольше на следующей неделе.',
      })
    },

    choose(app, data) {
      chooseGoal(app.state, data.id)
      app.commit()
      toast('Цель выбрана!')
    },

    custom(app) {
      const { icons, prices } = app.content.goals.custom
      custom = { name: '', icon: icons[0], price: prices[1] }
      openSheet(customSheetHtml(app))
    },
    'custom-icon'(app, data) {
      custom.icon = data.value
      updateSheet(customSheetHtml(app))
    },
    'custom-price'(app, data) {
      custom.price = Number(data.value)
      updateSheet(customSheetHtml(app))
    },
    'custom-save'(app) {
      addCustomGoal(app.state, custom)
      closeSheet()
      app.commit()
      toast('Новая цель выбрана')
    },

    async reach(app, data) {
      const s = app.state
      const { rules, goals } = app.content
      const goal = findGoal(s, goals, data.id)
      const ok = await ask({
        title: `Исполнить мечту «${goal.name}»?`,
        body: `<div class="changes">${changeRow('Копилка', s.savings, s.savings - goal.price)}</div>`,
        yes: 'Да!',
        no: 'Пока нет',
      })
      if (!ok) return
      const before = { savings: s.savings, stats: { ...s.stats } }
      reachGoal(s, goal, rules)
      app.commit()
      play('grow')
      showResult({
        icon: goal.icon,
        title: 'Мечта сбылась!',
        rows: changeRow('Копилка', before.savings, s.savings) + statRows(rules, before.stats, s.stats),
        text: 'Всё получилось, потому что монетки откладывались понемногу, но регулярно.',
        tip: 'Выбери новую цель – копилка ждёт.',
      })
    },
  },
}
