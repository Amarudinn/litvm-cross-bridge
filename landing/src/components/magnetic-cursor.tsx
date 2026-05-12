'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect } from 'react'

export function MagneticCursor() {
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { stiffness: 500, damping: 28 })
  const springY = useSpring(cursorY, { stiffness: 500, damping: 28 })
  const cursorSize = useMotionValue(10)
  const springSize = useSpring(cursorSize, { stiffness: 300, damping: 20 })
  const cursorOpacity = useMotionValue(0)
  const springOpacity = useSpring(cursorOpacity, { stiffness: 300, damping: 20 })

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
      cursorOpacity.set(1)
    }

    const handleHover = () => cursorSize.set(44)
    const handleLeave = () => cursorSize.set(10)

    const handleMouseLeave = () => cursorOpacity.set(0)

    window.addEventListener('mousemove', moveCursor)
    document.addEventListener('mouseleave', handleMouseLeave)

    // Use MutationObserver to handle dynamically added elements
    const addListeners = () => {
      const interactiveElements = document.querySelectorAll('a, button, [data-magnetic]')
      interactiveElements.forEach((el) => {
        el.addEventListener('mouseenter', handleHover)
        el.addEventListener('mouseleave', handleLeave)
      })
      return interactiveElements
    }

    const elements = addListeners()

    return () => {
      window.removeEventListener('mousemove', moveCursor)
      document.removeEventListener('mouseleave', handleMouseLeave)
      elements.forEach((el) => {
        el.removeEventListener('mouseenter', handleHover)
        el.removeEventListener('mouseleave', handleLeave)
      })
    }
  }, [cursorX, cursorY, cursorSize, cursorOpacity])

  return (
    <>
      {/* Main cursor dot */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden rounded-full md:block"
        style={{
          x: springX,
          y: springY,
          width: springSize,
          height: springSize,
          translateX: '-50%',
          translateY: '-50%',
          opacity: springOpacity,
          backgroundColor: 'hsl(225 73% 57%)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Cursor trail ring */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9998] hidden rounded-full border md:block"
        style={{
          x: useSpring(cursorX, { stiffness: 150, damping: 15 }),
          y: useSpring(cursorY, { stiffness: 150, damping: 15 }),
          width: 32,
          height: 32,
          translateX: '-50%',
          translateY: '-50%',
          opacity: springOpacity,
          borderColor: 'hsl(225 73% 57% / 0.4)',
        }}
      />
    </>
  )
}
