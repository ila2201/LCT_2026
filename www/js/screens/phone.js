import { isChatOpen, chatRecord } from '../game.js'
import { header } from '../ui.js'
import { esc } from '../format.js'

function status(state, chat) {
  const rec = chatRecord(state, chat)
  if (!isChatOpen(state, chat)) return `<span class="mark">🔒 неделя ${chat.week}</span>`
  if (!rec) return '<span class="badge">новое</span>'
  if (rec.ok) return '<span class="mark ok">✔</span>'
  return '<span class="mark no">✘</span>'
}

export default {
  render(app) {
    const s = app.state
    const { chats, contacts } = app.content.chats
    const rows = chats.map((chat) => {
      const who = contacts[chat.contact]
      const open = isChatOpen(s, chat)
      const preview = open ? chat.steps[chat.start].in[0] : 'Сообщение придёт позже'
      return `
        <button class="card link-card chat-row" data-action="open" data-id="${chat.id}" ${open ? '' : 'disabled'}>
          <span class="avatar" aria-hidden="true">${who.avatar}</span>
          <span class="grow">
            <b>${esc(who.name)}</b>
            ${who.unknown ? '<span class="small warn">неизвестный номер</span>' : ''}
            <span class="small muted">${esc(preview)}</span>
          </span>
          ${status(s, chat)}
        </button>`
    })
    return `
      <main class="screen">
        ${header('📱 Телефон')}
        <p class="lead">Здесь пишут родные и друзья. А иногда – мошенники. Подумай, прежде чем отвечать!</p>
        <p class="small muted">За правильный разговор – монетки. Если поверить обманщику, монетки из кошелька пропадут (копилка в безопасности).</p>
        ${rows.join('')}
      </main>`
  },

  actions: {
    open(app, data) {
      app.go('chat', { id: data.id })
    },
  },
}
