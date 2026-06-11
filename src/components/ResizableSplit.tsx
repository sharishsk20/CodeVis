/**
 * ResizableSplit — horizontal resizable split pane.
 *
 * Renders a draggable handle between two children.
 * Uses pointer events for smooth, jank-free dragging.
 */

import { useState, useRef, useCallback } from 'react';

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeft?: number; // percentage, default 42
  minLeft?: number;     // percentage
  maxLeft?: number;     // percentage
}

export default function ResizableSplit({
  left, right,
  initialLeft = 42, minLeft = 25, maxLeft = 70,
}: Props) {
  const [leftPct, setLeftPct] = useState(initialLeft);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPct(Math.max(minLeft, Math.min(maxLeft, pct)));
  }, [dragging, minLeft, maxLeft]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flex: 1, overflow: 'hidden',
        cursor: dragging ? 'col-resize' : 'default',
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Left panel */}
      <div style={{
        width: `${leftPct}%`, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {left}
      </div>

      {/* Drag handle */}
      <div
        onPointerDown={handlePointerDown}
        style={{
          width: 5, cursor: 'col-resize',
          background: dragging ? 'rgba(124,106,247,0.6)' : 'var(--line)',
          transition: dragging ? 'none' : 'background 0.15s ease',
          flexShrink: 0, zIndex: 10,
        }}
      />

      {/* Right panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {right}
      </div>
    </div>
  );
}
