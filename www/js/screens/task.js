import { finishTask, isTaskDone } from '../game.js'
import { checkTask } from '../task-check.js'
import { header, money, progress, changeRow, toast } from '../ui.js'
import { esc } from '../format.js'
import { play } from '../sound.js'

let cur = null

function blankAnswer(task) {
  return { sort: {}, basket: [], save: 0, scenario: null, pay: [], number: '' }[task.type]
}

function reset(task) {
  cur = { id: task.id, answer: blankAnswer(task), step: task.start, path: [], result: null, scroll: false }
}

const views = {
  sort(task) {
    const a = cur.answer
    const checked = Boolean(cur.result)
    return `
      <div class="sort-list">
        ${task.items.map((item, i) => {
          const right = a[i] === item.answer
          return `
            <div class="card sort-item ${checked ? (right ? 'right' : 'wrong') : ''}">
              <span class="item-icon" aria-hidden="true">${item.icon}</span>
              <b class="grow">${item.name}${checked ? (right ? ' ✔' : ' ✘') : ''}</b>
              <div class="seg">
                ${['need', 'want'].map((v) => `
                  <button class="seg-btn ${a[i] === v ? 'on' : ''}" data-action="sort" data-i="${i}" data-v="${v}" aria-pressed="${a[i] === v}" ${checked ? 'disabled' : ''}>
                    ${v === 'need' ? 'Нужно' : 'Хочу'}
                  </button>`).join('')}
              </div>
            </div>`
        }).join('')}
      </div>`
  },

  basket(task) {
    const chosen = task.items.filter((i) => cur.answer.includes(i.id))
    const total = chosen.reduce((s, i) => s + i.price, 0)
    const left = task.budget - total
    return `
      <div class="basket-grid">
        ${task.items.map((item) => {
          const on = cur.answer.includes(item.id)
          return `
            <button class="basket-item ${on ? 'on' : ''}" data-action="basket" data-id="${item.id}" aria-pressed="${on}" ${cur.result ? 'disabled' : ''}>
              <span class="item-icon" aria-hidden="true">${item.icon}</span>
              <b>${item.name}</b>
              <span>${money(item.price)}</span>
              <span class="small">${on ? '✔ в корзине' : 'добавить'}</span>
            </button>`
        }).join('')}
      </div>
      <div class="card">
        <p>В корзине на <b>${total}</b> из ${task.budget}. ${left >= 0 ? `Остаётся ${left}.` : `<span class="warn">Не хватает ${-left}.</span>`}</p>
        ${progress(total, Math.max(total, task.budget), { cls: left >= 0 ? 'need' : 'want', label: 'Сумма корзины' })}
      </div>`
  },

  save(task) {
    const a = cur.answer
    let table = ''
    if (cur.result) {
      const rows = []
      for (let k = 1; k <= task.weeks; k++) rows.push(`<li>Неделя ${k}: в копилке ${a * k}</li>`)
      table = `
        <div class="card">
          <ul class="plain">${rows.join('')}</ul>
          <p>Цель – ${task.price}. На обеды каждую неделю остаётся ${task.income - a} (нужно ${task.mustSpend}).</p>
        </div>`
    }
    return `
      <div class="card center">
        <p>Откладывать в неделю:</p>
        <div class="stepper">
          <button class="round-btn" data-action="save-dec" ${a <= 0 || cur.result ? 'disabled' : ''} aria-label="Меньше">−</button>
          <span class="plan-val">${a}</span>
          <button class="round-btn" data-action="save-inc" ${a >= task.income || cur.result ? 'disabled' : ''} aria-label="Больше">+</button>
        </div>
      </div>
      ${table}`
  },

  scenario(task) {
    const log = cur.path.map((p) => `
      <p class="story">${task.steps[p.step].text}</p>
      <p class="picked">${task.steps[p.step].choices[p.choice].text}</p>`).join('')
    if (cur.result) return log
    const step = task.steps[cur.step]
    return `
      ${log}
      <p class="story">${step.text}</p>
      <div class="choices">
        ${step.choices.map((c, i) => `<button class="btn secondary" data-action="choose" data-i="${i}">${c.text}</button>`).join('')}
      </div>`
  },

  pay(task) {
    const sum = cur.answer.reduce((s, i) => s + task.coins[i], 0)
    return `
      <div class="coins">
        ${task.coins.map((v, i) => {
          const on = cur.answer.includes(i)
          return `<button class="coin-btn ${on ? 'on' : ''}" data-action="coin" data-i="${i}" aria-pressed="${on}" aria-label="Монета ${v}" ${cur.result ? 'disabled' : ''}>${v}</button>`
        }).join('')}
      </div>
      <p class="center">Собрано: <b>${sum}</b> из ${task.price}</p>`
  },

  number(task) {
    const lines = task.lines.map((l) => `<li><span class="grow">${l.name}</span><b>${l.price}</b></li>`).join('')
    return `
      <div class="card receipt">
        <ul class="plain">${lines}</ul>
        ${task.shownTotal ? `<p class="receipt-total">Итого в чеке: <b>${task.shownTotal}</b></p>` : ''}
      </div>
      <label class="label" for="num">Твой ответ</label>
      <input id="num" class="field num" type="number" inputmode="numeric" data-input="num" value="${esc(cur.answer)}" ${cur.result ? 'disabled' : ''}>`
  },
}

