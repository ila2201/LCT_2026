import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { checkTask, TASK_TYPES } from '../www/js/task-check.js'
import { tasks } from './helpers.js'

const byId = (id) => tasks.tasks.find((t) => t.id === id)

describe('проверка ответов', () => {
  test('sort: всё разложено верно / есть ошибка', () => {
    const t = byId('need-or-want')
    const right = Object.fromEntries(t.items.map((it, i) => [i, it.answer]))
    assert.equal(checkTask(t, right).ok, true)
    const wrong = { ...right, 1: 'need' }
    const res = checkTask(t, wrong)
    assert.equal(res.ok, false)
    assert.equal(res.notes.length, 1)
    assert.equal(res.text, t.wrong)
  })

  test('basket: нужное в корзине и уложились в бюджет', () => {
    const t = byId('picnic')
    assert.equal(checkTask(t, ['water', 'sandwich', 'apples']).ok, true)
    const over = checkTask(t, ['water', 'sandwich', 'ball'])
    assert.equal(over.ok, false)
    assert.equal(over.total, 55)
    const missing = checkTask(t, ['sandwich', 'cake'])
    assert.equal(missing.ok, false)
    assert.match(missing.notes[0], /Вода/)
  })

  test('save: только 30 в неделю подходит под условия', () => {
    const t = byId('scooter')
    assert.equal(checkTask(t, 30).ok, true)
    assert.equal(checkTask(t, 25).ok, false)
    assert.equal(checkTask(t, 35).ok, false)
    assert.match(checkTask(t, 25).notes[0], /4 недели/)
  })

  test('scenario: результат зависит от концовки', () => {
    const t = byId('surprise')
    assert.equal(checkTask(t, 'good').ok, true)
    assert.equal(checkTask(t, 'candy').ok, false)
    assert.equal(checkTask(t, 'candy').text, t.ends.candy.text)
  })

  test('pay: нужно собрать ровно цену', () => {
    const t = byId('exact-pay')
    assert.equal(checkTask(t, [0, 1, 3, 4]).ok, true)
    assert.equal(checkTask(t, [0, 1, 2]).ok, false)
    assert.equal(checkTask(t, [0, 1]).sum, 30)
  })

  test('number: сравнение с правильным ответом', () => {
    const t = byId('receipt')
    assert.equal(checkTask(t, 95).ok, true)
    assert.equal(checkTask(t, 105).ok, false)
  })

  test('неизвестный тип задания – понятная ошибка', () => {
    assert.throws(() => checkTask({ type: 'quiz' }, 1), /Неизвестный тип/)
  })
})

function solve(t) {
  switch (t.type) {
    case 'sort':
      return Object.fromEntries(t.items.map((it, i) => [i, it.answer]))
    case 'basket':
      return t.items.filter((i) => i.required).map((i) => i.id)
    case 'save':
      for (let a = 0; a <= t.income; a += t.step) if (checkTask(t, a).ok) return a
      return null
    case 'scenario':
      return Object.keys(t.ends).find((k) => t.ends[k].ok)
    case 'pay': {
      const n = t.coins.length
      for (let mask = 1; mask < 1 << n; mask++) {
        const picked = [...Array(n).keys()].filter((i) => mask & (1 << i))
        if (checkTask(t, picked).ok) return picked
      }
      return null
    }
    case 'number':
      return t.answer
  }
}

function breakIt(t) {
  switch (t.type) {
    case 'sort':
      return {}
    case 'basket':
      return t.items.map((i) => i.id)
    case 'save':
      return 0
    case 'scenario':
      return Object.keys(t.ends).find((k) => !t.ends[k].ok)
    case 'pay':
      return []
    case 'number':
      return t.answer + 10
  }
}

function reachableEnds(t) {
  const seen = new Set()
  const ends = new Set()
  const walk = (id) => {
    if (seen.has(id)) return
    seen.add(id)
    for (const c of t.steps[id].choices) {
      if (c.next) walk(c.next)
      if (c.end) ends.add(c.end)
    }
  }
  walk(t.start)
  return ends
}

describe('задания из контента', () => {
  for (const t of tasks.tasks) {
    test(`${t.id}: есть правильное и ошибочное решение`, () => {
      assert.ok(TASK_TYPES.includes(t.type))
      const good = solve(t)
      assert.notEqual(good, null)
      assert.equal(checkTask(t, good).ok, true)
      assert.equal(checkTask(t, breakIt(t)).ok, false)
      if (t.type === 'scenario') assert.deepEqual([...reachableEnds(t)].sort(), Object.keys(t.ends).sort())
    })
  }
})
