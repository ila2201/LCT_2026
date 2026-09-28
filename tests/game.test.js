import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import * as g from '../www/js/game.js'
import { rules, shop, goals, tasks, item, newGame, withPlan, T0 } from './helpers.js'

describe('профиль и доход', () => {
  test('новый профиль получает стартовый бюджет с объяснением', () => {
    const s = newGame()
    assert.equal(s.wallet, rules.income)
    assert.equal(s.savings, 0)
    assert.equal(s.week.n, 1)
    assert.equal(s.week.phase, 'plan')
    assert.deepEqual(s.week.ops[0], { type: 'income', amount: rules.income, text: 'Стартовый бюджет' })
    assert.equal(s.pet.gender, 'boy', 'пол по умолчанию для старых данных')
  })

  test('любое начисление попадает в историю с источником', () => {
    const s = newGame()
    g.addIncome(s, 20, 'Бонус от взрослого: Помощь по дому')
    assert.equal(s.wallet, rules.income + 20)
    assert.equal(s.week.ops.at(-1).text, 'Бонус от взрослого: Помощь по дому')
  })
})

describe('план бюджета', () => {
  test('нельзя распределить больше, чем есть', () => {
    const s = newGame()
    const res = g.checkPlan(s, { need: 60, want: 30, save: 20 }, shop)
    assert.equal(res.ok, false)
    assert.match(res.error, /110/)
  })

  test('отрицательные и дробные суммы не принимаются', () => {
    const s = newGame()
    assert.equal(g.checkPlan(s, { need: -5, want: 0, save: 0 }, shop).ok, false)
    assert.equal(g.checkPlan(s, { need: 2.5, want: 0, save: 0 }, shop).ok, false)
  })

  test('остаток считается и может остаться в кошельке', () => {
    const s = newGame()
    const plan = { need: 45, want: 20, save: 20 }
    assert.equal(g.planLeft(s, plan), 15)
    assert.equal(g.checkPlan(s, plan, shop).ok, true)
  })

  test('предупреждение, если на нужное меньше минимума', () => {
    const s = newGame()
    assert.equal(g.minNeedCost(shop), 25)
    const res = g.checkPlan(s, { need: 20, want: 40, save: 40 }, shop)
    assert.equal(res.ok, true)
    assert.equal(res.warnings.length, 1)
  })

  test('после утверждения план не меняется', () => {
    const s = withPlan(newGame())
    assert.equal(s.week.phase, 'active')
    const again = g.confirmPlan(s, { need: 10, want: 10, save: 10 }, shop)
    assert.equal(again.ok, false)
    assert.deepEqual(s.week.plan, { need: 45, want: 30, save: 25 })
  })
})

describe('покупки', () => {
  test('до плана покупать нельзя', () => {
    const s = newGame()
    assert.deepEqual(g.buy(s, item('food-box')), { ok: false, error: 'plan' })
    assert.equal(s.wallet, rules.income)
  })

  test('покупка уменьшает кошелёк, пишется в историю и меняет питомца', () => {
    const s = withPlan(newGame())
    const res = g.buy(s, item('food-box'))
    assert.equal(res.ok, true)
    assert.equal(s.wallet, 70)
    assert.equal(s.week.spent.need, 30)
    assert.equal(s.week.bought.food, true)
    assert.equal(s.stats.food, 100)
    assert.deepEqual(s.week.ops.at(-1), { type: 'buy', kind: 'need', amount: -30, text: 'Корм на неделю' })
  })

  test('при нехватке денег покупка не проходит и баланс не уходит в минус', () => {
    const s = withPlan(newGame())
    g.buy(s, item('paints'))
    g.buy(s, item('train'))
    const res = g.buy(s, item('food-box'))
    assert.equal(res.ok, false)
    assert.equal(res.error, 'money')
    assert.equal(res.lack, 5)
    assert.equal(s.wallet, 25)
  })

  test('покупка сверх плана разрешена, но помечается', () => {
    const s = withPlan(newGame(), { need: 45, want: 20, save: 25 })
    const res = g.buy(s, item('paints'))
    assert.equal(res.ok, true)
    assert.equal(res.overPlan, 20)
  })

  test('вещь, которую можно надеть, покупается один раз', () => {
    const s = withPlan(newGame())
    assert.equal(g.buy(s, item('bow')).ok, true)
    assert.deepEqual(s.pet.accessories, ['bow'])
    assert.equal(g.buy(s, item('bow')).error, 'owned')
  })

  test('отложенная покупка попадает в список и убирается после покупки', () => {
    const s = withPlan(newGame())
    g.postpone(s, item('ball'))
    g.postpone(s, item('ball'))
    assert.deepEqual(s.wishlist, ['ball'])
    g.buy(s, item('ball'))
    assert.deepEqual(s.wishlist, [])
  })
})

