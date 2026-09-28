import { checkPlan, confirmPlan, planLeft, minNeedCost, savedThisWeek } from '../game.js'
import { header, money, progress, ask, showResult, changeRow } from '../ui.js'
import { play } from '../sound.js'
import { nextStep, opsList } from './common.js'

const KINDS = ['need', 'want', 'save']

function stackBar(wallet, plan) {
  const part = (kind) => (wallet > 0 ? (plan[kind] / wallet) * 100 : 0)
  return `
    <div class="stack-bar" aria-hidden="true">
      ${KINDS.map((k) => `<div class="seg-${k}" style="width:${part(k)}%"></div>`).join('')}
    </div>`
}

function editor(app) {
  const s = app.state
  const { rules, shop } = app.content
  const draft = s.week.draft
  const left = planLeft(s, draft)
  const step = rules.planStep

  const row = (kind) => {
    const c = rules.categories[kind]
    return `
      <div class="plan-row cat-${kind}">
        <div class="row">
          <div class="grow"><b>${c.icon} ${c.name}</b><span class="small muted">${c.hint}</span></div>
          <span class="plan-val" id="val-${kind}">${draft[kind]}</span>
        </div>
        <input type="range" class="slider slider-${kind}" min="0" max="${s.wallet}" step="${step}" value="${draft[kind]}"
          data-input="plan" data-kind="${kind}" aria-label="${c.name}: сколько монеток">
      </div>`
  }
  return `
    <p class="lead">В кошельке ${money(s.wallet)}. Двигай ползунки и раздели монетки на три части.</p>
    <p class="tip">📋 План – это правило на неделю. В магазине тратишь не больше, чем отложил на «Нужное» и «Хочу», а в копилку кладёшь столько, сколько запланировал. Если выйти за план, приложение предупредит, а в итогах недели не будет ⭐ «Траты по плану».</p>
    ${KINDS.map(row).join('')}
    <div id="plan-bar">${stackBar(s.wallet, draft)}</div>
    <p class="left-line" id="plan-left">Осталось распределить: <b>${left}</b>${left === 0 ? ' ✔' : ''}</p>
    <p class="small muted">На нужное нужно минимум ${minNeedCost(shop)}: самая дешёвая еда и самый дешёвый уход.</p>
    <button class="btn ghost" data-action="hint">💡 Как обычно делят монетки?</button>
    <button class="btn primary big" data-action="confirm">Утвердить план</button>
    <p class="small muted center">Пока план не утверждён, его можно менять сколько угодно.</p>`
}

function factView(app) {
  const s = app.state
  const w = s.week
  const { rules } = app.content
  const fact = { need: w.spent.need, want: w.spent.want, save: savedThisWeek(w) }

  const row = (kind) => {
    const c = rules.categories[kind]
    const planned = w.plan[kind]
    const done = fact[kind]
    let status
    if (kind === 'save') {
      status = done >= planned ? '✔ отложено по плану' : `○ ещё отложить ${planned - done}`
    } else {
      status = done <= planned ? `✔ в рамках плана, осталось ${planned - done}` : `⚠ больше плана на ${done - planned}`
    }
    const over = kind !== 'save' && done > planned
    return `
      <div class="fact-row cat-${kind}">
        <div class="row"><b class="grow">${c.icon} ${c.name}</b><span>факт ${done} · план ${planned}</span></div>
        ${progress(done, Math.max(planned, done, 1), { cls: kind, label: c.name })}
        <span class="small ${over ? 'warn' : ''}">${status}</span>
      </div>`
  }

  return `
    <p class="lead">План утверждён. Здесь видно, сколько уже потрачено и отложено.</p>
    ${KINDS.map(row).join('')}
    <p class="tip">👉 ${nextStep(s)}</p>
    <div class="row gap">
      <button class="btn secondary grow" data-action="go" data-to="shop">🛒 Магазин</button>
      <button class="btn secondary grow" data-action="go" data-to="savings">🐷 Копилка</button>
    </div>
    <h2>История недели</h2>
    ${opsList(w.ops)}`
}

function onSlide(app, value, el) {
  const s = app.state
  const draft = s.week.draft
  const kind = el.dataset.kind
  const others = KINDS.filter((k) => k !== kind).reduce((sum, k) => sum + draft[k], 0)
  const v = Math.min(Number(value), s.wallet - others)
  if (v !== Number(value)) el.value = v
  draft[kind] = v
  app.save()

  const left = planLeft(s, draft)
  document.getElementById(`val-${kind}`).textContent = v
  document.getElementById('plan-left').innerHTML = `Осталось распределить: <b>${left}</b>${left === 0 ? ' ✔' : ''}`
  document.getElementById('plan-bar').innerHTML = stackBar(s.wallet, draft)
}

export default {
  inputs: {
    plan: onSlide,
  },

  render(app) {
    const w = app.state.week
    return `
      <main class="screen">
        ${header(`План на неделю ${w.n}`)}
        ${w.phase === 'plan' ? editor(app) : factView(app)}
      </main>`
  },

  actions: {
    hint() {
      showResult({
        icon: '💡',
        title: 'Как обычно делят монетки',
        text: 'Сначала оставляют на нужное – еду и уход. Потом кладут немного в копилку: даже 10–20 монеток каждую неделю приближают мечту. Остальное – на «хочу». Точных правил нет: план – это твоё решение.',
      })
    },
    async confirm(app) {
      const s = app.state
      const { rules, shop } = app.content
      const draft = s.week.draft
      const res = checkPlan(s, draft, shop)
      if (!res.ok) {
        showResult({ icon: '✋', title: 'Так не получится', text: res.error })
        return
      }
      const left = planLeft(s, draft)
      let body = `<div class="changes">${KINDS.map((k) => changeRow(`${rules.categories[k].icon} ${rules.categories[k].name}`, draft[k], draft[k])).join('')}</div>`
      body += res.warnings.map((text) => `<p class="warn">⚠ ${text}</p>`).join('')
      if (left > 0) body += `<p>${left} останутся в кошельке про запас.</p>`

      const ok = await ask({ title: 'Утвердить план?', body, yes: 'Утвердить', no: 'Изменить' })
      if (!ok) return
      confirmPlan(s, draft, shop)
      app.commit()
      play('ok')
      showResult({
        icon: '✅',
        title: 'План утверждён!',
        text: 'Теперь в магазине у каждой категории свой лимит – сколько запланировано. Тратить больше можно, но приложение предупредит, и ⭐ «Траты по плану» не будет. В конце недели сравним план с тем, что получилось.',
        tip: nextStep(s),
        buttons: '<button class="btn primary" data-action="go" data-to="shop">В магазин</button>',
      })
    },
  },
}
