// ---------------------------------------------------------------------------
// 2.5D-движок звёздной системы на Canvas 2D.
// Орбиты наклонены (эллипсы), тела сортируются по глубине: те, что ближе к
// зрителю, крупнее и рисуются поверх. Никаких внешних библиотек.
// ---------------------------------------------------------------------------
import { BODIES, ROUTES, STAR, severityClass } from './world.js'

const TILT = 0.36
const SEVERITY_COLOR = { critical: '#ff4d5e', warn: '#ffb020', info: '#5aa9ff' }
const SIGNAL_COLOR = { ok: '#3ee08f', weak: '#ffb020', none: '#8a93a6', lost: '#ff4d5e' }
const SIGNAL_TEXT = { ok: 'на связи', weak: 'слабый сигнал', none: 'нет сигнала', lost: 'потеряна' }

function loadImage(src) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img
}

function seeded(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

export function createEngine(canvas, handlers = {}) {
  const ctx = canvas.getContext('2d')
  const images = { star: loadImage(STAR.sprite) }
  BODIES.forEach((b) => { images[b.id] = loadImage(b.sprite); if (b.moon?.sprite) images[`moon:${b.id}`] = loadImage(b.moon.sprite) })

  const rand = seeded(1742)
  const stars = [0.25, 0.55, 1].flatMap((depth) => Array.from({ length: depth === 1 ? 60 : 140 }, () => ({
    x: rand(), y: rand(), r: (0.4 + rand() * 1.1) * depth, depth, tw: rand() * Math.PI * 2, sp: 0.5 + rand() * 1.5,
  })))
  const phobos = Array.from({ length: 9 }, (_, i) => 0.78 + rand() * 0.3 + (i % 2 ? 0.08 : 0))

  let w = 0; let h = 0; let dpr = 1
  let layout = { cx: 0, cy: 0, base: 0 }
  let world = { bodies: {} }
  let hovered = null
  let selected = null
  let mouse = { x: 0, y: 0, nx: 0, ny: 0 }
  let time = 0
  let orbitTime = 0
  let speed = 1
  let last = performance.now()
  let raf = 0
  let positions = {}
  let routeHover = null
  let destroyed = false

  function resize() {
    const rect = canvas.getBoundingClientRect()
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = rect.width; h = rect.height
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    const portrait = h > w
    const base = portrait ? w * 0.5 : Math.min(w * 0.47, h * 0.92)
    layout = { cx: w * 0.5, cy: portrait ? h * 0.48 : h * 0.54, base, portrait }
  }

  function bodyDiameter(body) {
    const d = body.size * layout.base * 1.3
    const min = (layout.portrait ? 30 : 46) * (body.size / 0.11)
    return Math.max(d, min)
  }

  function computePositions() {
    const { cx, cy, base } = layout
    const out = {}
    out.solana = { id: 'solana', x: cx, y: cy, z: 0, r: Math.max(base * 0.1, 34), kind: 'star' }
    for (const body of BODIES) {
      const rx = body.orbit.r * base
      const ry = rx * TILT
      const theta = body.orbit.phase + (Math.PI * 2 * orbitTime) / body.orbit.period
      const z = Math.sin(theta)
      const scale = 0.8 + 0.2 * (z + 1) / 2
      const d = bodyDiameter(body) * scale
      out[body.id] = { id: body.id, body, x: cx + rx * Math.cos(theta), y: cy + ry * z, z, rx, ry, d, r: d / 2, scale, theta }
    }
    positions = out
    return out
  }

  // ---------------- отрисовка ----------------
  function drawBackground() {
    const g = ctx.createRadialGradient(layout.cx, layout.cy, 0, layout.cx, layout.cy, Math.max(w, h) * 0.75)
    g.addColorStop(0, '#0b1230')
    g.addColorStop(0.55, '#060a1c')
    g.addColorStop(1, '#03050d')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // туманности
    const neb = [[0.18, 0.25, '#5b2bd9', 0.12], [0.85, 0.78, '#0fb9a6', 0.09], [0.78, 0.18, '#d93b8f', 0.06]]
    for (const [x, y, c, a] of neb) {
      const gg = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, Math.max(w, h) * 0.38)
      gg.addColorStop(0, hexA(c, a)); gg.addColorStop(1, hexA(c, 0))
      ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h)
    }
    for (const s of stars) {
      const px = ((s.x * w - mouse.nx * 14 * s.depth) % w + w) % w
      const py = ((s.y * h - mouse.ny * 10 * s.depth) % h + h) % h
      const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * s.sp + s.tw))
      ctx.fillStyle = `rgba(220,230,255,${a * (0.4 + s.depth * 0.6)})`
      ctx.beginPath(); ctx.arc(px, py, s.r, 0, Math.PI * 2); ctx.fill()
    }
  }

  function drawOrbits() {
    const { cx, cy } = layout
    for (const body of BODIES) {
      const p = positions[body.id]
      const isSel = selected === body.id || hovered === body.id
      ctx.save()
      ctx.setLineDash(isSel ? [] : [3, 7])
      ctx.strokeStyle = isSel ? hexA(body.color, 0.55) : 'rgba(170,190,255,0.12)'
      ctx.lineWidth = isSel ? 1.4 : 1
      ctx.beginPath(); ctx.ellipse(cx, cy, p.rx, p.ry, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }
  }

  function routeCurve(a, b) {
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2 - Math.hypot(a.x - b.x, a.y - b.y) * 0.22
    return { mx, my }
  }

  function drawRoutes() {
    for (const route of ROUTES) {
      const a = positions[route.from]; const b = positions[route.to]
      if (!a || !b) continue
      const { mx, my } = routeCurve(a, b)
      const live = world.routes?.[route.id]?.live
      const hot = routeHover === route.id
      ctx.save()
      ctx.setLineDash(live ? [10, 8] : [2, 7])
      ctx.lineDashOffset = live ? -time * 30 : 0
      ctx.strokeStyle = hexA(route.color, hot ? 0.9 : live ? 0.6 : 0.28)
      ctx.lineWidth = hot ? 2.2 : 1.4
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke()
      ctx.restore()
      if (hot) {
        const lx = 0.25 * a.x + 0.5 * mx + 0.25 * b.x
        const ly = 0.25 * a.y + 0.5 * my + 0.25 * b.y
        label(route.name, lx, ly - 10, route.color, 12, true)
      }
    }
  }

  function drawBeams() {
    const hub = positions.hub
    for (const body of BODIES) {
      if (body.id === 'hub') continue
      const p = positions[body.id]
      const st = world.bodies[body.id] || {}
      const activity = Math.max(0, Math.min(1, st.activity || 0))
      ctx.save()
      ctx.strokeStyle = activity > 0 ? hexA(body.color, 0.16) : 'rgba(150,170,220,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(hub.x, hub.y); ctx.stroke()
      if (activity > 0) {
        const n = 1 + Math.round(activity * 4)
        for (let i = 0; i < n; i++) {
          const t = ((time * 0.25 + i / n) % 1)
          const x = p.x + (hub.x - p.x) * t; const y = p.y + (hub.y - p.y) * t
          ctx.fillStyle = hexA(body.color, 0.9 * Math.sin(Math.PI * t))
          ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.restore()
    }
  }

  function drawStar() {
    const s = positions.solana
    const pulse = 1 + 0.025 * Math.sin(time * 1.3)
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.2)
    glow.addColorStop(0, 'rgba(170,110,255,0.35)')
    glow.addColorStop(0.4, 'rgba(60,220,190,0.10)')
    glow.addColorStop(1, 'rgba(60,220,190,0)')
    ctx.fillStyle = glow
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2); ctx.fill()
    const img = images.star
    if (img.complete && img.naturalWidth) {
      const dw = s.r * 2.6 * pulse; const dh = dw * img.naturalHeight / img.naturalWidth
      ctx.save(); ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(img, s.x - dw / 2, s.y - dh / 2, dw, dh)
      ctx.restore()
    }
    if (hovered === 'solana' || selected === 'solana') {
      label(STAR.name, s.x, s.y + s.r * 1.5, '#d7c6ff', 13, true)
      label('звезда системы', s.x, s.y + s.r * 1.5 + 15, '#9aa4bf', 11)
    }
  }

  function drawPhobos(p, behind) {
    const body = p.body
    const ang = (Math.PI * 2 * time) / body.moon.period
    const front = Math.sin(ang) > 0
    if (front === behind) return
    const mr = p.r * 0.2
    const x = p.x + Math.cos(ang) * p.r * 1.55
    const y = p.y + Math.sin(ang) * p.r * 0.5
    const img = images[`moon:${body.id}`]
    if (img && img.complete && img.naturalWidth) {
      // Спрайт Фобоса: свет падает слева, чуть темнее за планетой
      const d = mr * 2.9
      ctx.save()
      if (behind) ctx.globalAlpha = 0.75
      ctx.translate(x, y); ctx.rotate(time * 0.15)
      ctx.drawImage(img, -d / 2, -d / 2, d, d)
      ctx.restore()
      return
    }
    ctx.save()
    ctx.fillStyle = '#8c7a6b'
    ctx.beginPath()
    phobos.forEach((k, i) => {
      const a = (i / phobos.length) * Math.PI * 2
      const px = x + Math.cos(a) * mr * k * 1.25; const py = y + Math.sin(a) * mr * k
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    })
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath(); ctx.ellipse(x + mr * 0.35, y + mr * 0.2, mr * 0.75, mr * 0.6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  function drawRacers(p, st) {
    if (!(st.activity > 0)) return
    const W = p.d; const H = W / (p.body.spriteAspect || 1)
    const n = 2 + Math.round(st.activity * 4)
    ctx.save()
    ctx.translate(p.x, p.y); ctx.rotate(-0.2)
    for (let i = 0; i < n; i++) {
      const a = time * 0.9 + (i / n) * Math.PI * 2
      const x = Math.cos(a) * W * 0.43; const y = Math.sin(a) * H * 0.3
      if (Math.sin(a) < -0.2) continue
      ctx.fillStyle = i % 2 ? '#5ef0ff' : '#ffc06a'
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }

  function drawBody(p) {
    const body = p.body
    const st = world.bodies[body.id] || {}
    const signal = st.lost ? 'lost' : (st.signal || 'none')
    const img = images[body.id]
    const isSel = selected === body.id
    const isHov = hovered === body.id
    const aspect = body.spriteAspect || (body.kind === 'station' ? 1.5 : 1)
    const dw = p.d * (aspect > 1 ? 1 : 1); const dh = dw / aspect
    const r = body.kind === 'planet' && aspect === 1 ? p.r : Math.min(dw, dh) / 2

    if (body.moon) drawPhobos(p, true)

    // свечение
    const glowA = signal === 'ok' ? 0.4 : signal === 'weak' ? 0.25 : 0.1
    const glow = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 1.9)
    glow.addColorStop(0, hexA(body.color, glowA)); glow.addColorStop(1, hexA(body.color, 0))
    ctx.fillStyle = glow
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.9, 0, Math.PI * 2); ctx.fill()

    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, p.x - dw / 2, p.y - dh / 2, dw, dh)
    } else {
      ctx.fillStyle = body.color
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill()
    }

    // нет сигнала / потеряна: затемнение и помехи прямо на диске
    if (signal === 'none' || signal === 'lost') {
      ctx.save()
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.98, 0, Math.PI * 2); ctx.clip()
      ctx.fillStyle = signal === 'lost' ? 'rgba(20,0,6,0.7)' : 'rgba(6,9,20,0.55)'
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2)
      for (let i = 0; i < 7; i++) {
        const yy = p.y - r + ((time * 40 + i * 37) % (r * 2))
        ctx.fillStyle = `rgba(200,210,235,${0.05 + 0.05 * Math.sin(time * 9 + i)})`
        ctx.fillRect(p.x - r, yy, r * 2, 1.2)
      }
      ctx.restore()
    }

    if (body.id === 'neonrelay') drawRacers(p, st)
    if (body.moon) drawPhobos(p, false)

    // аномалии
    const anomalies = st.anomalies || []
    if (anomalies.length) {
      const worst = anomalies.some((a) => severityClass(a.severity) === 'critical') ? 'critical'
        : anomalies.some((a) => severityClass(a.severity) === 'warn') ? 'warn' : 'info'
      const color = SEVERITY_COLOR[worst]
      const k = (time * 0.8) % 1
      ctx.save()
      ctx.strokeStyle = hexA(color, 0.8 * (1 - k)); ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * (1.1 + k * 0.5), r * (1.1 + k * 0.5) * (aspect > 1.2 ? 0.6 : 1), 0, 0, Math.PI * 2); ctx.stroke()
      if (worst === 'critical') {
        ctx.strokeStyle = hexA(color, 0.45); ctx.lineWidth = 3
        for (let i = 0; i < 3; i++) {
          const a0 = time * 1.6 + i * 2.1
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.85, a0, a0 + 0.9); ctx.stroke()
        }
      }
      ctx.restore()
      // значок с количеством
      const bx = p.x + r * 0.78; const by = p.y - (aspect > 1.2 ? dh / 2 : r) * 0.85
      ctx.save()
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0; ctx.fillStyle = '#0b0f1c'
      ctx.font = "800 11px 'Exo 2', Inter, system-ui, sans-serif"
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(anomalies.length), bx, by + 0.5)
      ctx.restore()
    }

    // рамка выделения — угловые скобки, как в референсе
    if (isSel || isHov) {
      const pad = 8
      const bw = dw / 2 + pad; const bh = (aspect > 1.2 ? dh : dw) / 2 + pad
      const L = Math.min(14, bw * 0.4)
      ctx.save()
      ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(255,255,255,0.55)'
      ctx.lineWidth = isSel ? 2 : 1.3
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = p.x + sx * bw; const y = p.y + sy * bh
        ctx.beginPath()
        ctx.moveTo(x - sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * L)
        ctx.stroke()
      }
      ctx.restore()
    }

    // подписи
    const ly = p.y + (aspect > 1.2 ? dh / 2 : r) + 16
    label(body.short, p.x, ly, '#eef2ff', layout.portrait ? 11 : 13, true)
    const extra = st.label ? ` · ${st.label}` : ''
    label(`${SIGNAL_TEXT[signal]}${extra}`, p.x, ly + 15, SIGNAL_COLOR[signal], layout.portrait ? 10 : 11)
  }

  function label(text, x, y, color, size = 12, bold = false) {
    ctx.save()
    ctx.font = `${bold ? 800 : 600} ${size}px 'Exo 2', Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(3,5,13,0.85)'
    ctx.strokeText(text, x, y)
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  function frame(now) {
    if (destroyed) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!document.hidden) {
      time += dt
      const target = hovered && hovered !== 'solana' ? 0.08 : 1
      speed += (target - speed) * Math.min(1, dt * 4)
      orbitTime += dt * speed
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      computePositions()
      drawBackground()
      drawOrbits()
      drawBeams()
      drawRoutes()
      const list = [positions.solana, ...BODIES.map((b) => positions[b.id])].sort((a, b) => a.y - b.y)
      for (const p of list) {
        if (p.kind === 'star') drawStar(); else drawBody(p)
      }
    }
    raf = requestAnimationFrame(frame)
  }

  // ---------------- ввод ----------------
  function hitTest(x, y) {
    const list = [...BODIES.map((b) => positions[b.id]), positions.solana].filter(Boolean).sort((a, b) => b.y - a.y)
    for (const p of list) {
      if (p.kind === 'star') { if (Math.hypot(x - p.x, y - p.y) < p.r * 1.1) return 'solana'; continue }
      const aspect = p.body.spriteAspect || (p.body.kind === 'station' ? 1.5 : 1)
      const hw = p.d / 2; const hh = p.d / aspect / 2
      if (Math.abs(x - p.x) < hw * 0.95 && Math.abs(y - p.y) < hh * 0.95 + 4) return p.id
    }
    return null
  }

  function hitRoute(x, y) {
    for (const route of ROUTES) {
      const a = positions[route.from]; const b = positions[route.to]
      if (!a || !b) continue
      const { mx, my } = routeCurve(a, b)
      for (let t = 0.12; t <= 0.88; t += 0.04) {
        const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x
        const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y
        if (Math.hypot(x - px, y - py) < 9) return route.id
      }
    }
    return null
  }

  function localPoint(e) {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onMove(e) {
    const { x, y } = localPoint(e)
    mouse = { x, y, nx: (x / w - 0.5) * 2, ny: (y / h - 0.5) * 2 }
    const hit = hitTest(x, y)
    const rh = hit ? null : hitRoute(x, y)
    if (hit !== hovered || rh !== routeHover) {
      hovered = hit; routeHover = rh
      canvas.style.cursor = hit || rh ? 'pointer' : 'default'
      handlers.onHover?.(hit ? { type: hit === 'solana' ? 'star' : 'body', id: hit } : rh ? { type: 'route', id: rh } : null, { x, y })
    }
  }
  function onLeave() { hovered = null; routeHover = null; handlers.onHover?.(null) }
  function onClick(e) {
    const { x, y } = localPoint(e)
    const hit = hitTest(x, y)
    if (hit && hit === selected && hit !== 'solana') { handlers.onEnter?.(hit); return }
    if (!hit) { const rh = hitRoute(x, y); if (rh) { handlers.onRoute?.(rh); return } }
    selected = hit
    handlers.onSelect?.(hit)
  }
  function onDbl(e) {
    const { x, y } = localPoint(e)
    const hit = hitTest(x, y)
    if (hit && hit !== 'solana') handlers.onEnter?.(hit)
  }

  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('click', onClick)
  canvas.addEventListener('dblclick', onDbl)
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()
  raf = requestAnimationFrame(frame)

  return {
    setWorld(next) { world = next || { bodies: {} } },
    select(id) { selected = id },
    get selected() { return selected },
    screenPos(id) { return positions[id] ? { x: positions[id].x, y: positions[id].y, r: positions[id].r } : null },
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('dblclick', onDbl)
    },
  }
}

function hexA(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
