import { addIncome, stageIndex, isTaskDone } from '../game.js'
import { removeProfile, removeEverything, defaultSettings } from '../storage.js'
import { header, progress, ask, toast } from '../ui.js'
import { esc } from '../format.js'
import { stageName } from './common.js'

let example = null
let answer = ''
let reason = 0

function newExample() {
  example = { a: 12 + Math.floor(Math.random() * 8), b: 3 + Math.floor(Math.random() * 7) }
  answer = ''
}

function barrier() {
  if (!example) newExample()
  return `
    <main class="screen">
      ${header('Для взрослых')}
      <p class="lead">Этот раздел для родителей и учителей. Чтобы войти, решите пример:</p>
      <p class="example">${example.a} × ${example.b} = ?</p>
      <label class="label" for="adult-answer">Ответ</label>
      <input id="adult-answer" class="field num" type="number" inputmode="numeric" data-input="answer" autocomplete="off">
      <button class="btn primary big" data-action="unlock">Войти</button>
    </main>`
}

function overview(app) {
  const s = app.state
  const { rules, tasks, intro } = app.content
  const weeks = s.history.length
  const count = (key) => s.history.filter((h) => h.checks[key]).length
  const stage = rules.stages[stageIndex(s.stars, rules.stages)]
  const { chats } = app.content.chats
  const chatDone = chats.filter((c) => (s.chats || {})[c.id])
  const scams = chats.filter((c) => Object.values(c.ends).some((e) => e.loss))
  const scamsOk = scams.filter((c) => (s.chats || {})[c.id] && s.chats[c.id].ok).length

  const topics = Object.entries(tasks.topics)
    .map(([key, topic]) => {
      const list = tasks.tasks.filter((t) => t.topic === key)
      const done = list.filter((t) => isTaskDone(s, t))
      return `
        <div class="topic">
          <div class="row"><b class="grow">${topic.icon} ${topic.name}</b><span>${done.length} из ${list.length}</span></div>
          ${progress(done.length, list.length, { cls: 'need', label: topic.name })}
          ${done.length ? `<p class="small muted">${done.map((t) => t.skill).join('; ')}</p>` : ''}
        </div>`
    })
    .join('')

  const bonus = rules.parentBonus
  return `
    <main class="screen">
      ${header('Для взрослых')}

      <section class="card">
        <h2>Зачем это приложение</h2>
        <ul>${intro.adult.goals.map((g) => `<li>${g}</li>`).join('')}</ul>
        <p class="small muted">Основа: ${intro.adult.source}</p>
      </section>

      <section class="card">
        <h2>Общий прогресс</h2>
        <ul class="plain facts">
          <li><span>Питомец</span><b>${esc(s.pet.name)}</b></li>
          <li><span>Завершено недель</span><b>${weeks}</b></li>
          <li><span>Стадия питомца</span><b>${stageName(stage, s.pet)}, ${s.stars} ⭐</b></li>
          <li><span>Недель с покупкой еды и ухода</span><b>${count('needs')} из ${weeks}</b></li>
          <li><span>Недель по плану</span><b>${count('plan')} из ${weeks}</b></li>
          <li><span>Недель с пополнением копилки</span><b>${count('savings')} из ${weeks}</b></li>
          <li><span>Всего отложено в копилку</span><b>${s.totalDeposited}</b></li>
          <li><span>Исполнено целей</span><b>${s.goalsDone.length}</b></li>
          <li><span>Разговоров в «Телефоне»</span><b>${chatDone.length} из ${chats.length}</b></li>
          <li><span>Обманов распознано</span><b>${scamsOk} из ${scams.length}</b></li>
        </ul>
      </section>

      <section class="card">
        <h2>Пройденные темы</h2>
        ${topics}
        <p class="small muted">Приложение не ставит оценок. Ошибки – часть обучения: ребёнок видит последствия и пробует снова. Можно обсудить с ребёнком итоги недели: что получилось и что он или она сделает иначе.</p>
      </section>

      <section class="card">
        <h2>Бонус от взрослого</h2>
        <p class="small">Можно отметить реальное дело игровыми монетками. Они не имеют реальной стоимости и появятся в истории с пометкой «Бонус от взрослого».</p>
        <div class="chips">${bonus.reasons.map((r, i) => `<button class="chip ${reason === i ? 'on' : ''}" data-action="reason" data-i="${i}" aria-pressed="${reason === i}">${r}</button>`).join('')}</div>
        <div class="btn-grid">${bonus.amounts.map((a) => `<button class="btn secondary" data-action="bonus" data-amount="${a}">+${a}</button>`).join('')}</div>
      </section>

      <section class="card">
        <h2>Демо-режим ${s.demo ? '<span class="badge">включён</span>' : ''}</h2>
        <p class="small">Для проверки: все задания и сообщения в «Телефоне» открыты сразу, а не по неделям.</p>
        <button class="btn secondary" data-action="demo">${s.demo ? 'Выключить демо-режим' : 'Включить демо-режим'}</button>
      </section>

      <section class="card">
        <h2>Данные</h2>
        <p class="small">Всё хранится только на этом устройстве. Приложение не собирает персональные данные, не показывает рекламу и ничего не отправляет в интернет.</p>
        <button class="btn secondary" data-action="reset">Сбросить профиль и начать заново</button>
        <button class="btn danger" data-action="wipe">Удалить все данные</button>
      </section>

      <section class="card">
        <h2>Полезные материалы</h2>
        <p class="small">«Финансовая культура» – просветительский портал Банка России: fincult.info<br>
        Раздел «Финансовая грамотность» на портале «Открытый бюджет города Москвы»: budget.mos.ru</p>
      </section>
    </main>`
}

