const PROFILE_KEY = 'finny-pet:profile'
const SETTINGS_KEY = 'finny-pet:settings'

export const defaultSettings = { sound: true, anim: true, bigText: false }

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn('Не удалось прочитать сохранение', e)
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Не удалось сохранить', e)
  }
}

export const loadProfile = () => read(PROFILE_KEY)
export const saveProfile = (state) => write(PROFILE_KEY, state)
export const loadSettings = () => ({ ...defaultSettings, ...read(SETTINGS_KEY) })
export const saveSettings = (settings) => write(SETTINGS_KEY, settings)

export function removeProfile() {
  localStorage.removeItem(PROFILE_KEY)
}

export function removeEverything() {
  localStorage.removeItem(PROFILE_KEY)
  localStorage.removeItem(SETTINGS_KEY)
}
