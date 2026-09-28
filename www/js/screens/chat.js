import { finishChat, chatRecord } from '../game.js'
import { header, changeRow } from '../ui.js'
import { esc } from '../format.js'
import { play } from '../sound.js'

let cur = null

function start(app, chat) {
  cur = {
    id: chat.id,
    step: chat.start,
    log: chat.steps[chat.start].in.map((text) => ({ from: 'them', text })),
    fresh: 0,
    repeat: Boolean(chatRecord(app.state, chat)),
    result: null,
  }
}

const findChat = (app) => app.content.chats.chats.find((c) => c.id === app.params.id)

function bubbles() {
  return cur.log
    .map((m, i) => {
      const isNew = i >= cur.fresh
      const delay = isNew ? (i - cur.fresh) * 0.35 : 0
      return `<p class="msg msg-${m.from} ${isNew ? 'new' : ''}" style="animation-delay:${delay}s">${esc(m.text)}</p>`
    })
    .join('')
}

function resultCard(chat) {
  const end = chat.ends[cur.result.end]
  const { reward, loss, walletBefore, walletAfter } = cur.result
  let title = end.ok ? '✔ Правильный разговор' : '✘ Можно было лучше'
  if (end.loss) title = '✘ Это был обман'
  return `
    <section class="card result ${end.ok ? 'ok' : 'no'}" id="result">
      <h2>${title}</h2>
      <p>${esc(end.lesson)}</p>
      ${reward || loss ? `<div class="changes">${changeRow(reward ? `Кошелёк (+${reward})` : `Кошелёк (−${loss})`, walletBefore, walletAfter)}</div>` : ''}
      ${loss ? '<p class="small">Копилка и звёзды роста в безопасности. Монетки можно заработать снова – в заданиях.</p>' : ''}
      ${cur.repeat ? '<p class="small muted">Это повтор: монетки не начисляются и не списываются.</p>' : ''}
      <div class="row gap">
        <button class="btn primary grow" data-action="back">Готово</button>
        <button class="btn ghost grow" data-action="again">Ещё раз</button>
      </div>
    </section>`
}

export default {
  render(app) {
    const chat = findChat(app)
    if (!app.params.started || !cur || cur.id !== chat.id) {
      start(app, chat)
      app.params.started = true
    }
    const who = app.content.chats.contacts[chat.contact]
    const step = chat.steps[cur.step]
    return `
      <main class="screen chat-screen">
        ${header(`${who.avatar} ${who.name}`)}
        ${who.unknown ? '<p class="small warn center">⚠ Этого номера нет в твоих контактах</p>' : ''}
        ${cur.repeat && !cur.result ? '<p class="small muted center">Повтор разговора – без монеток</p>' : ''}
        <div class="chat">${bubbles()}</div>
        ${cur.result
          ? resultCard(chat)
          : `<div class="choices chat-choices">${step.choices.map((c, i) => `<button class="btn secondary" data-action="answer" data-i="${i}">${esc(c.text)}</button>`).join('')}</div>`}
      </main>`
  },

  mounted() {
    window.scrollTo(0, document.body.scrollHeight)
  },

  actions: {
    answer(app, data) {
      const chat = findChat(app)
      const choice = chat.steps[cur.step].choices[Number(data.i)]
      cur.fresh = cur.log.length
      cur.log.push({ from: 'me', text: choice.text })
      if (choice.next) {
        cur.step = choice.next
        chat.steps[choice.next].in.forEach((text) => cur.log.push({ from: 'them', text }))
        cur.fresh += 1
        app.render()
        return
      }
      const end = chat.ends[choice.end]
      end.in.forEach((text) => cur.log.push({ from: 'them', text }))
      cur.fresh += 1
      const walletBefore = app.state.wallet
      const res = finishChat(app.state, chat, choice.end)
      cur.result = { end: choice.end, reward: res.reward, loss: res.loss, walletBefore, walletAfter: app.state.wallet }
      play(end.ok ? (res.reward ? 'coin' : 'ok') : 'soft')
      app.commit()
    },
    again(app) {
      start(app, findChat(app))
      app.render()
    },
  },
}