describe('копилка и цели', () => {
  test('пополнение переносит монетки из кошелька в копилку', () => {
    const s = withPlan(newGame())
    const joy = s.stats.joy
    assert.equal(g.deposit(s, 20, rules).ok, true)
    assert.equal(s.wallet, 80)
    assert.equal(s.savings, 20)
    assert.equal(s.stats.joy, joy + rules.joy.firstDeposit)
    g.deposit(s, 5, rules)
    assert.equal(s.stats.joy, joy + rules.joy.firstDeposit, 'бонус настроения – один раз за неделю')
  })

  test('нельзя положить больше, чем в кошельке, и до плана', () => {
    const s = newGame()
    assert.equal(g.deposit(s, 10, rules).error, 'plan')
    withPlan(s)
    assert.equal(g.deposit(s, 500, rules).error, 'money')
    assert.equal(g.deposit(s, 0, rules).error, 'amount')
  })

  test('снять можно не больше, чем накоплено', () => {
    const s = withPlan(newGame())
    g.deposit(s, 30, rules)
    assert.equal(g.withdraw(s, 40).ok, false)
    assert.equal(g.withdraw(s, 10).ok, true)
    assert.equal(s.savings, 20)
    assert.equal(s.wallet, 80)
    assert.equal(g.savedThisWeek(s.week), 20)
  })

  test('срок до цели считается по среднему пополнению', () => {
    const s = withPlan(newGame())
    g.chooseGoal(s, 'house')
    g.deposit(s, 25, rules)
    const p = g.goalProgress(s, g.findGoal(s, goals))
    assert.equal(p.avg, 25)
    assert.equal(p.remaining, 125)
    assert.equal(p.weeks, 5)
  })

  test('перед снятием видно, как изменятся сумма и срок', () => {
    const s = withPlan(newGame())
    g.chooseGoal(s, 'house')
    g.deposit(s, 25, rules)
    const p = g.withdrawPreview(s, g.findGoal(s, goals), 25)
    assert.deepEqual(p, { savingsBefore: 25, savingsAfter: 0, remainingBefore: 125, remainingAfter: 150, weeksBefore: 5, weeksAfter: 6 })
  })

  test('срок не показывается, пока нет пополнений', () => {
    assert.equal(g.weeksToGoal(100, 0), null)
    assert.equal(g.weeksToGoal(0, 0), 0)
    assert.equal(g.weeksToGoal(30, 20), 2)
  })

  test('своя цель создаётся и сразу выбирается', () => {
    const s = newGame()
    const goal = g.addCustomGoal(s, { name: '  Мяч ', icon: '⚽', price: 50 })
    assert.equal(goal.name, 'Мяч')
    assert.equal(s.goal, goal.id)
    assert.equal(g.findGoal(s, goals).price, 50)
  })

  test('мечта исполняется только когда хватает накоплений', () => {
    const s = withPlan(newGame(), { need: 0, want: 0, save: 100 })
    const party = g.findGoal(s, goals, 'party')
    g.deposit(s, 70, rules)
    assert.equal(g.reachGoal(s, party, rules).ok, false)
    g.deposit(s, 10, rules)
    assert.equal(g.reachGoal(s, party, rules).ok, true)
    assert.equal(s.savings, 0)
    assert.equal(s.goal, null)
    assert.equal(g.chooseGoal(s, 'party'), false, 'исполненную цель не выбрать повторно')
  })
})

