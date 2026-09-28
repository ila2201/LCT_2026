import { plural } from './format.js'

export const TASK_TYPES = ['sort', 'basket', 'save', 'scenario', 'pay', 'number']

const checkers = {
  sort(task, answer) {
    const mistakes = task.items.filter((item, i) => answer[i] !== item.answer)
    const unanswered = task.items.filter((item, i) => !answer[i]).length
    return {
      ok: mistakes.length === 0,
      unanswered,
      notes: mistakes.map((item) => `${item.name}: ${item.why}`),
    }
  },

  basket(task, answer) {
    const chosen = task.items.filter((item) => answer.includes(item.id))
    const total = chosen.reduce((sum, item) => sum + item.price, 0)
    const missing = task.items.filter((item) => item.required && !answer.includes(item.id))
    const notes = []
    if (missing.length) notes.push(`Не хватает нужного: ${missing.map((i) => i.name).join(', ')}.`)
    if (total > task.budget) notes.push(`Получилось ${total} – это на ${total - task.budget} больше, чем у тебя есть.`)
    return { ok: notes.length === 0, total, notes }
  },

  save(task, answer) {
    const left = task.income - answer
    const total = answer * task.weeks
    const notes = []
    const weeks = `${task.weeks} ${plural(task.weeks, 'неделю', 'недели', 'недель')}`
    if (total < task.price) notes.push(`За ${weeks} наберётся ${total}, а нужно ${task.price}. Не хватит ${task.price - total}.`)
    if (left < task.mustSpend) notes.push(`На обеды останется ${left}, а нужно ${task.mustSpend}.`)
    return { ok: notes.length === 0, total, notes }
  },

  scenario(task, answer) {
    const end = task.ends[answer]
    return { ok: Boolean(end && end.ok), text: end ? end.text : '', notes: [] }
  },

  pay(task, answer) {
    const sum = answer.reduce((s, i) => s + task.coins[i], 0)
    const notes = []
    if (sum < task.price) notes.push(`Собрано ${sum}. Не хватает ${task.price - sum}.`)
    if (sum > task.price) notes.push(`Собрано ${sum} – это на ${sum - task.price} больше цены, а сдачи нет.`)
    return { ok: sum === task.price, sum, notes }
  },

  number(task, answer) {
    return { ok: answer === task.answer, notes: [] }
  },
}

export function checkTask(task, answer) {
  const check = checkers[task.type]
  if (!check) throw new Error(`Неизвестный тип задания: ${task.type}`)
  const res = check(task, answer)
  return { ...res, text: res.text || (res.ok ? task.right : task.wrong) }
}
