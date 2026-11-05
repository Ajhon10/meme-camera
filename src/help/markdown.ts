// Small, text-only Markdown subset for our bundled guides. No raw HTML execution.
export type Inline = { type: 'text' | 'strong' | 'code' | 'link'; text: string; href?: string }
export function inline(text: string): Inline[] {
  const parts: Inline[] = []
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index!
    if (index > offset) parts.push({ type: 'text', text: text.slice(offset, index) })
    if (match[1]) parts.push({ type: 'strong', text: match[1] })
    else if (match[2]) parts.push({ type: 'code', text: match[2] })
    else parts.push({ type: 'link', text: match[3], href: match[4] })
    offset = index + match[0].length
  }
  if (offset < text.length) parts.push({ type: 'text', text: text.slice(offset) })
  return parts
}
export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph' | 'code'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
export function blocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r/g, '').split('\n'),
    result: Block[] = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      result.push({ type: 'code', text: code.join('\n') })
      continue
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line)
    if (heading) {
      result.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      i++
      continue
    }
    const item = /^(?:- |\d+\. )(.+)$/.exec(line)
    if (item) {
      const ordered = /^\d/.test(line),
        items: string[] = []
      const pattern = ordered ? /^\d+\. (.+)$/ : /^- (.+)$/
      while (i < lines.length) {
        const next = pattern.exec(lines[i])
        if (!next) break
        items.push(next[1])
        i++
      }
      result.push({ type: 'list', ordered, items })
      continue
    }
    const paragraph: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#|```|- |\d+\. )/.test(lines[i]))
      paragraph.push(lines[i++])
    result.push({ type: 'paragraph', text: paragraph.join(' ') })
  }
  return result
}
