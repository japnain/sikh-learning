let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let activeNodes: AudioNode[] = []
let activeTimers: ReturnType<typeof setTimeout>[] = []

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.6
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function getMaster(): GainNode {
  getCtx()
  return masterGain!
}

function noiseBuffer(type: 'white' | 'brown' | 'pink', seconds = 2): AudioBuffer {
  const c = getCtx()
  const len = c.sampleRate * seconds
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)

  if (type === 'white') {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  } else if (type === 'brown') {
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  } else {
    // pink noise (Paul Kellet's refined method)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  return buf
}

function noise(type: 'white' | 'brown' | 'pink'): AudioBufferSourceNode {
  const c = getCtx()
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(type)
  src.loop = true
  activeNodes.push(src)
  return src
}

function osc(type: OscillatorType, freq: number): OscillatorNode {
  const c = getCtx()
  const o = c.createOscillator()
  o.type = type
  o.frequency.value = freq
  activeNodes.push(o)
  return o
}

function gain(v: number): GainNode {
  const c = getCtx()
  const g = c.createGain()
  g.gain.value = v
  activeNodes.push(g)
  return g
}

function filter(type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const c = getCtx()
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  activeNodes.push(f)
  return f
}

function schedule(fn: () => void, ms: number): void {
  activeTimers.push(setTimeout(fn, ms))
}

function recurring(fn: () => void, minMs: number, maxMs: number): void {
  const loop = () => {
    fn()
    const delay = minMs + Math.random() * (maxMs - minMs)
    const t = setTimeout(loop, delay)
    activeTimers.push(t)
  }
  loop()
}

// ── Soundscapes ────────────────────────────────────────────

function fireplace() {
  const m = getMaster()
  // Crackle base
  const n = noise('brown')
  const f1 = filter('lowpass', 600)
  const g1 = gain(0.5)
  n.connect(f1).connect(g1).connect(m)
  n.start()

  // Crackle pops
  recurring(() => {
    const c = getCtx()
    const pop = c.createBufferSource()
    pop.buffer = noiseBuffer('white', 0.05)
    const fg = gain(0.3 + Math.random() * 0.4)
    const ff = filter('bandpass', 1000 + Math.random() * 3000, 2)
    pop.connect(ff).connect(fg).connect(m)
    pop.start()
    pop.stop(c.currentTime + 0.05)
  }, 100, 500)

  // Low rumble
  const rumble = osc('sine', 50)
  const rg = gain(0.08)
  rumble.connect(rg).connect(m)
  rumble.start()
}

function thunderstorm() {
  const m = getMaster()
  // Rain base
  const n = noise('brown')
  const f1 = filter('lowpass', 800)
  const g1 = gain(0.4)
  n.connect(f1).connect(g1).connect(m)
  n.start()

  // Rain drops
  const drops = noise('white')
  const f2 = filter('bandpass', 3000, 0.5)
  const g2 = gain(0.15)
  drops.connect(f2).connect(g2).connect(m)
  drops.start()

  // Thunder
  recurring(() => {
    const c = getCtx()
    const freq = 40 + Math.random() * 30
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    const tg = c.createGain()
    tg.gain.setValueAtTime(0.6, c.currentTime)
    tg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 3)
    o.connect(tg).connect(m)
    o.start()
    o.stop(c.currentTime + 3.5)
  }, 8000, 18000)
}

function oceanWaves() {
  const m = getMaster()
  const n = noise('brown')
  const f1 = filter('lowpass', 500)
  const g1 = gain(0.15)
  n.connect(f1).connect(g1).connect(m)
  n.start()

  // Wave swell modulation
  const cycle = () => {
    const c = getCtx()
    const dur = 6 + Math.random() * 4
    g1.gain.setValueAtTime(0.15, c.currentTime)
    g1.gain.linearRampToValueAtTime(0.55, c.currentTime + dur * 0.4)
    g1.gain.linearRampToValueAtTime(0.15, c.currentTime + dur)
    f1.frequency.setValueAtTime(300, c.currentTime)
    f1.frequency.linearRampToValueAtTime(700, c.currentTime + dur * 0.4)
    f1.frequency.linearRampToValueAtTime(300, c.currentTime + dur)
    schedule(cycle, dur * 1000)
  }
  cycle()

  // Foam
  const foam = noise('white')
  const ff = filter('highpass', 4000)
  const fg = gain(0.04)
  foam.connect(ff).connect(fg).connect(m)
  foam.start()
}

