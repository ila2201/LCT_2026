export const STATE_VERSION = 1

const clamp = (v) => Math.max(0, Math.min(100, v))

export function createProfile({ pet, demo = false }, rules, now = Date.now()) {
  const state = {
    version: STATE_VERSION,
    demo,
    pet: { name: pet.name, gender: pet.gender || 'boy', species: pet.species, color: pet.color, pattern: pet.pattern, accessories: [], toys: [] },
    stats: { ...rules.startStats },
    wallet: 0,
    savings: 0,
    totalDeposited: 0,
    goal: null,
    customGoals: [],
    goalsDone: [],
    stars: 0,
    tasks: {},
    chats: {},
    wishlist: [],
    history: [],
    week: null,
    createdAt: now,
  }
  startWeek(state, rules, now, 'Стартовый бюджет')
  return state
}

export function startWeek(state, rules, now = Date.now(), source = 'Карманные монетки на неделю') {
  state.week = {
    n: state.week ? state.week.n + 1 : 1,
    phase: 'plan',
    startedAt: now,
    draft: { need: 0, want: 0, save: 0 },
    plan: null,
    spent: { need: 0, want: 0 },
    deposited: 0,
    withdrawn: 0,
    bought: { food: false, care: false },
    ops: [],
  }
  addIncome(state, rules.income, source)
}

export function addIncome(state, amount, source) {
  state.wallet += amount
  state.week.ops.push({ type: 'income', amount, text: source })
}

export function planTotal(plan) {
  return plan.need + plan.want + plan.save
}

export function planLeft(state, plan) {
  return state.wallet - planTotal(plan)
}

export function minNeedCost(shop) {
  const cheapest = (need) => Math.min(...shop.filter((i) => i.need === need).map((i) => i.price))
  return cheapest('food') + cheapest('care')
}

export function checkPlan(state, plan, shop) {
  const values = [plan.need, plan.want, plan.save]
  if (values.some((v) => !Number.isInteger(v) || v < 0)) {
    return { ok: false, error: 'Суммы должны быть целыми и не меньше нуля.' }
  }
  if (planLeft(state, plan) < 0) {
    return { ok: false, error: `Распределено ${planTotal(plan)}, а в кошельке только ${state.wallet}.` }
  }
  const warnings = []
  const minNeed = minNeedCost(shop)
  if (plan.need < minNeed) {
    warnings.push(`На нужное меньше ${minNeed}. Этого может не хватить на еду и уход.`)
  }
  return { ok: true, warnings }
}

export function confirmPlan(state, plan, shop) {
  if (state.week.phase !== 'plan') return { ok: false, error: 'План на эту неделю уже утверждён.' }
  const res = checkPlan(state, plan, shop)
  if (!res.ok) return res
  state.week.plan = { need: plan.need, want: plan.want, save: plan.save }
  state.week.phase = 'active'
  return res
}

export function savedThisWeek(week) {
  return week.deposited - week.withdrawn
}

export function isOwned(state, item) {
  return Boolean(item.wear) && state.pet.accessories.includes(item.wear)
}

export function purchaseInfo(state, item) {
  const w = state.week
  const planLeftForKind = w.plan ? w.plan[item.kind] - w.spent[item.kind] : 0
  return {
    owned: isOwned(state, item),
    lack: Math.max(0, item.price - state.wallet),
    planLeft: planLeftForKind,
    overPlan: Math.max(0, item.price - Math.max(0, planLeftForKind)),
  }
}

export function applyEffect(state, effect = {}) {
  for (const key of Object.keys(effect)) {
    state.stats[key] = clamp(state.stats[key] + effect[key])
  }
}

export function buy(state, item, rules) {
  if (state.week.phase !== 'active') return { ok: false, error: 'plan' }
  const info = purchaseInfo(state, item)
  if (info.owned) return { ok: false, error: 'owned' }
  if (info.lack > 0) return { ok: false, error: 'money', lack: info.lack }

  const before = { wallet: state.wallet, stats: { ...state.stats } }
  const effect = rules ? itemEffect(state, item, rules) : item.effect
  const distracted = Boolean(item.effect.joy) && effect.joy < item.effect.joy
  state.wallet -= item.price
  state.week.spent[item.kind] += item.price
  if (item.need) state.week.bought[item.need] = true
  if (item.wear) state.pet.accessories.push(item.wear)
  if (item.toy) {
    state.pet.toys = state.pet.toys || []
    if (!state.pet.toys.includes(item.toy)) state.pet.toys.push(item.toy)
  }
  applyEffect(state, effect)
  state.wishlist = state.wishlist.filter((id) => id !== item.id)
  state.week.ops.push({ type: 'buy', kind: item.kind, amount: -item.price, text: item.name })
  return { ok: true, before, overPlan: info.overPlan, distracted }
}

