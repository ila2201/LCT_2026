import { header } from '../ui.js'
import { saveSettings } from '../storage.js'

const options = [
  ['sound', 'Звуки', 'Короткие звуки при покупках и заданиях'],
  ['anim', 'Анимации', 'Питомец двигается, экраны плавно появляются'],
  ['bigText', 'Крупный текст', 'Все надписи становятся больше'],
]

export default {
  render(app) {
    const st = app.settings
    return `
      <main class="screen">
        ${header('Настройки')}
        ${options.map(([key, title, hint]) => `
          <button class="card switch-row" role="switch" aria-checked="${st[key]}" data-action="toggle" data-key="${key}">
            <span class="grow"><b>${title}</b><span class="small muted">${hint}</span></span>
            <span class="switch ${st[key] ? 'on' : ''}" aria-hidden="true"></span>
            <span class="switch-label">${st[key] ? 'вкл' : 'выкл'}</span>
          </button>`).join('')}
        <button class="btn secondary" data-action="help">❓ Как играть</button>
        <button class="btn secondary" data-action="go" data-to="glossary">📖 Словарик</button>
        <p class="small muted">Размер текста также меняется в настройках телефона.</p>
      </main>`
  },

  actions: {
    toggle(app, data) {
      app.settings[data.key] = !app.settings[data.key]
      saveSettings(app.settings)
      app.applySettings()
      app.render()
    },
  },
}