export default {
  render(app) {
    return app.params.unlocked ? overview(app) : barrier()
  },

  inputs: {
    answer: (app, value) => { answer = value },
  },

  actions: {
    unlock(app) {
      if (Number(answer) === example.a * example.b) {
        example = null
        app.params.unlocked = true
        history.replaceState({ screen: 'adult', params: app.params, depth: app.depth }, '')
        app.render()
      } else {
        toast('Неверно, попробуйте другой пример')
        newExample()
        app.render()
      }
    },
    reason(app, data) {
      reason = Number(data.i)
      app.render()
    },
    async bonus(app, data) {
      const amount = Number(data.amount)
      const text = app.content.rules.parentBonus.reasons[reason]
      const ok = await ask({ title: `Начислить +${amount}?`, body: `<p>За что: ${text}</p>`, yes: 'Начислить' })
      if (!ok) return
      addIncome(app.state, amount, `Бонус от взрослого: ${text}`)
      app.commit()
      toast(`Начислено +${amount}`)
    },
    async demo(app) {
      const s = app.state
      const ok = await ask({
        title: s.demo ? 'Выключить демо-режим?' : 'Включить демо-режим?',
        body: s.demo ? '<p>Задания снова будут открываться постепенно, по неделям.</p>' : '<p>Все задания откроются сразу.</p>',
        yes: s.demo ? 'Выключить' : 'Включить',
      })
      if (!ok) return
      s.demo = !s.demo
      app.commit()
    },
    async reset(app) {
      const ok = await ask({
        title: 'Сбросить профиль?',
        body: '<p>Питомец, монетки, копилка и прогресс удалятся. Начать можно будет сразу заново.</p>',
        yes: 'Сбросить',
        danger: true,
      })
      if (!ok) return
      removeProfile()
      app.state = null
      app.depth = 0
      app.go('welcome', {}, { replace: true })
      toast('Профиль сброшен')
    },
    async wipe(app) {
      const ok = await ask({
        title: 'Удалить все данные?',
        body: '<p>Удалятся профиль, прогресс и настройки. Отменить это нельзя.</p>',
        yes: 'Удалить',
        danger: true,
      })
      if (!ok) return
      removeEverything()
      app.state = null
      app.settings = { ...defaultSettings }
      app.applySettings()
      app.depth = 0
      app.go('welcome', {}, { replace: true })
      toast('Все данные удалены')
    },
  },
}
