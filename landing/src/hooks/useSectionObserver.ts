'use client'

import { useEffect, useRef } from 'react'
import { useUiStore } from '@/stores/ui-store'

export function useSectionObserver() {
  const setActiveSection = useUiStore((s) => s.setActiveSection)

  useEffect(() => {
    const sectionIds = ['hero', 'stats', 'features', 'how-it-works', 'chains']
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible section
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: '-30% 0px -30% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [setActiveSection])
}