export function postpone(state, item) {
  if (!state.wishlist.includes(item.id)) state.wishlist.push(item.id)
}

export function deposit(state, amount, rules) {
  if (state.week.phase !== 'active') return { ok: false, error: 'plan' }
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'amount' }
  if (amount > state.wallet) return { ok: false, error: 'money', lack: amount - state.wallet }

  const first = state.week.deposited === 0
  const joyBefore = state.stats.joy
  state.wallet -= amount
  state.savings += amount
  state.totalDeposited += amount
  state.week.deposited += amount
  if (first) state.stats.joy = clamp(state.stats.joy + rules.joy.firstDeposit)
  state.week.ops.push({ type: 'deposit', amount: -amount, text: 'В копилку' })
  return { ok: true, joy: state.stats.joy - joyBefore }
}

export function withdraw(state, amount) {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'amount' }
  if (amount > state.savings) return { ok: false, error: 'savings' }
  state.savings -= amount
  state.wallet += amount
  state.week.withdrawn += amount
  state.week.ops.push({ type: 'withdraw', amount, text: 'Из копилки' })
  return { ok: true }
}

export function avgDeposit(state) {
  return Math.round(state.totalDeposited / state.week.n)
}

export function weeksToGoal(remaining, avg) {
  if (remaining <= 0) return 0
  if (avg <= 0) return null
  return Math.ceil(remaining / avg)
}

export function allGoals(state, goals) {
  return [...goals.presets, ...state.customGoals]
}

export function findGoal(state, goals, id = state.goal) {
  return allGoals(state, goals).find((g) => g.id === id) || null
}

export function goalProgress(state, goal) {
  const remaining = Math.max(0, goal.price - state.savings)
  const avg = avgDeposit(state)
  return {
    saved: Math.min(state.savings, goal.price),
    remaining,
    percent: Math.min(100, Math.round((state.savings / goal.price) * 100)),
    avg,
    weeks: weeksToGoal(remaining, avg),
  }
}

export function withdrawPreview(state, goal, amount) {
  const now = goalProgress(state, goal)
  const savingsAfter = state.savings - amount
  const remainingAfter = Math.max(0, goal.price - savingsAfter)
  return {
    savingsBefore: state.savings,
    savingsAfter,
    remainingBefore: now.remaining,
    remainingAfter,
    weeksBefore: now.weeks,
    weeksAfter: weeksToGoal(remainingAfter, now.avg),
  }
}

export function isGoalDone(state, id) {
  return state.goalsDone.some((g) => g.id === id)
}

export function chooseGoal(state, id) {
  if (isGoalDone(state, id)) return false
  state.goal = id
  return true
}

export function addCustomGoal(state, { name, icon, price }) {
  const goal = { id: `my-${state.customGoals.length + 1}`, name: name.trim() || 'Моя цель', icon, price, custom: true }
  state.customGoals.push(goal)
  state.goal = goal.id
  return goal
}

export function reachGoal(state, goal, rules) {
  if (state.savings < goal.price) return { ok: false }
  state.savings -= goal.price
  state.goalsDone.push({ id: goal.id, name: goal.name, icon: goal.icon, week: state.week.n })
  state.goal = null
  state.stats.joy = clamp(state.stats.joy + rules.joy.goal)
  state.week.ops.push({ type: 'goal', amount: 0, text: `Мечта сбылась: ${goal.name} (из копилки ${goal.price})` })
  return { ok: true }
}

export function isTaskOpen(state, task) {
  return state.demo || task.week <= state.week.n
}

export function isTaskDone(state, task) {
  return Boolean(state.tasks[task.id] && state.tasks[task.id].done)
}

