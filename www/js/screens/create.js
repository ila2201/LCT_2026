import { createProfile } from '../game.js'
import { petSvg } from '../pet.js'
import { header, showResult, changeRow, toast } from '../ui.js'
import { esc } from '../format.js'
import { play } from '../sound.js'

let draft = null

function freshDraft(app) {
  if (app.params.edit) {
    const p = app.state.pet
    return { name: p.name, gender: p.gender || 'boy', species: p.species, color: p.color, pattern: p.pattern }
  }
  return { name: '', gender: 'boy', species: 'cat', color: 'sun', pattern: 'plain' }
}

function chips(list, key, current, swatch = false) {
  return list
    .map((o) => `
      <button class="chip ${o.id === current ? 'on' : ''}" data-action="pick" data-key="${key}" data-value="${o.id}" aria-pressed="${o.id === current}">
        ${swatch ? `<i class="swatch" style="background:${o.body}" aria-hidden="true"></i>` : ''}${o.name}
      </button>`)
    .join('')
}

function previewSvg(app) {
  const accessories = app.params.edit ? app.state.pet.accessories : []
  return petSvg({ ...draft, accessories }, app.content.pets, { size: 170, label: 'Так будет выглядеть питомец' })
}

export default {
  render(app) {
    if (!draft || app.params.fresh !== false) {
      draft = freshDraft(app)
      app.params.fresh = false
    }
    const { pets } = app.content
    const edit = app.params.edit
    return `
      <main class="screen">
        ${header(edit ? 'Внешний вид' : 'Твой питомец', { back: Boolean(edit) })}
        <div class="preview" id="preview">${previewSvg(app)}</div>
        <h2>Кто это?</h2>
        <div class="chips">${chips(pets.species, 'species', draft.species)}</div>
        <h2>Мальчик или девочка?</h2>
        <div class="chips">${chips(pets.genders, 'gender', draft.gender)}</div>
        <h2>Цвет</h2>
        <div class="chips">${chips(pets.colors, 'color', draft.color, true)}</div>
        <h2>Узор</h2>
        <div class="chips">${chips(pets.patterns, 'pattern', draft.pattern)}</div>
        <label class="label" for="pet-name">Как зовут питомца?</label>
        <input id="pet-name" class="field" data-input="name" maxlength="12" autocomplete="off" value="${esc(draft.name)}" placeholder="Например, Финни">
        <div class="chips">${pets.petNames.map((v) => `<button class="chip small" data-action="suggest" data-value="${esc(v)}">${esc(v)}</button>`).join('')}</div>
        <p class="small muted">Настоящие имена, фамилии и телефоны в игре не нужны.</p>
        <button class="btn primary big" data-action="done">${edit ? 'Сохранить' : 'Готово'}</button>
      </main>`
  },

  inputs: {
    name: (app, value) => { draft.name = value },
  },

  actions: {
    pick(app, data, el) {
      draft[data.key] = data.value
      el.parentElement.querySelectorAll('.chip').forEach((chip) => {
        const on = chip === el
        chip.classList.toggle('on', on)
        chip.setAttribute('aria-pressed', on)
      })
      document.getElementById('preview').innerHTML = previewSvg(app)
    },
    suggest(app, data) {
      draft.name = data.value
      document.getElementById('pet-name').value = data.value
    },
    done(app) {
      const name = draft.name.trim()
      if (!name) {
        toast('Придумай питомцу имя или выбери подсказку')
        document.getElementById('pet-name').focus()
        return
      }
      const pet = { name, gender: draft.gender, species: draft.species, color: draft.color, pattern: draft.pattern }

      if (app.params.edit) {
        Object.assign(app.state.pet, pet)
        app.save()
        toast('Готово! Питомец обновлён')
        app.back()
        return
      }

      const { rules } = app.content
      app.state = createProfile({ pet, demo: Boolean(app.demoStart) }, rules)
      app.save()
      draft = null
      app.go('home', {}, { replace: true })
      play('coin')
      showResult({
        icon: '🎉',
        title: `Знакомься: ${name}!`,
        rows: changeRow('Кошелёк', 0, rules.income),
        text: `Тебе начислен стартовый бюджет – ${rules.income} монеток. Их хватит на неделю, если распределить с умом.`,
        tip: 'Сначала составь план: сколько на нужное, на «хочу» и в копилку.',
        buttons: '<button class="btn primary" data-action="go" data-to="plan">Составить план</button>',
      })
    },
  },
}
