import type {
  Roadmap,
  RoadmapNode,
  RoadmapEdge,
  LaneId,
  LayoutNode,
  LayoutResult,
  ColumnSpec,
  Horizon,
} from './roadmap-types';
import { HORIZONS } from './roadmap-types';
import { getLunarPhasesInWindow } from './roadmap-calendar';

// ─── Constants ────────────────────────────────────────────────────────────────
export const COL_WIDTH = 300;           // standard (collapsed) horizon column
export const PHASE_COL_WIDTH = 150;     // lunar phase sub-column
export const UNSCHEDULED_COL_WIDTH = 200; // unscheduled sub-column
export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 64;
export const NODE_GAP = 12;
export const LANE_PADDING = 16;
export const LABEL_WIDTH = 140;
export const COL_HEADER_HEIGHT = 48;
export const SVG_PAD = 16;

const LANE_ORDER: LaneId[] = ['header', 'demo', 'kg', 'security', 'capital', 'footer'];

// ─── Tag → Lane ───────────────────────────────────────────────────────────────
const TAG_TO_LANE: Record<string, LaneId> = {
  demo: 'demo', operations: 'demo', sprint: 'demo', interop: 'demo',
  chat: 'kg', evaluation: 'kg', roadmap: 'kg',
  governance: 'security', policy: 'security', security: 'security', federation: 'security',
  finance: 'capital', tbff: 'capital', integration: 'capital', evidence: 'capital',
};

// ─── Initiative ID → Lane ─────────────────────────────────────────────────────
const INITIATIVE_TO_LANE: Record<string, LaneId> = {
  'initiative.build-day-sprint-mar5':        'demo',
  'initiative.part-b-kg-chat':               'kg',
  'initiative.part-b-security-addendum':     'security',
  'initiative.tbff-knowledge-flow-pilot':    'capital',
};

// ─── Lane Assignment (4-tier cascade) ────────────────────────────────────────
function assignLane(
  node: RoadmapNode,
  nodeMap: Map<string, RoadmapNode>,
  edgesByFrom: Map<string, RoadmapEdge[]>,
  visited: Set<string>,
): LaneId {
  if (visited.has(node.id)) return 'demo';
  visited.add(node.id);

  // Tier 1 — Node tags
  if (node.tags) {
    for (const tag of node.tags) {
      const lane = TAG_TO_LANE[tag];
      if (lane) return lane;
    }
  }

  const outgoing = edgesByFrom.get(node.id) ?? [];

  // Tier 2 — Initiative ancestry (walk `delivers` to a known initiative)
  for (const edge of outgoing) {
    if (edge.type === 'delivers') {
      const target = nodeMap.get(edge.to);
      if (target?.kind === 'initiative') {
        const lane = INITIATIVE_TO_LANE[target.id];
        if (lane) return lane;
      }
    }
  }

  // Tier 3 — Outcome ancestry (walk `delivers` to an outcome, resolve outcome lane)
  for (const edge of outgoing) {
    if (edge.type === 'delivers') {
      const target = nodeMap.get(edge.to);
      if (target?.kind === 'outcome') {
        const outcomeLane = assignLane(target, nodeMap, edgesByFrom, new Set(visited));
        if (outcomeLane && outcomeLane !== 'header') return outcomeLane;
      }
    }
  }

  // Tier 4 — Kind hard fallback
  if (node.kind === 'outcome' || node.kind === 'milestone') return 'header';

  if (node.kind === 'decision') {
    // Try informs → initiative as a hint
    for (const edge of outgoing) {
      if (edge.type === 'informs') {
        const target = nodeMap.get(edge.to);
        if (target?.kind === 'initiative') {
          const lane = INITIATIVE_TO_LANE[target.id];
          if (lane) return lane;
        }
      }
    }
    return 'security';
  }

  if (node.kind === 'risk') {
    // "risk → lane of the node it mitigates; else Security"
    // Risks are mitigated BY others, they don't mitigate — fallback to security
    return 'security';
  }

  if (node.kind === 'metric') {
    for (const edge of outgoing) {
      if (edge.type === 'measures') {
        const target = nodeMap.get(edge.to);
        if (target) {
          return assignLane(target, nodeMap, edgesByFrom, new Set(visited));
        }
      }
    }
    return 'demo';
  }

  // work_item with no tag and no edge ancestry — unexpected
  if (node.kind === 'work_item') {
    console.warn(`[roadmap-layout] Unexpected Tier 4 hit for work_item: ${node.id}`);
    return 'demo';
  }

  return 'demo';
}

