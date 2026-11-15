import { useEffect, useState } from 'react'

/**
 * True when we should not render the three.js hero:
 * reduced-motion preference, few cores, or no WebGL.
 */
export default function useLowPower() {
  const [low, setLow] = useState(true)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cores = navigator.hardwareConcurrency || 2
    let webgl = false
    try {
      const canvas = document.createElement('canvas')
      webgl = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    } catch {
      webgl = false
    }
    setLow(reduce || cores <= 4 || !webgl)
  }, [])

  return low
}