describe('задания', () => {
  const task = tasks.tasks[0]

  test('награда только за первое правильное решение', () => {
    const s = newGame()
    assert.equal(g.finishTask(s, task, false, rules).reward, 0)
    assert.equal(s.wallet, rules.income)
    assert.equal(g.finishTask(s, task, true, rules).reward, task.reward)
    assert.equal(g.finishTask(s, task, true, rules).reward, 0)
    assert.equal(s.wallet, rules.income + task.reward)
    assert.equal(s.tasks[task.id].tries, 3)
  })

  test('в обычном режиме задания открываются по неделям, в демо – сразу', () => {
    const normal = newGame({ demo: false })
    const demo = newGame({ demo: true })
    const late = tasks.tasks.find((t) => t.week > 1)
    assert.equal(g.isTaskOpen(normal, late), false)
    assert.equal(g.isTaskOpen(demo, late), true)
  })
})

describe('конец недели', () => {
  test('без плана неделю не завершить', () => {
    assert.deepEqual(g.canFinishWeek(newGame(), T0), { ok: false, reason: 'plan' })
  })

  test('после плана неделю можно завершить сразу, в любом режиме', () => {
    assert.equal(g.canFinishWeek(withPlan(newGame({ demo: false }))).ok, true)
    assert.equal(g.canFinishWeek(withPlan(newGame({ demo: true }))).ok, true)
  })

  test('хорошая неделя даёт 3 звезды и начинает новую неделю с доходом', () => {
    const s = withPlan(newGame())
    g.buy(s, item('food-box'))
    g.buy(s, item('haircut'))
    g.buy(s, item('ball'))
    g.deposit(s, 25, rules)
    const { summary } = g.finishWeek(s, rules, T0)
    assert.deepEqual(summary.checks, { needs: true, plan: true, savings: true })
    assert.equal(summary.earned, 3)
    assert.equal(s.stars, 3)
    assert.equal(s.week.n, 2)
    assert.equal(s.week.phase, 'plan')
    assert.equal(s.wallet, 10 + rules.income)
    assert.equal(s.history.length, 1)
  })

  test('без еды питомец голодает, но прогресс не теряется', () => {
    const s = withPlan(newGame())
    s.stars = 4
    g.buy(s, item('bath'))
    const { summary } = g.finishWeek(s, rules, T0)
    assert.equal(summary.checks.needs, false)
    assert.equal(summary.statsAfter.food, rules.startStats.food - rules.weeklyDecay.food)
    assert.ok(s.stars >= 4)
    assert.equal(g.petMood(s.stats), 'sad')
    assert.equal(g.weakestStat(s.stats), 'food')
  })

  test('трата сверх плана снимает звезду плана', () => {
    const s = withPlan(newGame(), { need: 45, want: 10, save: 25 })
    g.buy(s, item('food-box'))
    g.buy(s, item('bath'))
    g.buy(s, item('ball'))
    g.deposit(s, 25, rules)
    const { summary } = g.finishWeek(s, rules, T0)
    assert.equal(summary.checks.plan, false)
    assert.equal(summary.earned, 2)
  })

  test('показатели не выходят за 0–100', () => {
    const s = withPlan(newGame())
    for (let i = 0; i < 4; i++) {
      g.finishWeek(s, rules, T0)
      withPlan(s, { need: 0, want: 0, save: 0 })
    }
    assert.ok(Object.values(s.stats).every((v) => v >= 0 && v <= 100))
  })
})

