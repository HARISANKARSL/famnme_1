import { useEffect, useState } from 'react'
import type { HelpHeading } from '../content/types'

interface Props {
  headings: HelpHeading[]
}

export function HelpTOC({ headings }: Props) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (headings.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
          setActive(top.target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: [0, 1] }
    )

    headings.forEach(h => {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 3) return null

  return (
    <aside className="hidden xl:block sticky top-20 w-60 shrink-0">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        On this page
      </div>
      <ul className="space-y-1.5 text-sm border-l-2 border-gray-100 dark:border-zinc-800">
        {headings.map(h => (
          <li key={h.id} style={{ paddingLeft: h.level === 3 ? 20 : 12 }}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? 'location' : undefined}
              className={`block border-l-2 -ml-0.5 pl-2 transition-colors ${
                active === h.id
                  ? 'border-[#2F3E8F] text-[#2F3E8F] dark:border-white dark:text-white font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
