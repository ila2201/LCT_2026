const STAGE_SCALE = [0.72, 0.86, 1]
const DARK = '#2B2D42'

function outlined(d, c, width = 12) {
  return `<path d="${d}" fill="none" stroke="${c.line}" stroke-width="${width + 6}" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${c.body}" stroke-width="${width}" stroke-linecap="round"/>`
}

const behind = {
  cat: (c) => `
    ${outlined('M150 160 C180 158 188 128 170 110', c)}
    <path d="M52 100 L58 52 L92 80 Z" fill="${c.body}" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M148 100 L142 52 L108 80 Z" fill="${c.body}" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M61 91 L63 65 L81 81 Z" fill="#FFB3C7"/>
    <path d="M139 91 L137 65 L119 81 Z" fill="#FFB3C7"/>`,
  dog: (c) => outlined('M154 158 C172 156 178 140 168 128', c, 11),
  dragon: (c) => `
    ${outlined('M148 164 C178 172 192 152 184 132', c)}
    <path d="M178 138 L194 122 L191 145 Z" fill="${c.line}"/>
    <path d="M50 118 C26 104 22 82 34 72 C38 88 48 96 58 100 Z" fill="${c.belly}" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 118 C174 104 178 82 166 72 C162 88 152 96 142 100 Z" fill="${c.belly}" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M74 82 L67 50 L89 74 Z" fill="${c.belly}" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M126 82 L133 50 L111 74 Z" fill="${c.belly}" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>`,
}

const front = {
  cat: (c) => `
    <g stroke="${c.line}" stroke-width="2.5" stroke-linecap="round">
      <path d="M64 127 L40 121"/><path d="M64 133 L40 136"/>
      <path d="M136 127 L160 121"/><path d="M136 133 L160 136"/>
    </g>`,
  dog: (c) => `
    <ellipse cx="50" cy="112" rx="15" ry="30" transform="rotate(18 50 112)" fill="${c.line}"/>
    <ellipse cx="150" cy="112" rx="15" ry="30" transform="rotate(-18 150 112)" fill="${c.line}"/>
    <ellipse cx="100" cy="127" rx="7" ry="5" fill="${DARK}"/>`,
  dragon: () => `
    <circle cx="95" cy="126" r="1.8" fill="${DARK}"/>
    <circle cx="105" cy="126" r="1.8" fill="${DARK}"/>`,
}

function eyes(mood, girl) {
  const down = mood === 'sad' || mood === 'upset'
  const ry = down ? 7 : mood === 'ok' ? 8 : 9
  const eye = (x) => `
    <ellipse cx="${x}" cy="115" rx="7" ry="${ry}" fill="${DARK}"/>
    <circle cx="${x + 2.5}" cy="${115 - ry / 3}" r="2.5" fill="#fff"/>`
  let brows = ''
  if (down) {
    brows = `<g stroke="${DARK}" stroke-width="3" stroke-linecap="round">
      <path d="M71 104 L87 99"/><path d="M129 104 L113 99"/></g>`
  }
  const lashes = girl
    ? `<g stroke="${DARK}" stroke-width="2.5" stroke-linecap="round">
        <path d="M74 108 L68 103"/><path d="M77 106 L73 99"/>
        <path d="M126 108 L132 103"/><path d="M123 106 L127 99"/></g>`
    : ''
  const tear = mood === 'upset' ? '<path d="M72 126 Q68 134 72 138 Q76 134 72 126 Z" fill="#6EC6FF" stroke="#3A8FC8" stroke-width="1.5"/>' : ''
  return eye(80) + eye(120) + brows + lashes + tear
}

function mouth(mood) {
  if (mood === 'happy') return `<path d="M88 135 Q100 150 112 135 Z" fill="#8A3446" stroke="${DARK}" stroke-width="2.5" stroke-linejoin="round"/>`
  if (mood === 'ok') return `<path d="M91 137 Q100 143 109 137" fill="none" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>`
  return `<path d="M91 142 Q100 135 109 142" fill="none" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>`
}

