let ctx = null
export let enabled = true

export function setEnabled(v) {
  enabled = v
}

const tunes = {
  coin: [[880, 0.07], [1320, 0.1]],
  ok: [[523, 0.09], [659, 0.09], [784, 0.14]],
  soft: [[440, 0.12], [392, 0.16]],
  grow: [[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.2]],
}

export function play(name) {
  if (!enabled || !tunes[name]) return
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    let t = ctx.currentTime
    for (const [freq, len] of tunes[name]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + len)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + len)
      t += len * 0.9
    }
  } catch (e) {
  }
}