// ─── Horizon date-range offsets (in days from as_of) ─────────────────────────
const HORIZON_OFFSETS: Record<Horizon, { start: number; end: number }> = {
  '0-30d':    { start: 0,   end: 30 },
  '30-90d':   { start: 30,  end: 90 },
  '90-180d':  { start: 90,  end: 180 },
  '180-365d': { start: 180, end: 365 },
};

// ─── Build column specs ───────────────────────────────────────────────────────
function buildColumnSpecs(asOfStr: string, expandedHorizons: Set<Horizon>): ColumnSpec[] {
  const asOf = new Date(asOfStr + 'T00:00:00Z');
  const specs: ColumnSpec[] = [];

  for (const h of HORIZONS) {
    if (expandedHorizons.has(h)) {
      const { start: startOffset, end: endOffset } = HORIZON_OFFSETS[h];
      const horizonStart = new Date(asOf.getTime() + startOffset * 86400000);
      const horizonEnd = new Date(asOf.getTime() + endOffset * 86400000);
      const phases = getLunarPhasesInWindow(horizonStart, horizonEnd);

      // Unscheduled catch-all first
      specs.push({
        id: `${h}:unscheduled`,
        horizon: h,
        label: 'unscheduled',
        width: UNSCHEDULED_COL_WIDTH,
        isUnscheduled: true,
      });

      // One column per phase, dateRange = [phase.date, nextPhase.date)
      for (let pi = 0; pi < phases.length; pi++) {
        const phase = phases[pi];
        const nextDate = pi + 1 < phases.length ? phases[pi + 1].date : horizonEnd;
        specs.push({
          id: `${h}:${phase.name.toLowerCase().replace(/ /g, '-')}`,
          horizon: h,
          label: phase.name,
          emoji: phase.emoji,
          width: PHASE_COL_WIDTH,
          dateRange: { start: phase.date, end: nextDate },
        });
      }
    } else {
      specs.push({
        id: h,
        horizon: h,
        label: h,
        width: COL_WIDTH,
      });
    }
  }

  return specs;
}

// ─── Node → column index ──────────────────────────────────────────────────────
function findColumnIndex(
  node: RoadmapNode,
  columnSpecs: ColumnSpec[],
  expandedHorizons: Set<Horizon>,
): number {
  const h = node.horizon as Horizon;

  if (!expandedHorizons.has(h)) {
    // Simple: find the single collapsed column for this horizon
    const idx = columnSpecs.findIndex((s) => s.id === h);
    return idx >= 0 ? idx : 0;
  }

  // Horizon is expanded — place by due_date or fallback to unscheduled
  if (!node.due_date) {
    const idx = columnSpecs.findIndex((s) => s.horizon === h && s.isUnscheduled);
    return idx >= 0 ? idx : 0;
  }

  // Parse due_date as noon UTC so day comparisons are timezone-safe
  const dueDate = new Date(
    node.due_date.includes('T') ? node.due_date : node.due_date + 'T12:00:00Z',
  );

  // Collect phase columns for this horizon in order
  const phaseEntries: Array<{ idx: number; dayStart: Date; dayEnd: Date }> = [];
  for (let i = 0; i < columnSpecs.length; i++) {
    const s = columnSpecs[i];
    if (s.horizon === h && s.dateRange && !s.isUnscheduled) {
      // Truncate to start-of-day UTC so a YYYY-MM-DD due_date matches the
      // same calendar day regardless of the exact astronomical phase time
      const dayStart = new Date(s.dateRange.start);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(s.dateRange.end);
      dayEnd.setUTCHours(0, 0, 0, 0);
      phaseEntries.push({ idx: i, dayStart, dayEnd });
    }
  }

  for (const { idx, dayStart, dayEnd } of phaseEntries) {
    if (dueDate >= dayStart && dueDate < dayEnd) return idx;
  }

  // due_date set but outside the phase windows: snap to nearest phase rather
  // than dropping to unscheduled (keeps arrows readable in the timeline)
  if (phaseEntries.length > 0) {
    if (dueDate < phaseEntries[0].dayStart) return phaseEntries[0].idx;
    return phaseEntries[phaseEntries.length - 1].idx;
  }

  // Fallback: unscheduled column for this horizon
  const fallback = columnSpecs.findIndex((s) => s.horizon === h && s.isUnscheduled);
  return fallback >= 0 ? fallback : 0;
}

