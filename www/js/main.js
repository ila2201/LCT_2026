import { loadContent } from './content.js'
import { loadProfile, saveProfile, loadSettings } from './storage.js'
import { closeSheet, isSheetOpen } from './ui.js'
import * as sound from './sound.js'

import welcome from './screens/welcome.js'
import intro from './screens/intro.js'
import create from './screens/create.js'
import home from './screens/home.js'
import plan from './screens/plan.js'
import shop from './screens/shop.js'
import savings from './screens/savings.js'
import tasks from './screens/tasks.js'
import task from './screens/task.js'
import progress from './screens/progress.js'
import summary from './screens/summary.js'
import adult from './screens/adult.js'
import glossary from './screens/glossary.js'
import settings from './screens/settings.js'
import phone from './screens/phone.js'
import chat from './screens/chat.js'

const screens = { welcome, intro, create, home, plan, shop, savings, tasks, task, progress, summary, adult, glossary, settings, phone, chat }
const withoutProfile = ['welcome', 'intro', 'create']

const app = {
  content: null,
  state: null,
  settings: null,
  screen: 'welcome',
  params: {},
  depth: 0,

  go(name, params = {}, { replace = false } = {}) {
    closeSheet()
    this.screen = name
    this.params = params
    if (!replace) this.depth += 1
    const entry = { screen: name, params, depth: this.depth }
    if (replace) history.replaceState(entry, '')
    else history.pushState(entry, '')
    this.render()
    window.scrollTo(0, 0)
  },

  back() {
    if (this.depth > 0) history.back()
    else this.go(this.state ? 'home' : 'welcome', {}, { replace: true })
  },

  render() {
    if (!this.state && !withoutProfile.includes(this.screen)) this.screen = 'welcome'
    const screen = screens[this.screen]
    const root = document.getElementById('app')
    root.innerHTML = screen.render(this)
    if (this.shown !== this.screen) {
      const main = root.querySelector('.screen')
      if (main) main.classList.add('enter')
      this.shown = this.screen
    }
    if (screen.mounted) screen.mounted(this)
  },

  save() {
    if (this.state) saveProfile(this.state)
  },

  commit() {
    this.save()
    this.render()
  },

  applySettings() {
    sound.setEnabled(this.settings.sound)
    document.documentElement.classList.toggle('no-anim', !this.settings.anim)
    document.documentElement.classList.toggle('big-text', this.settings.bigText)
  },
}

const globalActions = {
  back: (app) => app.back(),
  'close-sheet': () => closeSheet(),
  go: (app, data) => app.go(data.to, data.id ? { id: data.id } : {}),
  help: (app) => app.go('intro', { again: true }),
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]')
  if (!el || el.disabled) return
  const screen = screens[app.screen]
  const name = el.dataset.action
  const handler = (screen.actions && screen.actions[name]) || globalActions[name]
  if (handler) handler(app, el.dataset, el)
})

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]')
  const screen = screens[app.screen]
  if (el && screen.inputs && screen.inputs[el.dataset.input]) screen.inputs[el.dataset.input](app, el.value, el)
})

window.addEventListener('popstate', (e) => {
  if (isSheetOpen()) closeSheet()
  const entry = e.state
  if (!entry) return
  app.screen = entry.screen
  app.params = entry.params || {}
  app.depth = entry.depth || 0
  app.render()
})

async function start() {
  app.settings = loadSettings()
  app.applySettings()
  try {
    app.content = await loadContent()
  } catch (e) {
    document.getElementById('app').innerHTML = `<div class="fatal"><h1>Не получилось загрузить игру</h1><p>${e.message}</p></div>`
    return
  }
  app.state = loadProfile()
  app.go(app.state ? 'home' : 'welcome', {}, { replace: true })
}

if ('serviceWorker' in navigator && !window.Capacitor && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}

start()
