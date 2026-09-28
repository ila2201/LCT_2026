import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import * as g from '../www/js/game.js'
import { load, newGame } from './helpers.js'

const { chats, contacts } = load('chats')
const byId = (id) => chats.find((c) => c.id === id)

function paths(chat) {
  const out = []
  const walk = (stepId, count) => {
    const step = chat.steps[stepId]
    const n = count + step.in.length + 1
    for (const c of step.choices) {
      if (c.next) walk(c.next, n)
      else out.push({ end: c.end, messages: n + chat.ends[c.end].in.length })
    }
  }
  walk(chat.start, 0)
  return out
}

describe('контент переписок', () => {
  test('у каждого разговора есть собеседник, неделя и награда', () => {
    assert.ok(chats.length >= 5)
    assert.equal(new Set(chats.map((c) => c.id)).size, chats.length)
    for (const c of chats) {
      assert.ok(contacts[c.contact], c.id)
      assert.ok(c.week >= 1 && c.reward > 0, c.id)
    }
  })

  for (const chat of chats) {
    test(`${chat.id}: 4–10 сообщений, есть верный и неверный путь, все концовки достижимы`, () => {
      const list = paths(chat)
      for (const p of list) assert.ok(p.messages >= 4 && p.messages <= 10, `${p.end}: ${p.messages} сообщений`)
      const reached = new Set(list.map((p) => p.end))
      assert.deepEqual([...reached].sort(), Object.keys(chat.ends).sort())
      assert.ok(Object.values(chat.ends).some((e) => e.ok))
      assert.ok(Object.values(chat.ends).some((e) => !e.ok))
      assert.ok(Object.values(chat.ends).every((e) => e.lesson))
    })
  }

  test('есть разговоры с мошенниками', () => {
    assert.ok(chats.filter((c) => Object.values(c.ends).some((e) => e.loss)).length >= 2)
  })
})

describe('итоги переписки', () => {
  test('верный разговор даёт награду один раз', () => {
    const s = newGame()
    const chat = byId('mom-plan')
    assert.equal(g.finishChat(s, chat, 'good').reward, chat.reward)
    assert.equal(s.wallet, 100 + chat.reward)
    assert.equal(g.finishChat(s, chat, 'good').repeat, true)
    assert.equal(s.wallet, 100 + chat.reward)
  })

  test('поверил мошеннику – монетки пропадают, но не больше, чем в кошельке', () => {
    const s = newGame()
    s.savings = 50
    s.wallet = 10
    const res = g.finishChat(s, byId('scam-mom'), 'lost')
    assert.equal(res.loss, 10)
    assert.equal(s.wallet, 0)
    assert.equal(s.savings, 50, 'копилка не трогается')
    assert.equal(s.week.ops.at(-1).type, 'loss')
  })

  test('разговоры открываются по неделям, в демо – сразу', () => {
    const late = chats.find((c) => c.week > 1)
    assert.equal(g.isChatOpen(newGame({ demo: false }), late), false)
    assert.equal(g.isChatOpen(newGame({ demo: true }), late), true)
    assert.equal(g.unreadChats(newGame({ demo: false }), chats).length, chats.filter((c) => c.week === 1).length)
  })
})