function star(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r
    const a = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="#FFC93C" stroke="#C99400" stroke-width="1.5" stroke-linejoin="round"/>`
}

const wear = {
  scarf: `
    <path d="M58 138 Q100 158 142 138 L143 150 Q100 170 57 150 Z" fill="#E4572E"/>
    <rect x="113" y="152" width="13" height="26" rx="4" fill="#E4572E" transform="rotate(-10 119 152)"/>
    <path d="M114 164 L126 162 M115 172 L127 170" stroke="#fff" stroke-width="2" opacity=".7"/>`,
  glasses: `
    <g stroke="#111" stroke-width="3">
      <circle cx="80" cy="115" r="13" fill="${DARK}" fill-opacity=".88"/>
      <circle cx="120" cy="115" r="13" fill="${DARK}" fill-opacity=".88"/>
      <path d="M93 113 L107 113"/>
    </g>
    <path d="M73 110 L78 106 M113 110 L118 106" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`,
  bow: `
    <path d="M100 72 L82 61 L84 84 Z" fill="#FF5C93" stroke="#C2185B" stroke-width="2" stroke-linejoin="round"/>
    <path d="M100 72 L118 61 L116 84 Z" fill="#FF5C93" stroke="#C2185B" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="100" cy="73" r="6" fill="#FF8AB3" stroke="#C2185B" stroke-width="2"/>`,
}

const toys = {
  ball: `
    <circle cx="24" cy="176" r="12" fill="#fff" stroke="${DARK}" stroke-width="2"/>
    <polygon points="24,170 29,174 27,180 21,180 19,174" fill="${DARK}"/>
    <path d="M24 164 L24 170 M35 172 L29 174 M32 186 L27 180 M16 186 L21 180 M13 172 L19 174" stroke="${DARK}" stroke-width="1.5"/>`,
  train: `
    <rect x="158" y="170" width="28" height="12" rx="2" fill="#E4572E" stroke="${DARK}" stroke-width="1.5"/>
    <rect x="176" y="160" width="12" height="12" rx="2" fill="#E4572E" stroke="${DARK}" stroke-width="1.5"/>
    <rect x="179" y="163" width="6" height="5" fill="#BDE3FF"/>
    <rect x="162" y="162" width="5" height="8" fill="${DARK}"/>
    <circle cx="165" cy="184" r="4.5" fill="${DARK}"/><circle cx="180" cy="184" r="4.5" fill="${DARK}"/>`,
  paints: `
    <path d="M6 150 C6 140 22 136 34 140 C44 144 42 152 34 154 C28 156 30 162 22 162 C12 162 6 158 6 150 Z" fill="#F3D9A4" stroke="#B8864B" stroke-width="1.5"/>
    <circle cx="15" cy="146" r="3" fill="#E4572E"/><circle cx="24" cy="143" r="3" fill="#3C78B8"/>
    <circle cx="32" cy="147" r="3" fill="#2F8A66"/><circle cx="14" cy="155" r="3" fill="#F2B21B"/>`,
}

function needMarks(stats) {
  if (!stats) return ''
  let out = ''
  if (stats.care < 40) {
    out += `<g fill="#8B6A4E" opacity=".5">
      <ellipse cx="70" cy="160" rx="9" ry="6"/><ellipse cx="132" cy="102" rx="7" ry="5"/>
      <ellipse cx="140" cy="152" rx="6" ry="4"/><circle cx="84" cy="92" r="3.5"/></g>`
  }
  if (stats.food < 40) {
    out += `<g><circle cx="150" cy="80" r="3" fill="#fff" stroke="${DARK}" stroke-width="1.5"/>
      <circle cx="158" cy="70" r="5" fill="#fff" stroke="${DARK}" stroke-width="1.5"/>
      <circle cx="176" cy="52" r="16" fill="#fff" stroke="${DARK}" stroke-width="1.5"/>
      <text x="176" y="58" font-size="17" text-anchor="middle">🥣</text></g>`
  }
  return out
}

export function petSvg(pet, pets, { stage = 0, mood = 'happy', size = 160, label = '', stats = null } = {}) {
  const c = pets.colors.find((x) => x.id === pet.color) || pets.colors[0]
  const species = behind[pet.species] ? pet.species : 'cat'
  const scale = STAGE_SCALE[stage] || 1
  const worn = pet.accessories || []

  const spots = pet.pattern === 'spots'
    ? `<g fill="${c.line}" opacity=".4">
        <circle cx="66" cy="110" r="7"/><circle cx="134" cy="98" r="6"/><circle cx="143" cy="140" r="8"/>
        <circle cx="59" cy="148" r="5"/><circle cx="117" cy="82" r="4"/></g>`
    : ''

  const stageMark = stage === 0
    ? `<path d="M100 73 C93 60 104 53 109 62" fill="none" stroke="${c.line}" stroke-width="3.5" stroke-linecap="round"/>`
    : stage === 2 ? star(100, 160, 10) : ''

  const top = Math.max(0, Math.round(188 - 150 * scale) - 6)
  const height = Math.round((size * (200 - top)) / 200)

  return `
  <svg class="pet pet--${mood}" viewBox="0 ${top} 200 ${200 - top}" width="${size}" height="${height}" role="img" aria-label="${label}">
    <ellipse cx="100" cy="188" rx="${52 * scale}" ry="7" fill="#000" opacity=".08"/>
    <g transform="translate(100 188) scale(${scale}) translate(-100 -188)">
      <g class="pet-body">
        ${behind[species](c)}
        <ellipse cx="76" cy="181" rx="15" ry="8" fill="${c.body}" stroke="${c.line}" stroke-width="3"/>
        <ellipse cx="124" cy="181" rx="15" ry="8" fill="${c.body}" stroke="${c.line}" stroke-width="3"/>
        <ellipse cx="100" cy="128" rx="58" ry="56" fill="${c.body}" stroke="${c.line}" stroke-width="3"/>
        ${spots}
        <ellipse cx="100" cy="150" rx="34" ry="28" fill="${c.belly}"/>
        ${front[species](c)}
        ${mood === 'happy' || mood === 'ok' ? '<ellipse cx="68" cy="131" rx="8" ry="5" fill="#FF8FA3" opacity=".45"/><ellipse cx="132" cy="131" rx="8" ry="5" fill="#FF8FA3" opacity=".45"/>' : ''}
        ${eyes(mood, pet.gender === 'girl')}
        ${mouth(mood)}
        ${stageMark}
        ${worn.includes('scarf') ? wear.scarf : ''}
        ${worn.includes('glasses') ? wear.glasses : ''}
        ${worn.includes('bow') ? wear.bow : ''}
        ${needMarks(stats)}
      </g>
    </g>
    ${(pet.toys || []).map((t) => toys[t] || '').join('')}
  </svg>`
}
