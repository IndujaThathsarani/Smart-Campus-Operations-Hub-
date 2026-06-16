import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

export default function TicketParticlesBackground() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setReady(true)
    })
  }, [])

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: 'transparent' },
      detectRetina: true,
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: { enable: true, mode: 'grab' },
          resize: { enable: true },
        },
        modes: {
          grab: {
            distance: 140,
            links: { opacity: 0.18 },
          },
        },
      },
      particles: {
        color: { value: ['#0369a1', '#0284c7', '#2563eb'] },
        links: {
          color: '#60a5fa',
          distance: 130,
          enable: true,
          opacity: 0.22,
          width: 1,
        },
        move: {
          direction: 'none',
          enable: true,
          outModes: { default: 'out' },
          random: false,
          speed: 0.65,
          straight: false,
        },
        number: {
          density: { enable: true, width: 1200, height: 700 },
          value: 34,
        },
        opacity: {
          value: { min: 0.22, max: 0.48 },
        },
        shape: {
          type: ['circle', 'square'],
        },
        size: {
          value: { min: 3, max: 10 },
        },
      },
    }),
    [],
  )

  if (!ready) return null

  return (
    <Particles
      id="ticket-particles"
      className="pointer-events-none absolute inset-0 z-0 opacity-80"
      options={options}
    />
  )
}
