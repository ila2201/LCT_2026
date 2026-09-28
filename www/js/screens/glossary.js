import { header } from '../ui.js'

export default {
  render(app) {
    return `
      <main class="screen">
        ${header('Словарик')}
        <p class="lead">Короткие объяснения слов, которые встречаются в игре.</p>
        <dl class="glossary">
          ${app.content.glossary.map((g) => `<div class="card"><dt>${g.term}</dt><dd>${g.text}</dd></div>`).join('')}
        </dl>
      </main>`
  },
}
