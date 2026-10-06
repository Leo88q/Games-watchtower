(() => {
  'use strict'

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  // Compact mobile navigation with keyboard and outside-click support.
  const menuButton = document.querySelector('[data-menu-toggle]')
  const navLinks = document.querySelector('[data-nav-links]')
  const closeMenu = () => {
    if (!menuButton || !navLinks) return
    menuButton.setAttribute('aria-expanded', 'false')
    menuButton.setAttribute('aria-label', document.documentElement.lang === 'ru' ? 'Открыть меню' : 'Open menu')
    navLinks.classList.remove('is-open')
  }
  if (menuButton && navLinks) {
    document.documentElement.classList.add('has-mobile-nav')
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true'
      menuButton.setAttribute('aria-expanded', String(open))
      menuButton.setAttribute('aria-label', open
        ? (document.documentElement.lang === 'ru' ? 'Закрыть меню' : 'Close menu')
        : (document.documentElement.lang === 'ru' ? 'Открыть меню' : 'Open menu'))
      navLinks.classList.toggle('is-open', open)
    })
    navLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu()
    })
    document.addEventListener('pointerdown', (event) => {
      if (menuButton.getAttribute('aria-expanded') === 'true' && !event.target.closest('.nav-shell')) closeMenu()
    })
  }

  // Low-cost ambient starfield. It is decorative, pointer-free and disabled for reduced motion.
  const canvas = document.getElementById('starfield')
  const context = canvas?.getContext?.('2d')
  if (canvas && context && !reducedMotion) {
    let width = 0
    let height = 0
    let pixelRatio = 1
    let points = []
    let animation = 0
    let lastFrame = 0

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      const count = Math.min(66, Math.max(22, Math.floor(width / 20)))
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.09,
        vy: (Math.random() - 0.5) * 0.09,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const draw = (now) => {
      animation = window.requestAnimationFrame(draw)
      if (document.hidden || now - lastFrame < 32) return
      lastFrame = now
      context.clearRect(0, 0, width, height)
      const reach = Math.min(125, Math.max(72, width * 0.09))
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i]
        point.x += point.vx
        point.y += point.vy
        if (point.x < 0 || point.x > width) point.vx *= -1
        if (point.y < 0 || point.y > height) point.vy *= -1
        const alpha = 0.28 + 0.23 * (0.5 + 0.5 * Math.sin(now / 1700 + point.phase))
        context.fillStyle = `rgba(184,255,104,${alpha})`
        context.beginPath()
        context.arc(point.x, point.y, 1.05, 0, Math.PI * 2)
        context.fill()
        for (let j = i + 1; j < points.length; j += 1) {
          const other = points[j]
          const distance = Math.hypot(point.x - other.x, point.y - other.y)
          if (distance < reach) {
            context.strokeStyle = `rgba(101,220,242,${0.09 * (1 - distance / reach)})`
            context.lineWidth = 0.7
            context.beginPath()
            context.moveTo(point.x, point.y)
            context.lineTo(other.x, other.y)
            context.stroke()
          }
        }
      }
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('pagehide', () => window.cancelAnimationFrame(animation), { once: true })
    animation = window.requestAnimationFrame(draw)
  }

  // Reveal content when it enters the viewport; never leave text hidden without observer support.
  const revealItems = [...document.querySelectorAll('.reveal')]
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'))
  } else {
    document.documentElement.classList.add('reveal-ready')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' })
    revealItems.forEach((item) => observer.observe(item))
  }
})()
