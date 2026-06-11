/**
 * HeapDiagram — SVG visualization of heap-allocated nodes.
 *
 * Renders nodes left-to-right in reverse-allocation order (head first),
 * draws blue pointer arrows between linked nodes, and dashes to NULL.
 * The node pointed to by `head` gets a teal border.
 */

import type { HeapNode } from '../types/trace';
import { SectionLabel } from './ArrayViz';

interface Props {
  heap:    HeapNode[];
  headPtr: string | undefined;
}

function fmtVal(v: any): string {
  if (v === null || v === 'NULL') return 'NULL';
  if (v === undefined || v === '?') return '?';
  return String(v);
}

const NODE_W = 84;
const NODE_H = 52;
const GAP_X  = 26;
const HEAD_W = 66;
const PAD_Y  = 12;

export default function HeapDiagram({ heap, headPtr }: Props) {
  if (!heap || heap.length === 0) {
    return (
      <div>
        <SectionLabel>heap memory</SectionLabel>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)', padding: '6px 0' }}>
          heap is empty
        </div>
      </div>
    );
  }

  // Reverse: latest allocation (= head) comes first / leftmost
  const rev = [...heap].reverse();
  const svgW = HEAD_W + rev.length * (NODE_W + GAP_X) + 16;
  const svgH = NODE_H + PAD_Y * 2;

  // x position of each node's left edge
  const posOf: Record<string, number> = {};
  rev.forEach((node, i) => {
    posOf[node.id] = HEAD_W + i * (NODE_W + GAP_X);
  });

  return (
    <div>
      <SectionLabel>heap memory</SectionLabel>
      <div style={{ overflowX: 'auto' }}>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: 'block', overflow: 'visible' }}
          aria-label="Heap memory diagram"
        >
          <defs>
            <marker id="arrow-blue" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0,0 7,3.5 0,7" fill="#378ADD" />
            </marker>
            <marker id="arrow-gray" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0,0 7,3.5 0,7" fill="#484f58" />
            </marker>
          </defs>

          {/* "head" label + arrow */}
          <text x={2} y={PAD_Y + NODE_H / 2 + 4} fontSize={11} fontFamily="monospace" fill="#1D9E75" fontWeight="600">head</text>
          {headPtr && headPtr !== 'NULL' ? (
            <line
              x1={36} y1={PAD_Y + NODE_H / 2}
              x2={HEAD_W - 2} y2={PAD_Y + NODE_H / 2}
              stroke="#378ADD" strokeWidth={1.5}
              markerEnd="url(#arrow-blue)"
            />
          ) : (
            <text x={38} y={PAD_Y + NODE_H / 2 + 4} fontSize={9} fontFamily="monospace" fill="#484f58">= NULL</text>
          )}

          {rev.map((node) => {
            const x   = posOf[node.id];
            const y   = PAD_Y;
            const pf  = node.fields.find((f) => f.isPtr);
            const tgt = pf?.target;
            const isHead = node.id === headPtr;

            return (
              <g key={node.id}>
                {/* Node rect */}
                <rect
                  x={x} y={y} width={NODE_W} height={NODE_H} rx={4}
                  fill="#21262d"
                  stroke={isHead ? '#1D9E75' : '#30363d'}
                  strokeWidth={isHead ? 1.5 : 0.5}
                />
                {/* Address label */}
                <text x={x + 5} y={y + 12} fontSize={9} fontFamily="monospace" fill="#484f58">{node.id}</text>
                {/* Fields */}
                {node.fields.map((f, fi) => (
                  <text key={fi} x={x + 5} y={y + 26 + fi * 14} fontSize={11} fontFamily="monospace"
                    fill={f.isPtr ? '#378ADD' : '#e6edf3'}>
                    {f.key}: {fmtVal(f.val)}
                  </text>
                ))}

                {/* Arrow → next node */}
                {typeof tgt === 'string' && posOf[tgt] !== undefined && (
                  <line
                    x1={x + NODE_W} y1={y + NODE_H / 2}
                    x2={posOf[tgt]} y2={y + NODE_H / 2}
                    stroke="#378ADD" strokeWidth={1.5}
                    markerEnd="url(#arrow-blue)"
                  />
                )}
                {/* Dashed → NULL */}
                {tgt === null && (
                  <>
                    <line
                      x1={x + NODE_W} y1={y + NODE_H / 2}
                      x2={x + NODE_W + 20} y2={y + NODE_H / 2}
                      stroke="#484f58" strokeWidth={1} strokeDasharray="2,2"
                      markerEnd="url(#arrow-gray)"
                    />
                    <text x={x + NODE_W + 3} y={y + NODE_H / 2 - 3} fontSize={8} fontFamily="monospace" fill="#484f58">NULL</text>
                  </>
                )}
                {/* Uninitialized */}
                {tgt === undefined && (
                  <text x={x + NODE_W + 2} y={y + NODE_H / 2 + 4} fontSize={9} fontFamily="monospace" fill="#484f58">??</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
