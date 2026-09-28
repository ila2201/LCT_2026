import { petMood, weakestStat, stageIndex, savedThisWeek } from '../game.js'
import { petSvg } from '../pet.js'
import { changeRow } from '../ui.js'
import { esc, signed } from '../format.js'

export const moodTitle = {
  happy: '😊 Отличное настроение',
  ok: '🙂 Всё в порядке',
  sad: '😕 Грустит',
  upset: '😢 Очень грустит',
}

export function petSays(stats, pet = {}) {
  const g = (boy, girl) => (pet.gender === 'girl' ? girl : boy)
  const mood = petMood(stats)
  if (mood === 'happy') return 'Мне так хорошо! Спасибо за заботу.'
  const weak = weakestStat(stats)
  if (mood === 'ok') {
    return {
      food: 'Всё неплохо, но скоро захочется кушать.',
      care: 'Всё неплохо, но пора бы искупаться.',
      joy: 'Всё неплохо, но хочется поиграть.',
    }[weak]
  }
  if (mood === 'upset') {
    const parts = []
    if (stats.food < 30) parts.push(g('очень голодный', 'очень голодная'))
    if (stats.care < 30) parts.push(g('весь грязный', 'вся грязная'))
    if (stats.joy < 30) parts.push('мне очень одиноко')
    return `Мне совсем плохо... Я ${parts.join(', ')}. Позаботься обо мне, пожалуйста! Начни с «Нужного» в магазине.`
  }
  return {
    food: `Я ${g('голодный', 'голодная')}... Живот урчит. Купи мне еды, пожалуйста! Она в магазине, раздел «Нужное».`,
    care: `Я ${g('весь грязный', 'вся грязная')} и всё чешется... Помой меня, пожалуйста! Уход в магазине, раздел «Нужное».`,
    joy: 'Мне скучно и грустно... Поиграй со мной: игрушка из «Хочу» или задание поднимут настроение.',
  }[weak]
}

export function petProblems(state, rules) {
  const s = state.stats
  const list = []
  if (s.food < 30) list.push(`${rules.stats.food.icon} Сытость ${s.food}: купи еду в «Нужном»`)
  if (s.care < 30) list.push(`${rules.stats.care.icon} Чистота ${s.care}: купи уход в «Нужном»`)
  if (s.joy < 30) list.push(`${rules.stats.joy.icon} Настроение ${s.joy}: игрушка из «Хочу» или задание`)
  return list
}
export function stageName(stage, pet) {
  return (pet.gender === 'girl' && stage.girl) || stage.name
}

export function catBadge(rules, kind) {
  const c = rules.categories[kind]
  return `<span class="cat cat-${kind}">${c.icon} ${c.name}</span>`
}

export function effectText(rules, effect = {}) {
  return Object.keys(effect)
    .map((k) => `${rules.stats[k].icon} ${rules.stats[k].name} +${effect[k]}`)
    .join(', ')
}

export function statRows(rules, before, after) {
  return Object.keys(after)
    .filter((k) => before[k] !== after[k])
    .map((k) => changeRow(`${rules.stats[k].icon} ${rules.stats[k].name}`, before[k], after[k]))
    .join('')
}

export function currentPet(app, size = 160) {
  const s = app.state
  const { rules, pets } = app.content
  return petSvg(s.pet, pets, {
    stage: stageIndex(s.stars, rules.stages),
    mood: petMood(s.stats),
    stats: s.stats,
    size,
    label: `${s.pet.name}: ${moodTitle[petMood(s.stats)]}`,
  })
}

const opIcon = { income: '➕', buy: '🛒', deposit: '🐷', withdraw: '↩️', goal: '🎉', loss: '⚠️' }

export function opsList(ops) {
  if (!ops.length) return '<p class="muted">Пока ничего не было.</p>'
  return `
    <ul class="ops">
      ${ops.map((op) => `
        <li>
          <span aria-hidden="true">${opIcon[op.type] || '•'}</span>
          <span class="grow">${esc(op.text)}</span>
          <b class="${op.amount > 0 ? 'plus' : ''}">${op.amount ? signed(op.amount) : ''}</b>
        </li>`).join('')}
    </ul>`
}

export function nextStep(state) {
  const w = state.week
  if (w.phase === 'plan') return 'Составь план на неделю – после этого откроется магазин.'
  if (!w.bought.food) return 'На этой неделе ещё нет еды для питомца. Загляни в «Нужное».'
  if (!w.bought.care) return 'Не забудь про уход: купание, стрижку или лежанку.'
  const planSave = w.plan.save - savedThisWeek(w)
  if (planSave > 0) return `Нужное куплено! По плану в копилку ещё ${planSave}.`
  return 'Всё по плану. Можно выполнить задание или завершить неделю.'
}
