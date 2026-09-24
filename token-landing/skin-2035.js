// Watchtower 2035 skin: фон с частицами, свет за курсором, появление блоков и 3D-наклон карточек.
// Только визуальный слой: не трогает данные, таблицы и проверки сумм страницы.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = document.documentElement

  const glow = document.createElement('div'); glow.id = 'wt-glow'
  const cv = document.createElement('canvas'); cv.id = 'wt-field'
  glow.setAttribute('aria-hidden', 'true'); cv.setAttribute('aria-hidden', 'true')
  document.body.prepend(glow); document.body.prepend(cv)

  const cx = cv.getContext && cv.getContext('2d')
  let W = 0, H = 0, pts = [], mouse = { x: -1e4, y: -1e4 }
  const dpr = () => window.devicePixelRatio || 1
  function size() {
    W = cv.width = innerWidth * dpr(); H = cv.height = innerHeight * dpr()
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'
    pts = Array.from({ length: Math.min(80, Math.floor(innerWidth / 18)) }, () =>
      ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 }))
  }
  addEventListener('resize', size); size()
  addEventListener('pointermove', e => {
    mouse = { x: e.clientX * dpr(), y: e.clientY * dpr() }
    root.style.setProperty('--mx', e.clientX + 'px'); root.style.setProperty('--my', e.clientY + 'px')
  })
  function frame() {
    if (!cx) return
    cx.clearRect(0, 0, W, H); const D = 140 * dpr()
    for (const p of pts) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy) || 1
      if (d < D * 1.6) { p.vx += dx / d * .02; p.vy += dy / d * .02 }
      p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy
      if (p.x < 0 || p.x > W) p.vx *= -1
      if (p.y < 0 || p.y > H) p.vy *= -1
    }
    cx.lineWidth = dpr()
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d < D) { cx.strokeStyle = `rgba(92,200,255,${.15 * (1 - d / D)})`; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke() }
    }
    cx.fillStyle = 'rgba(55,229,160,.6)'
    for (const p of pts) { cx.beginPath(); cx.arc(p.x, p.y, 1.4 * dpr(), 0, 7); cx.fill() }
    if (!reduce) requestAnimationFrame(frame)
  }
  frame()

  // появление: заголовки, карточки, таблицы
  const targets = document.querySelectorAll('section h2, section .lead, section .card, section details, section .step, section .tree')
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: .08 })
    targets.forEach(el => { el.classList.add('wt-rv'); io.observe(el) })
  }

  // 3D-наклон карточек (без форм и таблиц, чтобы не мешать вводу)
  if (!reduce) document.querySelectorAll('.card').forEach(t => {
    if (t.querySelector('input, table')) return
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5
      t.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`
    })
    t.addEventListener('pointerleave', () => { t.style.transform = '' })
  })
})()
