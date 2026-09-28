export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export const weeksText = (n) => `${n} ${plural(n, 'неделя', 'недели', 'недель')}`
export const coinsText = (n) => `${n} ${plural(n, 'монетка', 'монетки', 'монеток')}`

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function signed(n) {
  return n > 0 ? `+${n}` : String(n)
}