function forestCampfire() {
  const m = getMaster()
  // Wind through trees
  const wind = noise('pink')
  const wf = filter('lowpass', 400)
  const wg = gain(0.15)
  wind.connect(wf).connect(wg).connect(m)
  wind.start()

  // Campfire crackle
  const fire = noise('brown')
  const ff = filter('lowpass', 500)
  const fg = gain(0.3)
  fire.connect(ff).connect(fg).connect(m)
  fire.start()

  recurring(() => {
    const c = getCtx()
    const pop = c.createBufferSource()
    pop.buffer = noiseBuffer('white', 0.04)
    const pg = gain(0.2 + Math.random() * 0.3)
    const pf = filter('bandpass', 800 + Math.random() * 2000, 2)
    pop.connect(pf).connect(pg).connect(m)
    pop.start()
    pop.stop(c.currentTime + 0.04)
  }, 200, 800)

  // Bird calls
  recurring(() => {
    const c = getCtx()
    const freq = 1800 + Math.random() * 2000
    const bird = c.createOscillator()
    bird.type = 'sine'
    bird.frequency.setValueAtTime(freq, c.currentTime)
    bird.frequency.linearRampToValueAtTime(freq * (0.8 + Math.random() * 0.4), c.currentTime + 0.3)
    const bg = c.createGain()
    bg.gain.setValueAtTime(0.06, c.currentTime)
    bg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
    bird.connect(bg).connect(m)
    bird.start()
    bird.stop(c.currentTime + 0.5)
  }, 4000, 12000)
}

function windChimes() {
  const m = getMaster()
  // Wind base
  const wind = noise('pink')
  const wf = filter('lowpass', 300)
  const wg = gain(0.1)
  wind.connect(wf).connect(wg).connect(m)
  wind.start()

  // Chime strikes
  const frequencies = [523, 587, 659, 784, 880, 1047, 1175]
  recurring(() => {
    const c = getCtx()
    const freq = frequencies[Math.floor(Math.random() * frequencies.length)]
    const partials = [1, 2.2, 3.5, 5.1]
    for (const p of partials) {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * p
      const cg = c.createGain()
      cg.gain.setValueAtTime(0.08 / p, c.currentTime)
      cg.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 2 + Math.random() * 2)
      o.connect(cg).connect(m)
      o.start()
      o.stop(c.currentTime + 5)
    }
  }, 1500, 4000)
}

function nightGarden() {
  const m = getMaster()
  // Ambient base
  const n = noise('pink')
  const nf = filter('lowpass', 200)
  const ng = gain(0.12)
  n.connect(nf).connect(ng).connect(m)
  n.start()

  // Crickets
  recurring(() => {
    const c = getCtx()
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = 4200 + Math.random() * 800
    const cg = c.createGain()
    cg.gain.setValueAtTime(0.04, c.currentTime)
    const pulses = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < pulses; i++) {
      const t = c.currentTime + i * 0.08
      cg.gain.setValueAtTime(0.04, t)
      cg.gain.setValueAtTime(0, t + 0.04)
    }
    cg.gain.setValueAtTime(0, c.currentTime + pulses * 0.08)
    o.connect(cg).connect(m)
    o.start()
    o.stop(c.currentTime + pulses * 0.08 + 0.1)
  }, 1000, 4000)

  // Owl
  recurring(() => {
    const c = getCtx()
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = 350
    const og = c.createGain()
    og.gain.setValueAtTime(0.06, c.currentTime)
    og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8)
    o.connect(og).connect(m)
    o.start()
    o.stop(c.currentTime + 1)
  }, 10000, 25000)
}

// ── Public API ─────────────────────────────────────────────

const SOUNDSCAPE_MAP: Record<string, () => void> = {
  'fireplace': fireplace,
  'thunderstorm': thunderstorm,
  'ocean-waves': oceanWaves,
  'forest-campfire': forestCampfire,
  'wind-chimes': windChimes,
  'night-garden': nightGarden,
}

export function playSound(id: string): void {
  stopSound()
  const fn = SOUNDSCAPE_MAP[id]
  if (fn) fn()
}

export function stopSound(): void {
  for (const t of activeTimers) clearTimeout(t)
  activeTimers = []
  for (const node of activeNodes) {
    try {
      if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
        (node as OscillatorNode).stop()
      }
      node.disconnect()
    } catch { /* already stopped */ }
  }
  activeNodes = []
}

export function setMasterVolume(v: number): void {
  const m = getMaster()
  m.gain.value = v
}
