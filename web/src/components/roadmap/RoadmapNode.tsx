'use client';

import type { LayoutNode } from './roadmap-types';
import { LANE_CONFIG_MAP, STATUS_COLORS, PRIORITY_COLORS } from './roadmap-types';

interface Props {
  node: LayoutNode;
  isSelected: boolean;
  isHighlighted: boolean; // connected to selected node
  onClick: (node: LayoutNode) => void;
}

const KIND_ICON: Record<string, string> = {
  outcome:    '◉',
  initiative: '◈',
  work_item:  '□',
  decision:   '◇',
  risk:       '⚠',
  milestone:  '★',
  metric:     '◎',
};

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

export function RoadmapNodeComponent({ node, isSelected, isHighlighted, onClick }: Props) {
  const { x, y, width, height, lane, status, priority, kind } = node;
  const laneConfig = LANE_CONFIG_MAP[lane];
  const statusColor = STATUS_COLORS[status];
  const priorityColor = PRIORITY_COLORS[priority] ?? '#6b7280';

  const fill = isSelected
    ? lighten(laneConfig.nodeFill, 30)
    : isHighlighted
    ? lighten(laneConfig.nodeFill, 15)
    : laneConfig.nodeFill;

  const strokeColor = isSelected
    ? laneConfig.accent
    : isHighlighted
    ? `${laneConfig.accent}88`
    : `${laneConfig.accent}44`;

  const strokeWidth = isSelected ? 2 : isHighlighted ? 1.5 : 1;
  const opacity = isSelected || isHighlighted
    ? 1
    : status === 'done'
    ? 0.5
    : status === 'planned'
    ? 0.75
    : 1;

  const clipId = `clip-${node.id.replace(/\./g, '-')}`;
  const titleText = truncate(node.title, 36);
  const kindIcon = status === 'done' ? '✓' : (KIND_ICON[kind] ?? '□');

  return (
    <g
      onClick={() => onClick(node)}
      style={{ cursor: 'pointer' }}
      opacity={opacity}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x + 4} y={y} width={width - 8} height={height} />
        </clipPath>
      </defs>

      {/* Main rect */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Status strip (left edge) */}
      <rect x={x} y={y + 6} width={3} height={height - 12} rx={1.5} fill={statusColor} />

      {/* Priority dot (top-right) */}
      <circle cx={x + width - 10} cy={y + 10} r={4} fill={priorityColor} opacity={0.9} />

      {/* Kind icon + title */}
      <text
        x={x + 12}
        y={y + 20}
        fontSize={10}
        fill={laneConfig.accent}
        fontFamily="monospace"
        clipPath={`url(#${clipId})`}
      >
        {kindIcon} {kind.replace('_', ' ')}
      </text>

      <text
        x={x + 10}
        y={y + 38}
        fontSize={12}
        fontWeight={600}
        fill="#e2e8f0"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        clipPath={`url(#${clipId})`}
      >
        {titleText}
      </text>

      {/* Status label */}
      <text
        x={x + 10}
        y={y + 54}
        fontSize={9}
        fill={statusColor}
        fontFamily="monospace"
        clipPath={`url(#${clipId})`}
      >
        {status.replace('_', ' ')}
        {node.due_date ? `  · due ${node.due_date}` : ''}
      </text>
    </g>
  );
}

// Naive hex lightener — shifts brightness without external deps
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amount);
  const g = Math.min(255, ((n >> 8) & 0xff) + amount);
  const b = Math.min(255, (n & 0xff) + amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