export function finishTask(state, task, ok, rules) {
  const rec = state.tasks[task.id] || { done: false, tries: 0 }
  rec.tries += 1
  let reward = 0
  if (ok && !rec.done) {
    rec.done = true
    rec.week = state.week.n
    reward = task.reward
    addIncome(state, reward, `Задание «${task.title}»`)
    state.stats.joy = clamp(state.stats.joy + rules.joy.task)
  }
  state.tasks[task.id] = rec
  return { reward }
}

export function nextTask(state, tasks) {
  return tasks.find((t) => isTaskOpen(state, t) && !isTaskDone(state, t)) || null
}

export function isChatOpen(state, chat) {
  return state.demo || chat.week <= state.week.n
}

export function chatRecord(state, chat) {
  return (state.chats || {})[chat.id] || null
}

export function unreadChats(state, chats) {
  return chats.filter((c) => isChatOpen(state, c) && !chatRecord(state, c))
}

export function finishChat(state, chat, endId) {
  const end = chat.ends[endId]
  state.chats = state.chats || {}
  if (state.chats[chat.id]) return { reward: 0, loss: 0, repeat: true }
  let reward = 0
  let loss = 0
  if (end.ok) {
    reward = chat.reward
    addIncome(state, reward, `Сообщения: ${chat.title}`)
  } else if (end.loss) {
    loss = Math.min(end.loss, state.wallet)
    state.wallet -= loss
    state.week.ops.push({ type: 'loss', amount: -loss, text: `Обман в сообщениях: ${chat.title}` })
  }
  state.chats[chat.id] = { ok: end.ok, end: endId, week: state.week.n }
  return { reward, loss, repeat: false }
}

export function petMood(stats) {
  const values = [stats.food, stats.care, stats.joy]
  const min = Math.min(...values)
  const low = values.filter((v) => v < 30).length
  if (low >= 2 || min < 10) return 'upset'
  if (min < 30) return 'sad'
  if (min >= 60) return 'happy'
  return 'ok'
}

export function isNeedy(stats, rules) {
  return stats.food < rules.needsFirst.below || stats.care < rules.needsFirst.below
}

export function itemEffect(state, item, rules) {
  const effect = { ...item.effect }
  if (item.kind === 'want' && effect.joy && isNeedy(state.stats, rules)) {
    effect.joy = Math.round(effect.joy * rules.needsFirst.joyFactor)
  }
  return effect
}

export function weakestStat(stats) {
  return ['food', 'care', 'joy'].reduce((a, b) => (stats[b] < stats[a] ? b : a))
}

export function stageIndex(stars, stages) {
  let index = 0
  stages.forEach((s, i) => {
    if (stars >= s.stars) index = i
  })
  return index
}

export function canFinishWeek(state) {
  if (state.week.phase !== 'active') return { ok: false, reason: 'plan' }
  return { ok: true }
}

export function weekChecks(week) {
  const saved = savedThisWeek(week)
  return {
    needs: week.bought.food && week.bought.care,
    plan: week.spent.need <= week.plan.need && week.spent.want <= week.plan.want && saved >= week.plan.save,
    savings: saved > 0,
  }
}

export function finishWeek(state, rules, now = Date.now()) {
  const check = canFinishWeek(state)
  if (!check.ok) return check

  const w = state.week
  const checks = weekChecks(w)
  const earned = Object.values(checks).filter(Boolean).length
  const statsBefore = { ...state.stats }
  const stageBefore = stageIndex(state.stars, rules.stages)

  for (const key of Object.keys(rules.weeklyDecay)) {
    state.stats[key] = clamp(state.stats[key] - rules.weeklyDecay[key])
  }
  if (checks.plan) state.stats.joy = clamp(state.stats.joy + rules.joy.planKept)
  state.stars += earned

  const summary = {
    n: w.n,
    plan: w.plan,
    fact: { need: w.spent.need, want: w.spent.want, save: savedThisWeek(w) },
    bought: { ...w.bought },
    checks,
    earned,
    stars: state.stars,
    statsBefore,
    statsAfter: { ...state.stats },
    stageBefore,
    stageAfter: stageIndex(state.stars, rules.stages),
    wallet: state.wallet,
    savings: state.savings,
    ops: w.ops,
  }
  state.history.push(summary)
  startWeek(state, rules, now)
  return { ok: true, summary }
}
