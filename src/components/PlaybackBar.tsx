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

const EVENT_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  call:      { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', glow: 'none' },
  return:    { bg: 'rgba(29,158,117,0.12)',  text: '#2dd4a8', glow: 'none' },
  exception: { bg: 'rgba(244,63,94,0.12)',   text: '#f43f5e', glow: 'none' },
  step:      { bg: 'rgba(255,255,255,0.05)', text: '#8b949e', glow: 'none' },
};

function TransportBtn({ onClick, disabled, title, children, color }: {
  onClick: () => void; disabled?: boolean; title?: string;
  children: React.ReactNode; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: disabled ? 'transparent' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${disabled ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--text-tertiary)' : (color || 'var(--text-secondary)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '5px 8px',
        borderRadius: 8, fontSize: 15,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        width: 34, height: 34,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = disabled ? 'transparent' : 'rgba(255,255,255,0.04)';
        (e.currentTarget as HTMLElement).style.borderColor = disabled ? 'transparent' : 'rgba(255,255,255,0.06)';
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );
}

const MARKER_COLORS: Record<string, string> = {
  call:      '#38bdf8',
  return:    '#2dd4a8',
  exception: '#f43f5e',
};

export default function PlaybackBar({
  stepIdx, total, playing, speed, event, note, steps,
  onPrev, onNext, onReset, onTogglePlay, onSpeedChange, onScrub,
}: Props) {
  const pct = total > 1 ? (stepIdx / (total - 1)) * 100 : 0;
  const ev  = EVENT_COLORS[event ?? 'step'] ?? EVENT_COLORS.step;

  const markers = steps
    .map((s, i) => ({ i, event: s.event }))
    .filter((m) => m.event !== 'step');

  return (
    <div style={{
      flexShrink: 0, borderTop: '1px solid var(--glass-border)',
      background: 'var(--bg-panel)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* ── Progress scrubber ── */}
      <div style={{
        position: 'relative', height: 6, cursor: 'pointer',
        background: 'rgba(255,255,255,0.06)',
      }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onScrub(Math.round(ratio * (total - 1)));
        }}
      >
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: '#1d9e75',
          transition: 'width 0.15s ease',
          borderRadius: '0 2px 2px 0',
        }} />
        {/* Event markers */}
        {markers.map((m) => {
          const left = total > 1 ? (m.i / (total - 1)) * 100 : 0;
          const color = MARKER_COLORS[m.event] ?? '#8b949e';
          return (
            <div key={m.i} title={m.event} style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: `${left}%`, marginLeft: -2,
              width: 4, height: 4, borderRadius: '50%',
              background: color, opacity: 0.75,
              pointerEvents: 'none',
            }} />
          );
        })}
        {/* Scrubber dot */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: `${pct}%`, marginLeft: -5,
          width: 10, height: 10, borderRadius: '50%',
          background: '#22d3ee',
          boxShadow: '0 0 8px rgba(34,211,238,0.6)',
          transition: 'left 0.15s ease',
          zIndex: 1,
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px' }}>
        {/* Transport buttons */}
        <TransportBtn onClick={onReset} title="Reset to start (R)" color="#ef9f27">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="4" height="16"/><polygon points="20,4 10,12 20,20"/></svg>
        </TransportBtn>
        <TransportBtn onClick={onPrev} disabled={stepIdx === 0} title="Previous step (←)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,4 9,12 19,20"/><rect x="5" y="4" width="3" height="16"/></svg>
        </TransportBtn>

        {/* Play / Pause — hero button */}
        <button onClick={onTogglePlay} className="btn-modern" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
          minWidth: 90, justifyContent: 'center', fontWeight: 600,
          background: playing ? 'rgba(239,159,39,0.14)' : 'rgba(29,158,117,0.14)',
          border: `1px solid ${playing ? 'rgba(239,159,39,0.35)' : 'rgba(29,158,117,0.35)'}`,
          color: playing ? '#ef9f27' : '#2dd4a8',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {playing ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          )}
          <span style={{ fontSize: 12 }}>{playing ? 'Pause' : 'Play'}</span>
        </button>

        <TransportBtn onClick={onNext} disabled={stepIdx >= total - 1} title="Next step (→)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="16" y="4" width="3" height="16"/></svg>
        </TransportBtn>

        {/* Step note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginLeft: 8, minWidth: 0, overflow: 'hidden' }}>
          {event && (
            <span style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
              background: ev.bg, color: ev.text, boxShadow: ev.glow,
              fontFamily: 'var(--font-mono)', flexShrink: 0,
              border: `1px solid ${ev.text}22`,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>{event}</span>
          )}
          {note && (
            <span style={{
              fontSize: 12, color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{note}</span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Speed picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.1em',
            fontWeight: 600, fontFamily: 'var(--font-mono)',
          }}>SPEED</span>
          {SPEEDS.map(([s, label]) => (
            <button key={s} onClick={() => onSpeedChange(s)} style={{
              padding: '3px 9px', borderRadius: 6, fontSize: 11,
              cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 600,
              background: speed === s ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${speed === s ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.06)'}`,
              color: speed === s ? '#38bdf8' : 'var(--text-tertiary)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>{label}</button>
          ))}
        </div>

        {/* Step counter */}
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, marginLeft: 6, flexShrink: 0,
          background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontWeight: 700, color: '#22d3ee' }}>{stepIdx + 1}</span>
          <span style={{ color: 'var(--text-tertiary)', margin: '0 2px' }}>/</span>
          <span style={{ color: 'var(--text-tertiary)' }}>{total}</span>
        </div>
      </div>
    </div>
  );
}
