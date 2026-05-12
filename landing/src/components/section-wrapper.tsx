'use client'

import { motion, useInView } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

interface SectionWrapperProps {
  id: string
  children: React.ReactNode
  className?: string
  delay?: number
}

export function SectionWrapper({ id, children, className, delay = 0 }: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-40% 0px -40% 0px' })
  const setActiveSection = useUiStore((s) => s.setActiveSection)

  useEffect(() => {
    if (isInView) {
      setActiveSection(id)
    }
  }, [isInView, id, setActiveSection])

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15%' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn('section-shell', className)}
    >
      {children}
    </motion.section>
  )
}
