export const CONTENT_FILES = ['rules', 'pets', 'shop', 'goals', 'tasks', 'glossary', 'intro', 'chats']

export async function loadContent(base = 'content/') {
  const parts = await Promise.all(
    CONTENT_FILES.map(async (name) => {
      const res = await fetch(`${base}${name}.json`)
      if (!res.ok) throw new Error(`Не загрузился файл ${name}.json`)
      return [name, await res.json()]
    }),
  )
  return Object.fromEntries(parts)
}
