/**
 * VizPane — right-hand panel.
 *
 * Shows:
 *  • ArrayViz   — if the top stack frame has a numeric array local
 *  • HeapDiagram — if the current step has heap data (C++ traces)
 *  • StackPanel  — always
 *  • Stdout      — when there is output
 */

import type { TraceStep } from '../types/trace';
import ArrayViz from './ArrayViz';
import StackPanel from './StackPanel';
import HeapDiagram from './HeapDiagram';
import { SectionLabel } from './ArrayViz';

interface Props {
  step:     TraceStep | undefined;
  prevStep: TraceStep | undefined;
}

export default function VizPane({ step, prevStep }: Props) {
  const globals = step?.stack?.find((f) => f.globals)?.globals ?? {};
  const headPtr = typeof globals.head === 'string' ? globals.head : undefined;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-canvas)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 14px', borderBottom: '1px solid var(--glass-border)',
        background: 'linear-gradient(135deg, rgba(33,38,45,0.9), rgba(22,27,34,0.95))',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef9f27, #f43f5e)',
            boxShadow: '0 0 8px rgba(239,159,39,0.4)',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            color: '#ef9f27', letterSpacing: '0.02em',
          }}>VISUALIZATION</span>
        </div>
        {step && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-tertiary)',
          }}>step {step.step + 1}</span>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Array bars — Python */}
        <ArrayViz step={step} />

        {/* Heap — C++ */}
        {step?.heap && (
          <HeapDiagram heap={step.heap} headPtr={headPtr} />
        )}

        {/* Call stack */}
        <StackPanel step={step} prevStep={prevStep} />

        {/* Stdout */}
        {step?.stdout && (
          <div>
            <SectionLabel>stdout</SectionLabel>
            <pre style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              padding: '10px 12px', margin: 0,
              background: 'linear-gradient(135deg, rgba(29,158,117,0.06), rgba(34,211,238,0.04))',
              border: '1px solid rgba(29,158,117,0.2)',
              borderRadius: 8, color: '#2dd4a8',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>{step.stdout}</pre>
          </div>
        )}

        {/* Exception */}
        {step?.error && (
          <div>
            <SectionLabel>exception</SectionLabel>
            <pre style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              padding: '10px 12px', margin: 0,
              background: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(239,159,39,0.06))',
              border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 8, color: '#f87171',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>{step.error}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
