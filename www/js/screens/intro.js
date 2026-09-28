import { petSvg } from '../pet.js'
import { header } from '../ui.js'

export default {
  render(app) {
    const { slides } = app.content.intro
    const { rules, pets } = app.content
    const i = app.params.slide || 0
    const slide = slides[i]
    const last = i === slides.length - 1
    const pet = app.state ? app.state.pet : { species: 'cat', color: 'sun', pattern: 'plain' }

    let body = ''
    if (slide.pet) body = `<div class="center">${petSvg(pet, pets, { size: 170, label: 'Питомец' })}</div>`
    if (slide.choices) {
      body = slide.choices
        .map((c) => `
          <div class="choice-card cat-${c.kind}">
            <span class="choice-icon" aria-hidden="true">${rules.categories[c.kind].icon}</span>
            <div><b>${c.title}</b><p>${c.text}</p></div>
          </div>`)
        .join('')
    }
    if (slide.steps) {
      body = `<ol class="steps">${slide.steps.map((s) => `<li>${s}</li>`).join('')}</ol>`
    }

    const finishLabel = app.params.again ? 'Понятно' : 'Создать питомца'
    return `
      <main class="screen intro">
        ${app.params.again ? header('Как играть') : ''}
        <div class="dots" aria-label="Шаг ${i + 1} из ${slides.length}">
          ${slides.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}
        </div>
        <h1 class="title">${slide.title}</h1>
        ${slide.text ? `<p class="lead">${slide.text}</p>` : ''}
        ${body}
        <div class="row gap">
          ${i > 0 ? '<button class="btn ghost" data-action="prev">Назад</button>' : ''}
          <button class="btn primary grow" data-action="${last ? 'finish' : 'next'}">${last ? finishLabel : 'Дальше'}</button>
        </div>
      </main>`
  },

  actions: {
    next(app) {
      app.params.slide = (app.params.slide || 0) + 1
      app.render()
    },
    prev(app) {
      app.params.slide = Math.max(0, (app.params.slide || 0) - 1)
      app.render()
    },
    finish(app) {
      if (app.params.again) app.back()
      else app.go('create', { step: 1 }, { replace: true })
    },
  },
}
