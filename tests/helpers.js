import { readFileSync } from 'node:fs'
import { createProfile, confirmPlan } from '../www/js/game.js'

export const load = (name) => JSON.parse(readFileSync(new URL(`../www/content/${name}.json`, import.meta.url), 'utf8'))

export const rules = load('rules')
export const shop = load('shop')
export const goals = load('goals')
export const pets = load('pets')
export const tasks = load('tasks')

export const item = (id) => shop.find((i) => i.id === id)

export const T0 = new Date(2026, 8, 1, 10, 0).getTime()

const pet = { name: 'Финни', species: 'cat', color: 'sun', pattern: 'plain' }

export function newGame({ demo = true } = {}) {
  return createProfile({ pet, demo }, rules, T0)
}

export function withPlan(state, plan = { need: 45, want: 30, save: 25 }) {
  const res = confirmPlan(state, plan, shop)
  if (!res.ok) throw new Error(res.error)
  return state
}
