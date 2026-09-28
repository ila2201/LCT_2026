import { petSvg } from '../pet.js'

export default {
  render(app) {
    const demoPet = { species: 'cat', color: 'sun', pattern: 'plain', accessories: ['scarf'] }
    return `
      <main class="screen welcome">
        <div class="welcome-pet">${petSvg(demoPet, app.content.pets, { stage: 1, size: 200, label: 'Питомец Финни' })}</div>
        <h1 class="title">Питомец Финни</h1>
        <p class="lead">Игра про карманные деньги: планируй, покупай нужное и копи на мечту.</p>
        <button class="btn primary big" data-action="start">Начать</button>
        <button class="btn ghost" data-action="start-demo">Демо-режим для проверки</button>
        <p class="small muted">Без регистрации и интернета. Монетки в игре не настоящие.</p>
      </main>`
  },

  actions: {
    start(app) {
      app.demoStart = false
      app.go('intro', {}, { replace: true })
    },
    'start-demo'(app) {
      app.demoStart = true
      app.go('intro', {}, { replace: true })
    },
  },
}
