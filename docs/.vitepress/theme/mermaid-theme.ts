// VineMe brand theme for Mermaid diagrams. Colours come from apps/web/app/globals.css
// (--brand-pink, --brand-dark, --brand-beige, --chart-stage-*). See apps/web/app/dashboard/DESIGN.md.
import type { MermaidConfig } from 'mermaid'

const brand = {
  pink: '#ff0083',
  pinkDeep: '#d2056b',
  pinkSoft: '#fe7ea7',
  dark: '#2c2235',
  beige: '#fffbee',
}

const font = `'Nunito', ui-sans-serif, system-ui, sans-serif`

const light: MermaidConfig['themeVariables'] = {
  fontFamily: font,
  fontSize: '16px',
  background: '#ffffff',
  // Nodes
  primaryColor: '#ffe6f2',
  primaryBorderColor: brand.pink,
  primaryTextColor: brand.dark,
  secondaryColor: brand.beige,
  secondaryBorderColor: '#e9d9a6',
  secondaryTextColor: brand.dark,
  tertiaryColor: '#f7f2f8',
  tertiaryBorderColor: '#dccfe2',
  tertiaryTextColor: brand.dark,
  // Edges & groups
  lineColor: '#7a6e84',
  textColor: brand.dark,
  edgeLabelBackground: brand.beige,
  clusterBkg: '#fdf8fb',
  clusterBorder: '#f1c4db',
  titleColor: brand.dark,
  // Sequence diagrams
  actorBkg: brand.dark,
  actorBorder: brand.dark,
  actorTextColor: brand.beige,
  actorLineColor: '#b7abc0',
  signalColor: brand.dark,
  signalTextColor: brand.dark,
  labelBoxBkgColor: brand.pink,
  labelBoxBorderColor: brand.pink,
  labelTextColor: '#ffffff',
  loopTextColor: brand.dark,
  noteBkgColor: brand.beige,
  noteBorderColor: '#e9d9a6',
  noteTextColor: brand.dark,
  activationBkgColor: '#ffe6f2',
  activationBorderColor: brand.pink,
  sequenceNumberColor: '#ffffff',
  // ER diagrams
  attributeBackgroundColorOdd: '#ffffff',
  attributeBackgroundColorEven: '#fdf8fb',
}

const dark: MermaidConfig['themeVariables'] = {
  fontFamily: font,
  fontSize: '16px',
  darkMode: true,
  background: '#1f1826',
  primaryColor: '#3b2c47',
  primaryBorderColor: brand.pink,
  primaryTextColor: brand.beige,
  secondaryColor: '#2c2235',
  secondaryBorderColor: '#5a4a66',
  secondaryTextColor: brand.beige,
  tertiaryColor: '#2a2032',
  tertiaryBorderColor: '#4a3c55',
  tertiaryTextColor: brand.beige,
  lineColor: '#b9aec2',
  textColor: brand.beige,
  edgeLabelBackground: '#2c2235',
  clusterBkg: '#261d2e',
  clusterBorder: '#5a3a55',
  titleColor: brand.beige,
  actorBkg: brand.pink,
  actorBorder: brand.pink,
  actorTextColor: '#ffffff',
  actorLineColor: '#6e6078',
  signalColor: '#e6dcee',
  signalTextColor: brand.beige,
  labelBoxBkgColor: brand.pinkSoft,
  labelBoxBorderColor: brand.pinkSoft,
  labelTextColor: brand.dark,
  loopTextColor: brand.beige,
  noteBkgColor: '#3b2c47',
  noteBorderColor: '#5a4a66',
  noteTextColor: brand.beige,
  activationBkgColor: '#3b2c47',
  activationBorderColor: brand.pinkSoft,
  sequenceNumberColor: brand.dark,
  attributeBackgroundColorOdd: '#2c2235',
  attributeBackgroundColorEven: '#261d2e',
}

// Rounded, softer shapes to match the brand's circular logo.
const themeCSS = `
  .node rect, .node polygon, .cluster rect { rx: 10px; ry: 10px; }
  .node rect, .node circle, .node polygon, .node path { stroke-width: 1.5px; }
  .cluster rect { stroke-dasharray: 4 3; }
  .edgeLabel, .edgeLabel p { font-size: 13px; }
  .cluster-label .nodeLabel, .cluster-label p { font-weight: 700; }
  rect.actor { rx: 10px; ry: 10px; }
  .messageText { font-size: 14px; }
  .note { rx: 8px; ry: 8px; }
  .stateGroup rect, .statediagram-state rect { rx: 10px; ry: 10px; }
`

export function mermaidConfig(isDark: boolean): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    // ELK with straight (orthogonal) lines gives the tidiest results. A diagram can opt back into dagre
    // with front matter `config: { layout: dagre }`.
    layout: 'elk',
    elk: { mergeEdges: true, nodePlacementStrategy: 'BRANDES_KOEPF' },
    themeVariables: isDark ? dark : light,
    themeCSS,
    fontFamily: font,
    flowchart: { curve: 'linear', padding: 16, nodeSpacing: 36, rankSpacing: 56, diagramPadding: 12, htmlLabels: true, wrappingWidth: 220 },
    sequence: { actorMargin: 60, boxMargin: 8, messageMargin: 36, mirrorActors: false, showSequenceNumbers: false },
    er: { layoutDirection: 'TB', minEntityWidth: 120 },
    state: { padding: 10 },
  }
}
