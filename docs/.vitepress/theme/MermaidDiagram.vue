<script setup lang="ts">
// Renders a ```mermaid block in the VineMe brand theme, and re-renders when light/dark mode changes.
// The markdown fence rule in config.mts turns each mermaid block into <MermaidDiagram code="..." />.
//
// Inline: fitted to the column. Enlarged: a full-screen viewer that opens fitted to the screen,
// with zoom (wheel / pinch / + − buttons / keys) and pan (drag).
// Layout defaults to ELK with straight lines (see mermaid-theme.ts); a diagram can opt into dagre via front matter.
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { mermaidConfig } from './mermaid-theme'

const ZOOM_MIN = 0.2
const ZOOM_MAX = 6
const ZOOM_STEP = 1.25

const props = defineProps<{ code: string }>()
const { isDark } = useData()
const svg = ref('')
const natural = ref({ w: 0, h: 0 })
const error = ref('')
let seq = 0
let layoutsRegistered = false

async function render() {
  const [{ default: mermaid }, { default: elkLayouts }] = await Promise.all([
    import('mermaid'),
    import('@mermaid-js/layout-elk'),
  ])
  if (!layoutsRegistered) {
    mermaid.registerLayoutLoaders(elkLayouts)
    layoutsRegistered = true
  }
  // Mermaid sizes nodes by measuring text, so the brand fonts must be loaded first or labels get clipped.
  await Promise.all([
    document.fonts.load("15px 'Nunito'"),
    document.fonts.load("700 15px 'Nunito'"),
  ]).catch(() => {})
  await document.fonts.ready
  mermaid.initialize(mermaidConfig(isDark.value))
  const id = `vm-mermaid-${Math.random().toString(36).slice(2)}-${seq++}`
  try {
    const { svg: out } = await mermaid.render(id, decodeURIComponent(props.code))
    const vb = /viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/.exec(out)
    natural.value = vb ? { w: parseFloat(vb[1]), h: parseFloat(vb[2]) } : { w: 0, h: 0 }
    svg.value = out
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

// ---- Enlarged viewer: zoom & pan ----
const expanded = ref(false)
const stage = ref<HTMLElement | null>(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
const dragging = ref(false)

const canvasStyle = computed(() => ({
  width: `${natural.value.w}px`,
  height: `${natural.value.h}px`,
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
}))
const zoomLabel = computed(() => `${Math.round(scale.value * 100)}%`)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function fit() {
  const el = stage.value
  if (!el || !natural.value.w) return
  const pad = 48
  const s = Math.min((el.clientWidth - pad) / natural.value.w, (el.clientHeight - pad) / natural.value.h)
  scale.value = clamp(s, ZOOM_MIN, ZOOM_MAX)
  tx.value = (el.clientWidth - natural.value.w * scale.value) / 2
  ty.value = (el.clientHeight - natural.value.h * scale.value) / 2
}

// Zoom keeping the point (cx, cy) in stage coordinates fixed under the cursor.
function zoomAt(factor: number, cx?: number, cy?: number) {
  const el = stage.value
  if (!el) return
  const x = cx ?? el.clientWidth / 2
  const y = cy ?? el.clientHeight / 2
  const next = clamp(scale.value * factor, ZOOM_MIN, ZOOM_MAX)
  const k = next / scale.value
  tx.value = x - (x - tx.value) * k
  ty.value = y - (y - ty.value) * k
  scale.value = next
}

function onWheel(e: WheelEvent) {
  const rect = stage.value!.getBoundingClientRect()
  // Trackpad pinch arrives as ctrl+wheel with small deltas; mouse wheels give larger ones.
  const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))
  zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
}

// Pointer panning, plus two-finger pinch on touch screens.
const pointers = new Map<number, { x: number; y: number }>()
let pinchDist = 0

function onPointerDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  dragging.value = true
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
  }
}
function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const rect = stage.value!.getBoundingClientRect()
    if (pinchDist) zoomAt(dist / pinchDist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
    pinchDist = dist
  } else {
    tx.value += e.clientX - prev.x
    ty.value += e.clientY - prev.y
  }
}
function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  if (pointers.size === 0) dragging.value = false
}

async function open() {
  expanded.value = true
  await nextTick()
  fit()
}
function close() {
  expanded.value = false
}

function onKey(e: KeyboardEvent) {
  if (!expanded.value) return
  if (e.key === 'Escape') close()
  else if (e.key === '+' || e.key === '=') zoomAt(ZOOM_STEP)
  else if (e.key === '-' || e.key === '_') zoomAt(1 / ZOOM_STEP)
  else if (e.key === '0') fit()
  else if (e.key.startsWith('Arrow')) {
    const d = 60
    if (e.key === 'ArrowLeft') tx.value += d
    if (e.key === 'ArrowRight') tx.value -= d
    if (e.key === 'ArrowUp') ty.value += d
    if (e.key === 'ArrowDown') ty.value -= d
  } else return
  e.preventDefault()
}

const onResize = () => expanded.value && fit()

onMounted(() => {
  render()
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
  document.documentElement.classList.remove('vm-diagram-locked')
})
watch(isDark, render)
watch(expanded, (isOpen) => document.documentElement.classList.toggle('vm-diagram-locked', isOpen))
</script>

<template>
  <figure class="vm-diagram">
    <button v-if="svg && !error" class="vm-diagram-expand" type="button" aria-label="Enlarge diagram" @click="open">
      <span aria-hidden="true">⤢</span> Enlarge
    </button>
    <pre v-if="error" class="vm-diagram-error">Diagram error: {{ error }}</pre>
    <div v-else-if="svg" class="vm-diagram-svg" @dblclick="open" v-html="svg" />
    <div v-else class="vm-diagram-loading">Drawing diagram…</div>

    <Teleport to="body">
      <div v-if="expanded" class="vm-viewer" role="dialog" aria-modal="true" aria-label="Diagram viewer">
        <div
          ref="stage"
          class="vm-viewer-stage"
          :class="{ 'is-dragging': dragging }"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @dblclick="zoomAt(ZOOM_STEP * ZOOM_STEP)"
        >
          <div class="vm-viewer-canvas" :style="canvasStyle" v-html="svg" />
        </div>

        <div class="vm-viewer-toolbar" role="toolbar" aria-label="Zoom controls">
          <button type="button" aria-label="Zoom out" title="Zoom out (−)" @click="zoomAt(1 / ZOOM_STEP)">−</button>
          <span class="vm-viewer-zoom" aria-live="polite">{{ zoomLabel }}</span>
          <button type="button" aria-label="Zoom in" title="Zoom in (+)" @click="zoomAt(ZOOM_STEP)">+</button>
          <span class="vm-viewer-sep" aria-hidden="true" />
          <button type="button" class="vm-viewer-text" title="Fit to screen (0)" @click="fit">Fit</button>
          <button type="button" class="vm-viewer-text" title="Actual size" @click="zoomAt(1 / scale)">1:1</button>
          <span class="vm-viewer-sep" aria-hidden="true" />
          <button type="button" aria-label="Close" title="Close (Esc)" @click="close">✕</button>
        </div>
        <p class="vm-viewer-hint">Scroll or pinch to zoom · drag to pan · double-click to zoom in · Esc to close</p>
      </div>
    </Teleport>
  </figure>
</template>
