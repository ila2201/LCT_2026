import { esc } from './format.js'

export function header(title, { back = true, extra = '' } = {}) {
  return `
    <header class="bar">
      ${back ? '<button class="icon-btn" data-action="back" aria-label="Назад">←</button>' : ''}
      <h1>${esc(title)}</h1>
      ${extra}
    </header>`
}

export function money(n, cls = '') {
  return `<span class="money ${cls}"><i class="coin" aria-hidden="true"></i>${n}</span>`
}

export function progress(value, max, { cls = '', label = '' } = {}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0
  return `
    <div class="progress ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-label="${esc(label)}">
      <div style="width:${pct}%"></div>
    </div>`
}

export function changeRow(label, before, after, suffix = '') {
  const same = before === after
  return `
    <div class="change">
      <span>${label}</span>
      <b>${same ? `${after}${suffix}` : `${before} → ${after}${suffix}`}</b>
    </div>`
}

export function yesNo(ok, yes = 'да', no = 'нет') {
  return ok ? `<span class="mark ok">✔ ${yes}</span>` : `<span class="mark no">✘ ${no}</span>`
}

let sheetEl = null

export function openSheet(html, { onClose } = {}) {
  closeSheet()
  sheetEl = document.createElement('div')
  sheetEl.className = 'sheet-wrap'
  sheetEl.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`
  sheetEl.addEventListener('click', (e) => {
    if (e.target === sheetEl) closeSheet()
  })
  sheetEl.onCloseCb = onClose
  document.body.appendChild(sheetEl)
  const first = sheetEl.querySelector('button, input')
  if (first) first.focus({ preventScroll: true })
  return sheetEl
}

export function updateSheet(html) {
  if (sheetEl) sheetEl.querySelector('.sheet').innerHTML = html
}

export function closeSheet() {
  if (!sheetEl) return
  const cb = sheetEl.onCloseCb
  sheetEl.remove()
  sheetEl = null
  if (cb) cb()
}

export const isSheetOpen = () => Boolean(sheetEl)

export function ask({ title, body = '', yes = 'Да', no = 'Отмена', danger = false }) {
  return new Promise((resolve) => {
    let answered = false
    const el = openSheet(
      `<h2>${esc(title)}</h2>
       <div class="sheet-body">${body}</div>
       <div class="sheet-actions">
         <button class="btn ${danger ? 'danger' : 'primary'}" data-answer="yes">${esc(yes)}</button>
         <button class="btn ghost" data-answer="no">${esc(no)}</button>
       </div>`,
      { onClose: () => { if (!answered) resolve(false) } },
    )
    el.querySelectorAll('[data-answer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        answered = true
        closeSheet()
        resolve(btn.dataset.answer === 'yes')
      })
    })
  })
}

export function showResult({ icon = '', title, rows = '', text = '', tip = '', buttons = '' }) {
  openSheet(`
    ${icon ? `<div class="sheet-icon" aria-hidden="true">${icon}</div>` : ''}
    <h2>${esc(title)}</h2>
    ${rows ? `<div class="changes">${rows}</div>` : ''}
    ${text ? `<p>${text}</p>` : ''}
    ${tip ? `<p class="tip">👉 ${tip}</p>` : ''}
    <div class="sheet-actions">
      ${buttons}
      <button class="btn ${buttons ? 'ghost' : 'primary'}" data-action="close-sheet">Понятно</button>
    </div>`)
}

let toastTimer = null

export function toast(text) {
  let el = document.querySelector('.toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    el.setAttribute('role', 'status')
    document.body.appendChild(el)
  }
  el.textContent = text
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600)
}
