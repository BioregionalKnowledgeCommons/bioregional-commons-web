import type {
  Roadmap,
  RoadmapNode,
  RoadmapEdge,
  LaneId,
  LayoutNode,
  LayoutResult,
} from './roadmap-types';
import { HORIZONS } from './roadmap-types';

// ─── Constants ────────────────────────────────────────────────────────────────
export const COL_WIDTH = 300;
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

// ─── Main layout function ─────────────────────────────────────────────────────
export function computeLayout(roadmap: Roadmap): LayoutResult {
  const nodeMap = new Map(roadmap.nodes.map((n) => [n.id, n]));
  const edgesByFrom = new Map<string, RoadmapEdge[]>();
  for (const edge of roadmap.edges) {
    if (!edgesByFrom.has(edge.from)) edgesByFrom.set(edge.from, []);
    edgesByFrom.get(edge.from)!.push(edge);
  }

  // ── 1. Assign lanes and columns ──────────────────────────────────────────
  type Placement = { lane: LaneId; col: number };
  const placements = new Map<string, Placement>();
  const cellSlots = new Map<string, RoadmapNode[]>(); // "lane:col" → [node, …]

  for (const node of roadmap.nodes) {
    const lane = assignLane(node, nodeMap, edgesByFrom, new Set<string>());
    const colIdx = HORIZONS.indexOf(node.horizon as typeof HORIZONS[number]);
    const col = colIdx >= 0 ? colIdx : 0;
    placements.set(node.id, { lane, col });
    const key = `${lane}:${col}`;
    if (!cellSlots.has(key)) cellSlots.set(key, []);
    cellSlots.get(key)!.push(node);
  }

  // ── 2. Compute per-lane heights ──────────────────────────────────────────
  const laneHeight: Record<LaneId, number> = {} as Record<LaneId, number>;
  for (const laneId of LANE_ORDER) {
    let maxNodes = 0;
    for (let c = 0; c < HORIZONS.length; c++) {
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

  const totalWidth = SVG_PAD + LABEL_WIDTH + HORIZONS.length * COL_WIDTH + SVG_PAD;
  const totalHeight = curY + SVG_PAD;

  // ── 4. Compute node x/y positions ────────────────────────────────────────
  const layoutNodes: LayoutNode[] = [];
  const cellIndex = new Map<string, number>();

  for (const node of roadmap.nodes) {
    const { lane, col } = placements.get(node.id)!;
    const key = `${lane}:${col}`;
    const idx = cellIndex.get(key) ?? 0;
    cellIndex.set(key, idx + 1);

    const nodeX = SVG_PAD + LABEL_WIDTH + col * COL_WIDTH + (COL_WIDTH - NODE_WIDTH) / 2;
    const nodeY = laneY[lane] + LANE_PADDING + idx * (NODE_HEIGHT + NODE_GAP);

    layoutNodes.push({
      ...node,
      lane,
      col,
      x: nodeX,
      y: nodeY,
      width: NODE_WIDTH,
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
  };
}