// ─── Main layout function ─────────────────────────────────────────────────────
export function computeLayout(
  roadmap: Roadmap,
  opts?: { expandedHorizons?: Set<Horizon> },
): LayoutResult {
  const expandedHorizons = opts?.expandedHorizons ?? new Set<Horizon>();

  const nodeMap = new Map(roadmap.nodes.map((n) => [n.id, n]));
  const edgesByFrom = new Map<string, RoadmapEdge[]>();
  for (const edge of roadmap.edges) {
    if (!edgesByFrom.has(edge.from)) edgesByFrom.set(edge.from, []);
    edgesByFrom.get(edge.from)!.push(edge);
  }

  // ── Build column specs + cumulative x-offsets ────────────────────────────
  const columnSpecs = buildColumnSpecs(roadmap.as_of, expandedHorizons);
  const colXOffsets: number[] = [];
  let xAcc = 0;
  for (const spec of columnSpecs) {
    colXOffsets.push(xAcc);
    xAcc += spec.width;
  }

  // ── 1. Assign lanes and columns ──────────────────────────────────────────
  type Placement = { lane: LaneId; col: number };
  const placements = new Map<string, Placement>();
  const cellSlots = new Map<string, RoadmapNode[]>(); // "lane:col" → [node, …]

  for (const node of roadmap.nodes) {
    const lane = assignLane(node, nodeMap, edgesByFrom, new Set<string>());
    const col = findColumnIndex(node, columnSpecs, expandedHorizons);
    placements.set(node.id, { lane, col });
    const key = `${lane}:${col}`;
    if (!cellSlots.has(key)) cellSlots.set(key, []);
    cellSlots.get(key)!.push(node);
  }

  // ── 2. Compute per-lane heights ──────────────────────────────────────────
  const laneHeight: Record<LaneId, number> = {} as Record<LaneId, number>;
  for (const laneId of LANE_ORDER) {
    let maxNodes = 0;
    for (let c = 0; c < columnSpecs.length; c++) {
      const count = cellSlots.get(`${laneId}:${c}`)?.length ?? 0;
      if (count > maxNodes) maxNodes = count;
    }
    laneHeight[laneId] = Math.max(
      160,
      maxNodes * (NODE_HEIGHT + NODE_GAP) - (maxNodes > 0 ? NODE_GAP : 0) + 2 * LANE_PADDING,
    );
  }

  // ── 3. Compute cumulative lane Y positions ───────────────────────────────
  const laneY: Record<LaneId, number> = {} as Record<LaneId, number>;
  let curY = COL_HEADER_HEIGHT;
  for (const laneId of LANE_ORDER) {
    laneY[laneId] = curY;
    curY += laneHeight[laneId];
  }

  const totalWidth = SVG_PAD + LABEL_WIDTH + xAcc + SVG_PAD;
  const totalHeight = curY + SVG_PAD;

  // ── 4. Compute node x/y positions ────────────────────────────────────────
  const layoutNodes: LayoutNode[] = [];
  const cellIndex = new Map<string, number>();

  for (const node of roadmap.nodes) {
    const { lane, col } = placements.get(node.id)!;
    const key = `${lane}:${col}`;
    const idx = cellIndex.get(key) ?? 0;
    cellIndex.set(key, idx + 1);

    const colSpec = columnSpecs[col];
    // Fit node within column width (minimum 20px total horizontal padding)
    const nodeWidth = Math.min(NODE_WIDTH, colSpec.width - 20);
    const nodeX = SVG_PAD + LABEL_WIDTH + colXOffsets[col] + (colSpec.width - nodeWidth) / 2;
    const nodeY = laneY[lane] + LANE_PADDING + idx * (NODE_HEIGHT + NODE_GAP);

    layoutNodes.push({
      ...node,
      lane,
      col,
      x: nodeX,
      y: nodeY,
      width: nodeWidth,
      height: NODE_HEIGHT,
    });
  }

  return {
    nodes: layoutNodes,
    edges: roadmap.edges,
    laneY,
    laneHeight,
    totalHeight,
    totalWidth,
    colWidth: COL_WIDTH,
    labelWidth: LABEL_WIDTH,
    headerRowHeight: COL_HEADER_HEIGHT,
    columnSpecs,
  };
}
