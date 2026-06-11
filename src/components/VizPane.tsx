import type { TraceStep } from '../types/trace';
import ArrayViz from './ArrayViz';
import SearchViz, { isSearchStep } from './SearchViz';
import StackPanel from './StackPanel';
import HeapDiagram from './HeapDiagram';
import { SectionLabel } from './ArrayViz';
import DsViz, { detectDs } from './DsViz';

interface Props {
  step:     TraceStep | undefined;
  prevStep: TraceStep | undefined;
}

function TerminalOutput({ stdout, prevStdout }: { stdout: string; prevStdout?: string }) {
  const prev    = prevStdout ?? '';
  const newPart = stdout.slice(prev.length);
  return (
    <div>
      <SectionLabel>output</SectionLabel>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--line)',
        borderRadius: 'var(--r)', padding: '10px 12px',
        fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.65,
      }}>
        <div style={{ color: 'var(--t3)', marginBottom: 6, fontSize: 10, letterSpacing: '0.06em' }}>$ run</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {prev    && <span style={{ color: 'var(--green)' }}>{prev}</span>}
          {newPart && <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{newPart}</span>}
          <span className="terminal-cursor" />
        </pre>
      </div>
    </div>
  );
}

function ExceptionBox({ error }: { error: string }) {
  return (
    <div>
      <SectionLabel>exception</SectionLabel>
      <div style={{
        padding: '10px 12px',
        background: 'rgba(244,63,94,0.06)',
        border: '1px solid rgba(244,63,94,0.18)',
        borderRadius: 'var(--r)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--red)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <pre style={{
          fontFamily: 'var(--mono)', fontSize: 11.5, margin: 0,
          color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5,
        }}>{error}</pre>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(124,106,247,0.06)',
        border: '1px solid rgba(124,106,247,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 5 }}>
          Ready to visualize
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.6 }}>
          Click <strong style={{ color: 'var(--t2)' }}>Edit</strong> to write code,
          then <strong style={{ color: 'var(--green)' }}>Run</strong> to trace it.
        </div>
      </div>
      <div style={{
        fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)',
        background: 'var(--surf)', padding: '6px 14px', borderRadius: 'var(--r)',
        border: '1px solid var(--line)', lineHeight: 1.9,
      }}>
        ← → step · space play · r reset
      </div>
    </div>
  );
}

export default function VizPane({ step, prevStep }: Props) {
  const globals = step?.stack?.find((f) => f.globals)?.globals ?? {};
  const headPtr = typeof globals.head === 'string' ? globals.head : undefined;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', height: 38, flexShrink: 0,
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600,
            color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>Visualization</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
          {step?.note && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t2)',
              maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{step.note}</span>
          )}
          {step && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', flexShrink: 0 }}>
              step {step.step + 1}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {!step ? (
        <EmptyState />
      ) : (
        <div style={{
          flex: 1, overflowY: 'auto', padding: 14,
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {/* Data Structure Visualizer (linked list, stack, queue) */}
          <DsViz step={step} />

          {/* Search cell grid — linear / binary search */}
          {!detectDs(step) && <SearchViz step={step} />}

          {/* Array bars — sorting algorithms (skip when showing search or DS viz) */}
          {!isSearchStep(step) && !detectDs(step) && <ArrayViz step={step} />}

          {/* Heap — C++ (skip when showing custom DS visualizer) */}
          {step.heap && !detectDs(step) && (
            <HeapDiagram heap={step.heap} headPtr={headPtr} />
          )}

          <StackPanel step={step} prevStep={prevStep} />
          {step.stdout && <TerminalOutput stdout={step.stdout} prevStdout={prevStep?.stdout} />}
          {step.error  && <ExceptionBox error={step.error} />}
        </div>
      )}
    </div>
  );
}
