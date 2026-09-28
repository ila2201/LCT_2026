import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rules, shop, goals, pets, tasks, load } from './helpers.js'
import { CONTENT_FILES } from '../www/js/content.js'

const unique = (list) => new Set(list).size === list.length

test('все файлы контента читаются', () => {
  for (const name of CONTENT_FILES) assert.ok(load(name))
})

test('питомец: не меньше 9 различимых комбинаций', () => {
  const combos = pets.species.length * pets.colors.length * pets.patterns.length * pets.genders.length
  assert.ok(combos >= 9, `комбинаций ${combos}`)
})

test('рост питомца: не меньше 3 стадий, пороги растут', () => {
  assert.ok(rules.stages.length >= 3)
  assert.equal(rules.stages[0].stars, 0)
  rules.stages.slice(1).forEach((s, i) => assert.ok(s.stars > rules.stages[i].stars))
})

test('задания: не меньше 6, по 3 темам, у каждого – объяснения', () => {
  const list = tasks.tasks
  assert.ok(list.length >= 6)
  assert.ok(unique(list.map((t) => t.id)))
  for (const topic of ['budget', 'savings', 'payments']) {
    assert.ok(list.filter((t) => t.topic === topic).length >= 2, topic)
  }
  for (const t of list) {
    assert.ok(tasks.topics[t.topic], `${t.id}: тема`)
    assert.ok(t.reward > 0 && t.week >= 1, `${t.id}: награда и неделя`)
    if (t.type === 'scenario') assert.ok(Object.values(t.ends).every((e) => e.text))
    else assert.ok(t.right && t.wrong, `${t.id}: тексты`)
  }
})

test('покупки: не меньше 8, обоих типов, есть еда и уход', () => {
  assert.ok(shop.length >= 8)
  assert.ok(unique(shop.map((i) => i.id)))
  assert.ok(shop.some((i) => i.kind === 'need' && i.need === 'food'))
  assert.ok(shop.some((i) => i.kind === 'need' && i.need === 'care'))
  assert.ok(shop.some((i) => i.kind === 'want'))
  for (const i of shop) {
    assert.ok(['need', 'want'].includes(i.kind))
    assert.equal(i.price % rules.planStep, 0, `${i.id}: цена кратна шагу плана`)
    for (const k of Object.keys(i.effect)) assert.ok(rules.stats[k], `${i.id}: показатель ${k}`)
  }
})

test('ограниченность: всё сразу за неделю не купить', () => {
  const total = shop.reduce((s, i) => s + i.price, 0)
  assert.ok(total > rules.income * 2)
})

test('цели: не меньше 3 с понятной ценой', () => {
  assert.ok(goals.presets.length >= 3)
  assert.ok(goals.presets.every((g) => g.price > 0 && g.name))
  assert.ok(goals.custom.prices.length > 0)
})

test('словарик не пустой', () => {
  assert.ok(load('glossary').length >= 8)
})
