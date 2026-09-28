import { stageIndex, findGoal, goalProgress, isTaskDone } from '../game.js'
import { petSvg } from '../pet.js'
import { header, progress } from '../ui.js'
import { esc } from '../format.js'
import { opsList, stageName } from './common.js'

function starsLine(n) {
  return '⭐'.repeat(n) + '☆'.repeat(3 - n)
}

export default {
  render(app) {
    const s = app.state
    const { rules, pets, goals, tasks } = app.content
    const si = stageIndex(s.stars, rules.stages)
    const next = rules.stages[si + 1]
    const goal = findGoal(s, goals)
    const doneTasks = tasks.tasks.filter((t) => isTaskDone(s, t))

    const stages = rules.stages
      .map((st, i) => `
        <div class="stage ${i === si ? 'on' : ''} ${i > si ? 'future' : ''}">
          ${petSvg({ ...s.pet, accessories: [] }, pets, { stage: i, size: 72, label: stageName(st, s.pet) })}
          <span class="small">${stageName(st, s.pet)}<br>от ${st.stars} ⭐</span>
        </div>`)
      .join('')

    const weeks = s.history.length
      ? `<ul class="weeks">${s.history.map((h, i) => `
          <li><button class="week-btn" data-action="week" data-i="${i}">
            <span class="grow">Неделя ${h.n}</span><span aria-label="${h.earned} из 3">${starsLine(h.earned)}</span><span class="chev">›</span>
          </button></li>`).join('')}</ul>`
      : '<p class="muted">Итоги появятся, когда закончится первая неделя.</p>'

    return `
      <main class="screen">
        ${header('Прогресс')}
        <section class="card">
          <h2>Как растёт ${esc(s.pet.name)}</h2>
          <div class="stages">${stages}</div>
          <p>Очки роста: <b>${s.stars} ⭐</b></p>
          ${next ? progress(s.stars, next.stars, { cls: 'gold', label: 'Очки роста до следующей стадии' }) : ''}
          <p class="small">${next ? `До стадии «${stageName(next, s.pet)}» ещё ${next.stars - s.stars} ⭐.` : 'Это последняя стадия – питомец уже взрослый!'}</p>
          <p class="small muted">Каждую неделю можно получить до 3 ⭐: нужное куплено, траты по плану, копилка пополнена. Звёзды не сгорают – прогресс не пропадёт, даже если неделя не удалась.</p>
        </section>

        <h2>Итоги недель</h2>
        ${weeks}

        <h2>Цели</h2>
        <section class="card">
          ${goal ? `<p>${goal.icon} ${esc(goal.name)}: накоплено ${goalProgress(s, goal).saved} из ${goal.price}</p>${progress(goalProgress(s, goal).saved, goal.price, { cls: 'save', label: 'Прогресс цели' })}` : '<p>Цель пока не выбрана.</p>'}
          ${s.goalsDone.length ? `<p>Исполненные мечты: ${s.goalsDone.map((g) => `${g.icon} ${esc(g.name)}`).join(', ')}</p>` : ''}
        </section>

        <h2>Выполненные задания – ${doneTasks.length} из ${tasks.tasks.length}</h2>
        ${doneTasks.length ? `<section class="card"><ul class="plain">${doneTasks.map((t) => `<li>✔ <b>${t.title}</b><span class="small muted">${t.skill}</span></li>`).join('')}</ul></section>` : '<p class="muted">Пока ни одного – загляни в «Задания».</p>'}

        <h2>История этой недели</h2>
        ${opsList(s.week.ops)}

        <button class="btn secondary" data-action="go" data-to="glossary">📖 Словарик: что значат слова</button>
      </main>`
  },

  actions: {
    week(app, data) {
      app.go('summary', { index: Number(data.i) })
    },
  },
}
