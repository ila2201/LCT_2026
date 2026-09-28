import { buy, postpone, purchaseInfo, isOwned, itemEffect } from '../game.js'
import { header, money, progress, openSheet, closeSheet, showResult, changeRow, toast } from '../ui.js'
import { esc } from '../format.js'
import { play } from '../sound.js'
import { catBadge, effectText, statRows, nextStep, petSays } from './common.js'

const findItem = (app, id) => app.content.shop.find((i) => i.id === id)

function itemCard(app, item) {
  const s = app.state
  const { rules } = app.content
  const owned = isOwned(s, item)
  const info = purchaseInfo(s, item)
  const overPlan = s.week.phase === 'active' && !owned && info.overPlan > 0
  return `
    <div class="card item-card">
      <span class="item-icon" aria-hidden="true">${item.icon}</span>
      <div class="grow">
        <b>${esc(item.name)}</b>
        <div class="small">${catBadge(rules, item.kind)}${item.need ? ` · ${item.need === 'food' ? 'еда' : 'уход'}` : ''}</div>
        <div class="small muted">${effectText(rules, item.effect)}${item.wear ? ' · можно надеть' : ''}${item.toy ? ' · будет рядом с питомцем' : ''}</div>
        ${item.note ? `<div class="small note">${esc(item.note)}</div>` : ''}
        ${overPlan ? '<div class="small warn">⚠ больше плана</div>' : ''}
      </div>
      <button class="btn buy-btn" data-action="buy" data-id="${item.id}" ${owned ? 'disabled' : ''}>
        ${owned ? 'Уже есть' : money(item.price)}
      </button>
    </div>`
}

function envelope(app, kind) {
  const w = app.state.week
  if (w.phase !== 'active') return ''
  const c = app.content.rules.categories[kind]
  const planned = w.plan[kind]
  const spent = w.spent[kind]
  const left = planned - spent
  return `
    <section class="card envelope cat-${kind}">
      <div class="row"><b class="grow">${c.icon} План на «${c.name}»</b><span>потрачено <b>${spent}</b> из ${planned}</span></div>
      ${progress(spent, Math.max(planned, spent, 1), { cls: left >= 0 ? kind : 'over', label: `Потрачено из плана на ${c.name}` })}
      ${left >= 0
        ? `<p class="small">Осталось по плану: <b>${left}</b>. Покупай в этих пределах – тогда в конце недели получишь ⭐ «Траты по плану».</p>`
        : `<p class="small warn">⚠ Потрачено больше плана на ${-left}. ⭐ «Траты по плану» на этой неделе не будет. Ничего страшного – в следующий раз запланируй иначе.</p>`}
    </section>`
}

function overPlanSheet(app, item, info) {
  const c = app.content.rules.categories[item.kind]
  const left = Math.max(0, info.planLeft)
  openSheet(`
    <div class="sheet-icon" aria-hidden="true">✋</div>
    <h2>Это больше плана</h2>
    <p>По плану на «${c.name}» осталось <b>${left}</b>, а «${esc(item.name)}» стоит <b>${item.price}</b> – на ${item.price - left} больше.</p>
    <p>Правило недели: тратим в пределах плана. Если купить, план не выполнится и звезды «Траты по плану» в итогах не будет.</p>
    ${item.kind === 'need'
      ? '<p class="small">Еда и уход питомцу нужны. Если без покупки никак – купи, а в следующем плане оставь на «Нужное» побольше.</p>'
      : '<p class="small">Желаемую покупку можно отложить на следующую неделю и заранее заложить её в план – это не ошибка.</p>'}
    <div class="sheet-actions">
      ${item.kind === 'want' ? `<button class="btn primary" data-action="postpone" data-id="${item.id}">Отложить на следующую неделю</button>` : ''}
      <button class="btn ${item.kind === 'want' ? 'secondary' : 'primary'}" data-action="close-sheet">Выбрать другое</button>
      <button class="btn ghost" data-action="force-buy" data-id="${item.id}">Всё равно купить</button>
    </div>`)
}
function lackSheet(app, item, lack) {
  const s = app.state
  const fromPiggy = item.kind === 'need' && s.savings >= lack
    ? '<li>Взять недостающее из копилки – но цель отодвинется.</li>'
    : ''
  openSheet(`
    <div class="sheet-icon" aria-hidden="true">🤔</div>
    <h2>Не хватает ${lack} монеток</h2>
    <p>«${esc(item.name)}» стоит ${item.price}, а в кошельке ${s.wallet}. В минус уйти нельзя. Что можно сделать:</p>
    <ul>
      <li>Выполнить задание и заработать монетки.</li>
      <li>Выбрать что-нибудь дешевле.</li>
      ${item.kind === 'want' ? '<li>Отложить покупку на следующую неделю и запланировать на неё.</li>' : ''}
      ${fromPiggy}
    </ul>
    <div class="sheet-actions">
      <button class="btn primary" data-action="go" data-to="tasks">⭐ К заданиям</button>
      ${item.kind === 'want' ? `<button class="btn secondary" data-action="postpone" data-id="${item.id}">Отложить на потом</button>` : ''}
      ${fromPiggy ? '<button class="btn secondary" data-action="go" data-to="savings">🐷 В копилку</button>' : ''}
      <button class="btn ghost" data-action="close-sheet">Выбрать другое</button>
    </div>`)
}

