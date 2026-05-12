'use client'

import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TextRevealProps {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  mode?: 'word' | 'char' | 'line'
  delay?: number
  className?: string
  scramble?: boolean
}

function ScrambleText({ text, isInView }: { text: string; isInView: boolean }) {
  const [display, setDisplay] = useState(text)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'

  useEffect(() => {
    if (!isInView) return
    let iteration = 0
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' '
            if (i < iteration) return text[i]
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      )
      iteration += 1 / 2
      if (iteration >= text.length) clearInterval(interval)
    }, 25)
    return () => clearInterval(interval)
  }, [isInView, text])

  return <>{display}</>
}

export function TextReveal({ text, as: Tag = 'h2', mode = 'word', delay = 0, className, scramble = false }: TextRevealProps) {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <Tag ref={ref as any} className={className}>{text}</Tag>
  }

  if (scramble) {
    return (
      <Tag ref={ref as any} className={cn('font-mono', className)}>
        <ScrambleText text={text} isInView={isInView} />
      </Tag>
    )
  }

  const items = mode === 'char' ? text.split('') : mode === 'line' ? text.split('\n') : text.split(' ')
  const staggerDelay = mode === 'char' ? 0.02 : mode === 'word' ? 0.04 : 0.12

  return (
    <Tag ref={ref as any} className={cn('flex flex-wrap justify-center', className)}>
      {items.map((item, i) => (
        <motion.span
          key={`${item}-${i}`}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)', rotateX: 45 }}
          animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 } : undefined}
          transition={{
            duration: 0.6,
            delay: delay + i * staggerDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={cn(
            'inline-block',
            mode === 'char' ? '' : 'mr-[0.25em]'
          )}
        >
          {item === ' ' ? ' ' : item}
        </motion.span>
      ))}
    </Tag>
  )
}
