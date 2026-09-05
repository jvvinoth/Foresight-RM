/**
 * Client monograms.
 *
 * The dataset has no photographs, and stock portraits of real people chosen to
 * stand in for synthetic clients cannot be defended — least of all when they
 * are picked to match an assumed ethnicity. A monogram is derived from the
 * client's own name and id, so it is correct for every client by construction,
 * loads with the page, and reads like a private bank rather than a directory.
 */

const TINTS = [
  { bg: '#141e55', fg: '#ffffff' }, // JB navy
  { bg: '#273788', fg: '#ffffff' },
  { bg: '#3549a5', fg: '#ffffff' },
  { bg: '#e6ebf9', fg: '#1d2a6d' },
  { bg: '#ccd5f2', fg: '#141e55' },
  { bg: '#1d2a6d', fg: '#ffffff' },
]

/** Stable per client — the same id always gets the same tint. */
function tintFor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

/** Two letters, taken the way a name badge would take them. */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{Zs}-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function Monogram({
  id,
  name,
  size = 44,
  ring,
}: {
  id: string
  name: string
  size?: number
  /** Optional status ring, e.g. the gate colour. */
  ring?: string
}) {
  const tint = tintFor(id)
  return (
    <span
      aria-hidden
      title={name}
      style={{
        width: size,
        height: size,
        background: tint.bg,
        color: tint.fg,
        fontSize: size * 0.36,
        boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 3.5px ${ring}` : undefined,
      }}
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-normal tracking-[0.06em]"
    >
      {initials(name)}
    </span>
  )
}