function confirmSheet(app, item, info) {
  const s = app.state
  const { rules } = app.content
  const c = rules.categories[item.kind]
  const statsAfter = { ...s.stats }
  const effect = itemEffect(s, item, rules)
  for (const k of Object.keys(effect)) statsAfter[k] = Math.min(100, statsAfter[k] + effect[k])
  const distracted = Boolean(item.effect.joy) && effect.joy < item.effect.joy

  const planLine = info.overPlan > 0
    ? `<p class="warn">⚠ По плану на «${c.name}» осталось ${Math.max(0, info.planLeft)}, а это стоит ${item.price}. Если купить, план недели не выполнится.</p>`
    : changeRow(`План «${c.name}»: осталось`, info.planLeft, info.planLeft - item.price)

  openSheet(`
    <div class="sheet-icon" aria-hidden="true">${item.icon}</div>
    <h2>Купить «${esc(item.name)}»?</h2>
    <p>${catBadge(rules, item.kind)} · цена ${money(item.price)}</p>
    <div class="changes">
      ${changeRow('Кошелёк', s.wallet, s.wallet - item.price)}
      ${info.overPlan > 0 ? '' : planLine}
      ${statRows(rules, s.stats, statsAfter)}
    </div>
    ${info.overPlan > 0 ? planLine : ''}
    ${distracted ? '<p class="warn">😕 Питомец сейчас голодный или грязный, ему не до игр: игрушка порадует только вполовину. Сначала нужное!</p>' : ''}
    <div class="sheet-actions">
      <button class="btn primary" data-action="confirm-buy" data-id="${item.id}">Купить за ${item.price}</button>
      ${item.kind === 'want' ? `<button class="btn secondary" data-action="postpone" data-id="${item.id}">Отложить на потом</button>` : ''}
      <button class="btn ghost" data-action="close-sheet">Не сейчас</button>
    </div>`)
}

export default {
  render(app) {
    const s = app.state
    const { shop, rules } = app.content
    const tab = app.params.tab || 'need'
    const items = shop.filter((i) => i.kind === tab)
    const wished = s.wishlist.map((id) => findItem(app, id)).filter(Boolean)

    const locked = s.week.phase !== 'active'
      ? `<section class="card attention">
          <p>🛒 Покупки откроются, когда будет готов план на неделю. Так легче не потратить всё сразу.</p>
          <button class="btn primary" data-action="go" data-to="plan">Составить план</button>
        </section>`
      : ''

    return `
      <main class="screen">
        ${header('Магазин', { extra: `<span class="bar-money">${money(s.wallet)}</span>` })}
        ${locked}
        <div class="tabs" role="tablist">
          ${['need', 'want'].map((k) => `
            <button class="tab ${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-action="tab" data-tab="${k}">
              ${rules.categories[k].icon} ${rules.categories[k].name}
            </button>`).join('')}
        </div>
        <p class="small muted">${tab === 'need' ? 'Нужное – еда и уход. Их надо покупать каждую неделю.' : '«Хочу» – для радости. Такую покупку можно отложить, и это не ошибка.'}</p>
        ${envelope(app, tab)}
        ${tab === 'want' && wished.length ? `
          <section class="card wish">
            <h2>Отложено на потом</h2>
            <p class="small muted">${wished.map((i) => `${i.icon} ${esc(i.name)} – ${i.price}`).join('<br>')}</p>
          </section>` : ''}
        ${items.map((item) => itemCard(app, item)).join('')}
      </main>`
  },

  actions: {
    tab(app, data) {
      app.params.tab = data.tab
      app.render()
    },

    buy(app, data) {
      const s = app.state
      const item = findItem(app, data.id)
      if (s.week.phase !== 'active') {
        showResult({
          icon: '📋',
          title: 'Сначала план',
          text: 'Покупки откроются, когда будет готов план на неделю.',
          buttons: '<button class="btn primary" data-action="go" data-to="plan">Составить план</button>',
        })
        return
      }
      const info = purchaseInfo(s, item)
      if (info.lack > 0) {
        play('soft')
        lackSheet(app, item, info.lack)
        return
      }
      if (info.overPlan > 0) {
        play('soft')
        overPlanSheet(app, item, info)
        return
      }
      confirmSheet(app, item, info)
    },

    'force-buy'(app, data) {
      const item = findItem(app, data.id)
      confirmSheet(app, item, purchaseInfo(app.state, item))
    },

    'confirm-buy'(app, data) {
      const s = app.state
      const { rules } = app.content
      const item = findItem(app, data.id)
      const res = buy(s, item, rules)
      closeSheet()
      if (!res.ok) {
        toast('Не получилось купить')
        return
      }
      app.commit()
      play('coin')
      const c = rules.categories[item.kind]
      showResult({
        icon: item.icon,
        title: `Куплено: ${item.name}`,
        rows: changeRow('Кошелёк', res.before.wallet, s.wallet) + changeRow('Копилка', s.savings, s.savings) + statRows(rules, res.before.stats, s.stats),
        text: res.overPlan > 0
          ? `Потрачено больше плана на «${c.name}». В итогах недели план не засчитается – не страшно, в следующий раз можно запланировать иначе.`
          : res.distracted
            ? 'Питомцу сейчас не до игр: сначала ему нужны еда и чистота. Поэтому игрушка порадовала только вполовину.'
            : `Питомец: «${petSays(s.stats, s.pet)}»`,
        tip: nextStep(s),
      })
    },

    postpone(app, data) {
      const item = findItem(app, data.id)
      postpone(app.state, item)
      closeSheet()
      app.commit()
      toast(`«${item.name}» отложено. Можно запланировать на следующую неделю`)
    },
  },
}