describe('последствия запущенного ухода', () => {
  test('голодному питомцу игрушка радует вдвое меньше', () => {
    const s = withPlan(newGame())
    s.stats.food = 20
    const joy = s.stats.joy = 40
    const res = g.buy(s, item('ball'), rules)
    assert.equal(res.distracted, true)
    assert.equal(s.stats.joy, joy + 10)
  })

  test('сытому и чистому – полный эффект', () => {
    const s = withPlan(newGame())
    s.stats.joy = 40
    const res = g.buy(s, item('ball'), rules)
    assert.equal(res.distracted, false)
    assert.equal(s.stats.joy, 60)
  })

  test('нужное всегда действует полностью', () => {
    const s = withPlan(newGame())
    s.stats.food = 10
    g.buy(s, item('food-box'), rules)
    assert.equal(s.stats.food, 55)
  })

  test('две проблемы сразу – питомец очень грустит', () => {
    assert.equal(g.petMood({ food: 20, care: 20, joy: 80 }), 'upset')
    assert.equal(g.petMood({ food: 5, care: 90, joy: 90 }), 'upset')
    assert.equal(g.petMood({ food: 20, care: 90, joy: 90 }), 'sad')
  })

  test('купленная игрушка остаётся рядом с питомцем один раз', () => {
    const s = withPlan(newGame(), { need: 0, want: 100, save: 0 })
    g.buy(s, item('ball'), rules)
    g.buy(s, item('ball'), rules)
    g.buy(s, item('train'), rules)
    assert.deepEqual(s.pet.toys, ['ball', 'train'])
  })
})

describe('рост питомца', () => {
  test('стадии зависят от суммы звёзд', () => {
    assert.equal(g.stageIndex(0, rules.stages), 0)
    assert.equal(g.stageIndex(4, rules.stages), 0)
    assert.equal(g.stageIndex(5, rules.stages), 1)
    assert.equal(g.stageIndex(10, rules.stages), 2)
    assert.equal(g.stageIndex(99, rules.stages), 2)
  })

  test('одна хорошая неделя не меняет стадию, серия недель – меняет', () => {
    const s = newGame()
    const stages = []
    for (let week = 1; week <= 5; week++) {
      withPlan(s, { need: 45, want: 20, save: 25 + (s.wallet - 90) })
      g.buy(s, item('food-box'))
      g.buy(s, item('haircut'))
      g.deposit(s, s.week.plan.save, rules)
      const { summary } = g.finishWeek(s, rules, T0)
      stages.push(summary.stageAfter)
    }
    assert.deepEqual(stages, [0, 1, 1, 2, 2])
  })

  test('настроение питомца', () => {
    assert.equal(g.petMood({ food: 80, care: 70, joy: 60 }), 'happy')
    assert.equal(g.petMood({ food: 80, care: 40, joy: 90 }), 'ok')
    assert.equal(g.petMood({ food: 20, care: 90, joy: 90 }), 'sad')
  })
})

test('сквозной сценарий: деньги не появляются и не пропадают', () => {
  const s = newGame()
  let income = rules.income
  let spent = 0
  g.chooseGoal(s, 'party')
  for (let week = 1; week <= 5; week++) {
    withPlan(s, { need: 45, want: 30, save: Math.min(25, s.wallet - 75) })
    for (const id of ['food-box', 'bath', 'candy']) {
      const r = g.buy(s, item(id))
      if (r.ok) spent += item(id).price
    }
    const t = tasks.tasks[week - 1]
    income += g.finishTask(s, t, true, rules).reward
    g.deposit(s, s.week.plan.save, rules)
    if (s.savings >= 80 && s.goal === 'party') {
      g.reachGoal(s, g.findGoal(s, goals), rules)
      spent += 80
    }
    assert.ok(s.wallet >= 0)
    g.finishWeek(s, rules, T0)
    income += rules.income
  }
  assert.equal(s.wallet + s.savings + spent, income)
  assert.equal(s.goalsDone.length, 1)
})
