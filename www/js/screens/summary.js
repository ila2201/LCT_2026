import { minNeedCost } from '../game.js'
import { petSvg } from '../pet.js'
import { header } from '../ui.js'
import { esc } from '../format.js'
import { statRows, opsList, stageName, petSays } from './common.js'

function planRows(rules, sum) {
  return ['need', 'want', 'save']
    .map((k) => {
      const c = rules.categories[k]
      const plan = sum.plan[k]
      const fact = sum.fact[k]
      const ok = k === 'save' ? fact >= plan : fact <= plan
      return `
        <tr>
          <td>${c.icon} ${c.name}</td><td>${plan}</td><td>${fact}</td>
          <td class="${ok ? 'ok' : 'no'}">${ok ? '✔ да' : '✘ нет'}</td>
        </tr>`
    })
    .join('')
}

function planProblems(sum) {
  const p = []
  if (sum.fact.need > sum.plan.need) p.push(`на нужное потрачено на ${sum.fact.need - sum.plan.need} больше плана`)
  if (sum.fact.want > sum.plan.want) p.push(`на «хочу» потрачено на ${sum.fact.want - sum.plan.want} больше плана`)
  if (sum.fact.save < sum.plan.save) p.push(`в копилку отложено на ${sum.plan.save - sum.fact.save} меньше плана`)
  return p.join('; ')
}

function checkList(sum) {
  const missing = [!sum.bought.food && 'еды', !sum.bought.care && 'ухода'].filter(Boolean).join(' и ')
  const item = (ok, title, good, bad) => `
    <li class="${ok ? 'ok' : 'no'}">
      <span class="star" aria-hidden="true">${ok ? '⭐' : '☆'}</span>
      <div><b>${title}</b> – ${ok ? 'да' : 'пока нет'}<br><span class="small">${ok ? good : bad}</span></div>
    </li>`
  return `
    <ul class="check-list">
      ${item(sum.checks.needs, 'Нужное куплено', 'Еда и уход были у питомца всю неделю.', `На этой неделе не было ${missing}, и питомцу было плохо.`)}
      ${item(sum.checks.plan, 'Траты по плану', 'Всё получилось так, как было задумано.', `Не совпало: ${planProblems(sum)}.`)}
      ${item(sum.checks.savings, 'Копилка пополнена', `Отложено ${sum.fact.save}.`, 'В копилку ничего не отложено.')}
    </ul>`
}

function advice(sum, shop) {
  if (!sum.checks.needs) return `В новом плане оставь на «Нужное» хотя бы ${minNeedCost(shop)} и купи еду и уход в начале недели.`
  if (!sum.checks.plan) return 'Если хочется купить что-то сверх плана – отложи покупку и заложи её в план следующей недели.'
  if (!sum.checks.savings) return 'Попробуй класть в копилку хотя бы 5–10 монеток каждую неделю. Понемногу – тоже считается.'
  return 'Отличная неделя! Повтори – и питомец будет расти дальше.'
}

export default {
  render(app) {
    const s = app.state
    const { rules, pets, shop } = app.content
    const sum = s.history[app.params.index]
    if (!sum) {
      return `<main class="screen">${header('Итоги недели')}<p>Итоги появятся, когда закончится первая неделя.</p></main>`
    }
    const grew = sum.stageAfter > sum.stageBefore
    const next = rules.stages[sum.stageAfter + 1]
    const isLast = app.params.index === s.history.length - 1
    const fresh = app.params.fresh && isLast

    const growth = grew
      ? `<section class="card grow-card">
          <div class="center">${petSvg(s.pet, pets, { stage: sum.stageAfter, size: 170, label: 'Питомец подрос' })}</div>
          <h2 class="center">${esc(s.pet.name)} подрастает! Новая стадия – «${stageName(rules.stages[sum.stageAfter], s.pet)}»</h2>
          <p class="center small">Это случилось благодаря решениям за несколько недель подряд.</p>
        </section>`
      : `<p>Очки роста: <b>${sum.stars} ⭐</b>. ${next ? `До стадии «${stageName(next, s.pet)}» ещё ${next.stars - sum.stars} ⭐.` : 'Питомец уже взрослый – так держать!'}</p>`

    return `
      <main class="screen">
        ${header(`Итоги недели ${sum.n}`, { back: !fresh })}
        <p class="lead">За неделю: <b>+${sum.earned} ⭐</b> из 3 возможных.</p>
        ${checkList(sum)}

        <h2>План и факт</h2>
        <table class="pf">
          <tr><th></th><th>План</th><th>Факт</th><th>По плану?</th></tr>
          ${planRows(rules, sum)}
        </table>

        <h2>Питомец</h2>
        <div class="changes">${statRows(rules, sum.statsBefore, sum.statsAfter)}</div>
        <p class="bubble">${esc(s.pet.name)}: «${petSays(sum.statsAfter, s.pet)}»</p>
        <p class="small">За неделю питомец съел свою еду, немного испачкался и соскучился – так бывает каждую неделю.${sum.checks.plan ? ` А за выполненный план настроение +${rules.joy.planKept}.` : ''}</p>

        <h2>Рост</h2>
        ${growth}

        <p class="tip">👉 ${advice(sum, shop)}</p>

        ${fresh ? `
          <section class="card attention">
            <p>Началась неделя ${sum.n + 1}: +${rules.income} карманных монеток. В кошельке теперь ${s.wallet}.</p>
            <button class="btn primary big" data-action="new-week">Составить план на неделю ${sum.n + 1}</button>
          </section>` : `
          <details class="card"><summary>Все операции недели</summary>${opsList(sum.ops)}</details>`}
      </main>`
  },

  actions: {
    'new-week'(app) {
      app.go('plan', {}, { replace: true })
    },
  },
}
