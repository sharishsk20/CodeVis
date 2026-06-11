import type { TraceEvent, TraceStep } from '../types/trace';

interface Props {
  stepIdx:       number;
  total:         number;
  playing:       boolean;
  speed:         number;
  event:         TraceEvent | undefined;
  note:          string | undefined;
  steps:         TraceStep[];
  onPrev:        () => void;
  onNext:        () => void;
  onReset:       () => void;
  onTogglePlay:  () => void;
  onSpeedChange: (s: number) => void;
  onScrub:       (idx: number) => void;
}

const SPEEDS = [[0.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×']] as const;

const EV_COLOR: Record<string, string> = {
  call:      '#38bdf8',
  return:    '#34d399',
  exception: '#f43f5e',
  step:      '#4a4a54',
};

const MARKER_COLOR: Record<string, string> = {
  call:      '#38bdf8',
  return:    '#34d399',
  exception: '#f43f5e',
};

function IconBtn({ onClick, disabled, children, title }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; title?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      width: 32, height: 32,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent',
      border: '1px solid transparent',
      borderRadius: 'var(--r)',
      color: disabled ? 'var(--t3)' : 'var(--t2)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 0.1s, color 0.1s, border-color 0.1s',
    }}
      onMouseEnter={(e) => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surf)';
          el.style.borderColor = 'var(--line)';
          el.style.color = 'var(--t1)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'transparent';
        el.style.borderColor = 'transparent';
        el.style.color = disabled ? 'var(--t3)' : 'var(--t2)';
      }}
    >{children}</button>
  );
}

export default function PlaybackBar({
  stepIdx, total, playing, speed, event, note, steps,
  onPrev, onNext, onReset, onTogglePlay, onSpeedChange, onScrub,
}: Props) {
  const pct     = total > 1 ? (stepIdx / (total - 1)) * 100 : 0;
  const evColor = EV_COLOR[event ?? 'step'] ?? EV_COLOR.step;

  const markers = steps
    .map((s, i) => ({ i, event: s.event }))
    .filter((m) => m.event !== 'step');

  return (
    <div style={{
      flexShrink: 0,
      borderTop: '1px solid var(--line)',
      background: 'var(--panel)',
    }}>

      {/* ── Progress scrubber ── */}
      <div
        style={{ position: 'relative', height: 3, background: 'var(--surf)', cursor: 'pointer' }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onScrub(Math.round(((e.clientX - rect.left) / rect.width) * (total - 1)));
        }}
      >
        <div style={{
          position: 'absolute', inset: '0 auto 0 0',
          width: `${pct}%`, background: 'var(--violet)',
          transition: 'width 0.1s linear',
        }} />
        {markers.map((m) => {
          const left = total > 1 ? (m.i / (total - 1)) * 100 : 0;
          const c = MARKER_COLOR[m.event] ?? 'var(--t3)';
          return (
            <div key={m.i} style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: `${left}%`, marginLeft: -2,
              width: 4, height: 4, borderRadius: '50%',
              background: c, opacity: 0.6, pointerEvents: 'none',
            }} />
          );
        })}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
          left: `${pct}%`,
          width: 9, height: 9, borderRadius: '50%',
          background: 'var(--violet)',
          boxShadow: '0 0 0 2px var(--panel), 0 0 0 3px rgba(124,106,247,0.5)',
          transition: 'left 0.1s linear',
          zIndex: 1, pointerEvents: 'none',
        }} />
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px' }}>

        {/* Transport */}
        <IconBtn onClick={onReset} title="Reset (R)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="3.5" height="16"/><polygon points="20,4 10,12 20,20"/>
          </svg>
        </IconBtn>
        <IconBtn onClick={onPrev} disabled={stepIdx === 0} title="Prev (←)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19,4 9,12 19,20"/><rect x="5" y="4" width="3.5" height="16"/>
          </svg>
        </IconBtn>

        {/* Play / Pause */}
        <button onClick={onTogglePlay} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 16px', borderRadius: 'var(--r)',
          background: playing ? 'rgba(245,158,11,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${playing ? 'rgba(245,158,11,0.25)' : 'rgba(52,211,153,0.25)'}`,
          color: playing ? 'var(--amber)' : 'var(--green)',
          fontSize: 12, fontWeight: 600,
          minWidth: 80, justifyContent: 'center',
          transition: 'all 0.12s ease',
          cursor: 'pointer',
        }}>
          {playing ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
          {playing ? 'Pause' : 'Play'}
        </button>

        <IconBtn onClick={onNext} disabled={stepIdx >= total - 1} title="Next (→)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,4 15,12 5,20"/><rect x="16.5" y="4" width="3.5" height="16"/>
          </svg>
        </IconBtn>

        {/* Event badge + note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6, minWidth: 0, overflow: 'hidden' }}>
          {event && event !== 'step' && (
            <span style={{
              fontSize: 9.5, padding: '2px 7px', borderRadius: 'var(--r-sm)',
              background: `${evColor}15`, color: evColor,
              border: `1px solid ${evColor}28`,
              fontFamily: 'var(--mono)', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
            }}>{event}</span>
          )}
          {note && (
            <span style={{
              fontSize: 11.5, color: 'var(--t2)', fontFamily: 'var(--mono)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{note}</span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {SPEEDS.map(([s, label]) => (
            <button key={s} onClick={() => onSpeedChange(s)} style={{
              padding: '3px 8px', borderRadius: 'var(--r-sm)',
              border: `1px solid ${speed === s ? 'rgba(124,106,247,0.35)' : 'transparent'}`,
              background: speed === s ? 'rgba(124,106,247,0.1)' : 'transparent',
              color: speed === s ? 'var(--violet)' : 'var(--t3)',
              fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--mono)',
              cursor: 'pointer', transition: 'all 0.1s',
            }}>{label}</button>
          ))}
        </div>

        {/* Step counter */}
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 8,
          color: 'var(--t3)',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{stepIdx + 1}</span>
          <span>/</span>
          <span>{total}</span>
        </div>
      </div>
    </div>
  );
}
