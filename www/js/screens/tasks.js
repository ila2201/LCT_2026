import { isTaskOpen, isTaskDone } from '../game.js'
import { header } from '../ui.js'

export default {
  render(app) {
    const s = app.state
    const { tasks, topics } = app.content.tasks
    const done = tasks.filter((t) => isTaskDone(s, t)).length

    const groups = Object.keys(topics).map((key) => {
      const list = tasks.filter((t) => t.topic === key)
      const rows = list.map((t) => {
        const open = isTaskOpen(s, t)
        let status
        if (isTaskDone(s, t)) status = '<span class="mark ok">✔ выполнено</span>'
        else if (open) status = `<span class="reward">+${t.reward}</span>`
        else status = `<span class="mark">🔒 неделя ${t.week}</span>`
        return `
          <button class="card link-card" data-action="open" data-id="${t.id}" ${open ? '' : 'disabled'}>
            <span class="grow"><b>${t.title}</b><span class="small muted">${t.skill}</span></span>
            ${status}
          </button>`
      })
      return `<h2>${topics[key].icon} ${topics[key].name}</h2>${rows.join('')}`
    })

    return `
      <main class="screen">
        ${header('Задания')}
        <p class="lead">Выполняй задания и получай монетки. Ошибаться не страшно – можно попробовать ещё раз.</p>
        <p class="small muted">Выполнено ${done} из ${tasks.length}.${s.demo ? ' В демо-режиме открыты все задания.' : ' Новые задания открываются каждую неделю.'}</p>
        ${groups.join('')}
      </main>`
  },

  actions: {
    open(app, data) {
      app.go('task', { id: data.id })
    },
  },
}