function resultBlock(task) {
  const { res, reward, walletBefore, walletAfter } = cur.result
  const repeat = res.ok && !reward
  return `
    <section class="card result ${res.ok ? 'ok' : 'no'}" id="result">
      <h2>${res.ok ? '✔ Хорошее решение!' : '✘ Есть над чем подумать'}</h2>
      <p>${res.text}</p>
      ${res.notes.length ? `<ul>${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      ${reward ? `<div class="changes">${changeRow(`Кошелёк (задание +${reward})`, walletBefore, walletAfter)}</div><p class="small">Питомцу понравилось: настроение выросло.</p>` : ''}
      ${repeat ? '<p class="small muted">Награда за это задание уже получена – это была тренировка.</p>' : ''}
      ${!res.ok ? '<p class="small">Монетки не пропали. Попробуй ещё раз – так и учатся.</p>' : ''}
      <div class="row gap">
        ${!res.ok ? '<button class="btn primary grow" data-action="retry">Ещё раз</button>' : ''}
        <button class="btn ${res.ok ? 'primary' : 'ghost'} grow" data-action="back">Готово</button>
      </div>
    </section>`
}

function check(app, task, answer) {
  const s = app.state
  const res = checkTask(task, answer)
  const walletBefore = s.wallet
  const { reward } = finishTask(s, task, res.ok, app.content.rules)
  cur.result = { res, reward, walletBefore, walletAfter: s.wallet }
  cur.scroll = true
  play(res.ok ? (reward ? 'coin' : 'ok') : 'soft')
  app.commit()
}

const findTask = (app) => app.content.tasks.tasks.find((t) => t.id === app.params.id)

export default {
  render(app) {
    const task = findTask(app)
    if (!app.params.started || !cur || cur.id !== task.id) {
      reset(task)
      app.params.started = true
    }
    const topic = app.content.tasks.topics[task.topic]
    const done = isTaskDone(app.state, task)
    const needCheckBtn = task.type !== 'scenario' && !cur.result
    return `
      <main class="screen">
        ${header(task.title)}
        <p class="small muted">${topic.icon} ${topic.name} · ${done ? 'уже выполнено' : `награда +${task.reward}`}</p>
        ${task.story ? `<p class="story">${task.story}</p>` : ''}
        ${views[task.type](task)}
        ${needCheckBtn ? '<button class="btn primary big" data-action="check">Проверить</button>' : ''}
        ${cur.result ? resultBlock(task) : ''}
      </main>`
  },

  mounted() {
    if (cur && cur.scroll) {
      cur.scroll = false
      const el = document.getElementById('result')
      if (el) el.scrollIntoView({ block: 'start' })
    }
  },

  inputs: {
    num: (app, value) => { cur.answer = value },
  },

  actions: {
    sort(app, data) {
      cur.answer[data.i] = data.v
      app.render()
    },
    basket(app, data) {
      const a = cur.answer
      cur.answer = a.includes(data.id) ? a.filter((x) => x !== data.id) : [...a, data.id]
      app.render()
    },
    'save-inc'(app) {
      const task = findTask(app)
      cur.answer = Math.min(task.income, cur.answer + task.step)
      app.render()
    },
    'save-dec'(app) {
      const task = findTask(app)
      cur.answer = Math.max(0, cur.answer - task.step)
      app.render()
    },
    coin(app, data) {
      const i = Number(data.i)
      cur.answer = cur.answer.includes(i) ? cur.answer.filter((x) => x !== i) : [...cur.answer, i]
      app.render()
    },
    choose(app, data) {
      const task = findTask(app)
      const choice = task.steps[cur.step].choices[Number(data.i)]
      cur.path.push({ step: cur.step, choice: Number(data.i) })
      if (choice.next) {
        cur.step = choice.next
        app.render()
      } else {
        check(app, task, choice.end)
      }
    },
    check(app) {
      const task = findTask(app)
      let answer = cur.answer
      if (task.type === 'sort' && Object.keys(answer).length < task.items.length) {
        toast('Разложи все вещи: нужно или хочу')
        return
      }
      if (task.type === 'number') {
        if (String(answer).trim() === '') {
          toast('Сначала впиши ответ')
          return
        }
        answer = Number(answer)
      }
      check(app, task, answer)
    },
    retry(app) {
      reset(findTask(app))
      app.render()
      window.scrollTo(0, 0)
    },
  },
}
