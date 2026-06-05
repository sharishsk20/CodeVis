import type { TraceStep } from '../types/trace';
import { SectionLabel } from './ArrayViz';

// ── Types ─────────────────────────────────────────────────────────────────────

type Kind =
  | 'linear'
  | 'binary'
  | 'jump'
  | 'interpolation'
  | 'exponential'
  | 'ternary'
  | 'fibonacci';

interface SF {
  kind:    Kind;
  name:    string;
  arr:     number[];
  target:  number;
  // binary / interpolation / ternary / exponential-p2
  lo?:     number;
  hi?:     number;
  // binary / exponential-p2
  mid?:    number;
  // interpolation
  pos?:    number;
  // ternary
  mid1?:   number;
  mid2?:   number;
  // jump  (check present ↔ jump phase)
  step?:   number;
  prev?:   number;
  check?:  number;
  // exponential phase 1
  bound?:  number;
  // fibonacci
  fib_m?:  number;
  fib_m1?: number;
  fib_m2?: number;
  offset?: number;
  probe?:  number;   // var 'i' in fib fn
  // linear
  current?: number;
}

// ── Detection ─────────────────────────────────────────────────────────────────

// Common aliases users write for search variable names
const LO_KEYS     = ['lo','low','left','l','start','begin','lb'] as const;
const HI_KEYS     = ['hi','high','right','r','end','last','ub']  as const;
const MID_KEYS    = ['mid','m','middle','pivot','center','median'] as const;
// Deliberately excludes 'key'/'val'/'value' — used by insertion sort / data structures
const TARGET_KEYS = ['target','query','num','find','search_val','needle','x_val'] as const;
const IDX_KEYS    = ['i','idx','j','index','curr','cur','current'] as const;

function detect(step: TraceStep | undefined): SF | null {
  if (!step) return null;
  for (let fi = step.stack.length - 1; fi >= 0; fi--) {
    const L = step.stack[fi].locals;
    const funcName = step.stack[fi].func.toLowerCase();

    // Find numeric array in locals
    let name = '', arr: number[] | null = null;
    for (const [k, v] of Object.entries(L)) {
      if (Array.isArray(v) && v.length >= 2 && v.every((x) => typeof x === 'number')) {
        name = k; arr = v as number[]; break;
      }
    }
    if (!arr) continue;

    // Find target — exact name first, then common aliases
    let target: number | null = null;
    for (const tk of TARGET_KEYS) {
      if (typeof L[tk] === 'number') { target = L[tk] as number; break; }
    }
    if (target === null) continue;

    // Get numeric local by exact key
    const g = (k: string) => typeof L[k] === 'number' ? (L[k] as number) : undefined;
    // Get numeric local by first matching alias
    const ga = (...keys: readonly string[]) => {
      for (const k of keys) if (typeof L[k] === 'number') return L[k] as number;
      return undefined;
    };

    // ── Exact preset detection (highest priority) ────────────────────────────
    if (g('fib_m2') !== undefined)
      return { kind:'fibonacci', name, arr, target,
        fib_m:g('fib_m'), fib_m1:g('fib_m1'), fib_m2:g('fib_m2'),
        offset:g('offset'), probe:g('i') };
    if (g('mid1') !== undefined)
      return { kind:'ternary', name, arr, target,
        lo:g('lo'), hi:g('hi'), mid1:g('mid1'), mid2:g('mid2') };
    if (g('bound') !== undefined)
      return { kind:'exponential', name, arr, target,
        bound:g('bound'), lo:g('lo'), hi:g('hi'), mid:g('mid') };
    if (g('pos') !== undefined && g('lo') !== undefined)
      return { kind:'interpolation', name, arr, target,
        lo:g('lo'), hi:g('hi'), pos:g('pos') };
    if (g('step') !== undefined && g('prev') !== undefined)
      return { kind:'jump', name, arr, target,
        step:g('step'), prev:g('prev'), check:g('check') };
    if (g('lo') !== undefined || g('hi') !== undefined)
      return { kind:'binary', name, arr, target,
        lo:g('lo'), hi:g('hi'), mid:g('mid') };

    // ── Alias + function-name detection (custom user code) ──────────────────
    const lo  = ga(...LO_KEYS);
    const hi  = ga(...HI_KEYS);
    const mid = ga(...MID_KEYS);
    const isFn = (pat: RegExp) => pat.test(funcName);

    if (isFn(/fib/) || g('fib_m1') !== undefined)
      return { kind:'fibonacci', name, arr, target,
        fib_m:  ga('fib_m','fibm','fm'),
        fib_m1: ga('fib_m1','fibm1','fm1'),
        fib_m2: ga('fib_m2','fibm2','fm2'),
        offset: g('offset'), probe: ga(...IDX_KEYS) };

    if (isFn(/ternary/) || g('mid2') !== undefined)
      return { kind:'ternary', name, arr, target,
        lo, hi,
        mid1: ga('mid1','m1','left_mid','lm','mid_left'),
        mid2: ga('mid2','m2','right_mid','rm','mid_right') };

    if (isFn(/exp(?:onential)?search|exp_search/))
      return { kind:'exponential', name, arr, target,
        bound: ga('bound','b','boundary','bnd'), lo, hi, mid };

    if (isFn(/interp/)) {
      const pos = ga('pos','probe','position','p') ?? ga(...IDX_KEYS);
      return { kind:'interpolation', name, arr, target, lo, hi, pos };
    }

    if (isFn(/jump/)) {
      return { kind:'jump', name, arr, target,
        step:  ga('step','block_size','block','step_size','s'),
        prev:  ga('prev','prev_block','prev_step'),
        check: ga('check','i','idx','j') };
    }

    if (isFn(/binary|bisect/) || lo !== undefined || hi !== undefined)
      return { kind:'binary', name, arr, target, lo, hi, mid };

    // Linear search — any remaining case with a search-looking function or index variable
    const current = ga(...IDX_KEYS);
    if (isFn(/linear|search|find/) || current !== undefined)
      return { kind:'linear', name, arr, target, current };
  }
  return null;
}

export function isSearchStep(step: TraceStep | undefined): boolean {
  return detect(step) !== null;
}

// ── Colour palette ────────────────────────────────────────────────────────────

const C = {
  dimmed:  { bg:'rgba(255,255,255,0.01)', border:'rgba(255,255,255,0.04)', text:'#3c4047'  },
  normal:  { bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.12)', text:'var(--text-secondary)' },
  inRange: { bg:'rgba(34,211,238,0.05)',  border:'rgba(34,211,238,0.22)',  text:'var(--text-secondary)' },
  cyan:    { bg:'rgba(34,211,238,0.16)',  border:'#22d3ee', text:'#67e8f9' },
  amber:   { bg:'rgba(239,159,39,0.16)',  border:'#ef9f27', text:'#ef9f27' },
  orange:  { bg:'rgba(251,146,60,0.16)',  border:'#fb923c', text:'#fdba74' },
  purple:  { bg:'rgba(192,132,252,0.16)', border:'#c084fc', text:'#e9d5ff' },
  violet:  { bg:'rgba(167,139,250,0.16)', border:'#a78bfa', text:'#c4b5fd' },
  green:   { bg:'rgba(45,212,168,0.20)',  border:'#2dd4a8', text:'#2dd4a8' },
};

function cellColor(x: number, f: SF) {
  const hit = (i: number) => f.arr[i] === f.target;
  const inR  = (lo: number, hi: number) => x >= lo && x <= hi;

  switch (f.kind) {
    case 'linear': {
      const c = f.current;
      if (c !== undefined && x === c) return hit(x) ? C.green : C.amber;
      if (c !== undefined && x  < c) return C.dimmed;
      return C.normal;
    }
    case 'binary': {
      const lo = f.lo ?? 0, hi = f.hi ?? f.arr.length - 1;
      if (f.mid !== undefined && x === f.mid) return hit(x) ? C.green : C.cyan;
      return inR(lo, hi) ? C.inRange : C.dimmed;
    }
    case 'jump': {
      const prev = f.prev ?? 0;
      const end  = f.step !== undefined ? Math.min(f.step, f.arr.length) - 1 : f.arr.length - 1;
      const chk  = f.check !== undefined ? f.check : prev;
      if (x === chk) return hit(x) ? C.green : C.amber;
      if (x < prev) return C.dimmed;
      if (x <= end) return C.inRange;
      return C.normal;
    }
    case 'interpolation': {
      const lo = f.lo ?? 0, hi = f.hi ?? f.arr.length - 1;
      if (f.pos !== undefined && x === f.pos) return hit(x) ? C.green : C.purple;
      return inR(lo, hi) ? C.inRange : C.dimmed;
    }
    case 'exponential': {
      if (f.lo !== undefined && f.hi !== undefined) {
        if (f.mid !== undefined && x === f.mid) return hit(x) ? C.green : C.cyan;
        return inR(f.lo, f.hi) ? C.inRange : C.dimmed;
      }
      const b = f.bound !== undefined ? Math.min(f.bound, f.arr.length - 1) : -1;
      if (x === b) return hit(x) ? C.green : C.amber;
      if (x < b)   return C.inRange;
      return C.normal;
    }
    case 'ternary': {
      const lo = f.lo ?? 0, hi = f.hi ?? f.arr.length - 1;
      if (f.mid1 !== undefined && x === f.mid1) return hit(x) ? C.green : C.cyan;
      if (f.mid2 !== undefined && x === f.mid2) return hit(x) ? C.green : C.orange;
      return inR(lo, hi) ? C.inRange : C.dimmed;
    }
    case 'fibonacci': {
      const off = f.offset ?? -1;
      if (f.probe !== undefined && x === f.probe) return hit(x) ? C.green : C.amber;
      if (x <= off) return C.dimmed;
      return C.inRange;
    }
  }
}

interface Ptr { lbl: string; color: string }

function cellPtrs(x: number, f: SF): Ptr[] {
  const p = (lbl: string, color: string): Ptr => ({ lbl, color });
  switch (f.kind) {
    case 'linear':
      return f.current === x ? [p('i','#ef9f27')] : [];
    case 'binary': {
      const r: Ptr[] = [];
      if (f.lo  === x) r.push(p('lo','#7dd3fc'));
      if (f.mid === x) r.push(p('mid','#22d3ee'));
      if (f.hi  === x && f.hi !== f.lo) r.push(p('hi','#7dd3fc'));
      return r;
    }
    case 'jump': {
      const r: Ptr[] = [];
      const end = f.step !== undefined ? Math.min(f.step, f.arr.length) - 1 : -1;
      if (f.prev === x) r.push(p('prev','#a78bfa'));
      if (f.check !== undefined && f.check === x && f.check !== f.prev)
        r.push(p('chk','#ef9f27'));
      else if (f.check === undefined && end === x && x !== f.prev)
        r.push(p('end','#a78bfa'));
      return r;
    }
    case 'interpolation': {
      const r: Ptr[] = [];
      if (f.lo  === x) r.push(p('lo','#7dd3fc'));
      if (f.pos === x) r.push(p('pos','#c084fc'));
      if (f.hi  === x && f.hi !== f.lo && f.hi !== f.pos) r.push(p('hi','#7dd3fc'));
      return r;
    }
    case 'exponential': {
      const r: Ptr[] = [];
      if (f.lo !== undefined && f.lo === x) r.push(p('lo','#7dd3fc'));
      if (f.mid !== undefined && f.mid === x) r.push(p('mid','#22d3ee'));
      if (f.hi !== undefined && f.hi === x && f.hi !== f.lo) r.push(p('hi','#7dd3fc'));
      if (f.lo === undefined && f.bound !== undefined) {
        const b = Math.min(f.bound, f.arr.length - 1);
        if (b === x) r.push(p('bnd','#ef9f27'));
      }
      return r;
    }
    case 'ternary': {
      const r: Ptr[] = [];
      if (f.lo   === x) r.push(p('lo','#7dd3fc'));
      if (f.mid1 === x) r.push(p('m₁','#22d3ee'));
      if (f.mid2 === x && f.mid2 !== f.mid1) r.push(p('m₂','#fb923c'));
      if (f.hi   === x && f.hi !== f.lo && f.hi !== f.mid2) r.push(p('hi','#7dd3fc'));
      return r;
    }
    case 'fibonacci': {
      const r: Ptr[] = [];
      if (f.offset !== undefined && f.offset >= 0 && f.offset === x)
        r.push(p('off','#484f58'));
      if (f.probe === x) r.push(p('i','#ef9f27'));
      return r;
    }
  }
}

// ── Algorithm labels ──────────────────────────────────────────────────────────

const ALGO_LABEL: Record<Kind, string> = {
  linear:        'linear search',
  binary:        'binary search',
  jump:          'jump search',
  interpolation: 'interpolation search',
  exponential:   'exponential search',
  ternary:       'ternary search',
  fibonacci:     'fibonacci search',
};

// ── Main component ────────────────────────────────────────────────────────────

interface Props { step: TraceStep | undefined }

export default function SearchViz({ step }: Props) {
  const f = detect(step);
  if (!f) return null;

  return (
    <div>
      <SectionLabel>
        {f.name}
        <span style={{ color:'var(--text-tertiary)', fontWeight:400, marginLeft:6 }}>
          {ALGO_LABEL[f.kind]} · {f.arr.length} items
        </span>
        <span style={{ flex:1 }} />
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:9.5,
          color:'#22d3ee', background:'rgba(34,211,238,0.1)',
          padding:'1px 6px', borderRadius:4,
          border:'1px solid rgba(34,211,238,0.2)',
          textTransform:'none', letterSpacing:0,
        }}>target = {f.target}</span>
      </SectionLabel>

      {/* Array cells */}
      <div style={{ overflowX:'auto', paddingBottom:2 }}>
        <div style={{ display:'flex', gap:4, minWidth:'fit-content' }}>
          {f.arr.map((v, x) => {
            const c   = cellColor(x, f);
            const pts = cellPtrs(x, f);
            const act = pts.length > 0;
            return (
              <div key={x} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:36 }}>
                <div style={{
                  width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center',
                  background:c.bg, border:`1.5px solid ${c.border}`, borderRadius:7,
                  transition:'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: act ? `0 0 9px ${c.border}44` : 'none',
                }}>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:12,
                    fontWeight: act ? 700 : 400,
                    color:c.text, transition:'color 0.22s',
                  }}>{v}</span>
                </div>
                <span style={{ fontSize:9, fontFamily:'var(--font-mono)', color: act ? c.text : 'var(--text-tertiary)', transition:'color 0.22s' }}>{x}</span>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, minHeight:14 }}>
                  {pts.map(({ lbl, color }) => (
                    <span key={lbl} style={{ fontSize:8.5, fontFamily:'var(--font-mono)', fontWeight:700, lineHeight:1.2, color }}>{lbl}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithm-specific status strip */}
      <AlgoStatus f={f} />
    </div>
  );
}

// ── Per-algorithm status strips ───────────────────────────────────────────────

function RangeBar({ n, lo, hi, probe, probeColor, label }:
  { n:number; lo:number; hi:number; probe?:number; probeColor:string; label:string }) {
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:'flex', height:4, borderRadius:3, overflow:'hidden', background:'rgba(255,255,255,0.04)', marginBottom:5 }}>
        {Array.from({ length:n }, (_,x) => (
          <div key={x} style={{
            flex:1,
            background: x === probe ? probeColor : (x>=lo && x<=hi) ? 'rgba(255,255,255,0.12)' : 'transparent',
            transition:'background 0.22s',
          }} />
        ))}
      </div>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:probeColor }}>{label}</span>
    </div>
  );
}

function Pill({ text, color, bg }: { text:string; color:string; bg:string }) {
  return (
    <span style={{
      fontSize:9, fontFamily:'var(--font-mono)', fontWeight:600,
      padding:'1px 7px', borderRadius:3, background:bg, color,
      border:`1px solid ${color}44`, flexShrink:0,
    }}>{text}</span>
  );
}

function AlgoStatus({ f }: { f: SF }) {
  const { kind, arr, target } = f;
  const hit = (i?: number) => i !== undefined && arr[i] === target;
  const n = arr.length;

  if (kind === 'binary') {
    const lo = f.lo ?? 0, hi = f.hi ?? n-1;
    const found = hit(f.mid);
    const color = found ? '#2dd4a8' : '#22d3ee';
    const label = found
      ? `arr[${f.mid}] = ${arr[f.mid!]} — found!`
      : f.mid !== undefined
        ? `arr[${f.mid}] = ${arr[f.mid]} ${arr[f.mid]<target?'<':'>'} ${target} → narrow range`
        : `searching [${lo}..${hi}]`;
    return <RangeBar n={n} lo={lo} hi={hi} probe={f.mid} probeColor={color} label={label} />;
  }

  if (kind === 'interpolation') {
    const lo = f.lo ?? 0, hi = f.hi ?? n-1;
    const found = hit(f.pos);
    const color = found ? '#2dd4a8' : '#c084fc';
    const formula = f.pos !== undefined
      ? `pos = ${lo} + (${target}−${arr[lo]}) × (${hi}−${lo}) / (${arr[hi]}−${arr[lo]}) = ${f.pos}`
      : `pos = lo + (target−arr[lo]) × (hi−lo) / (arr[hi]−arr[lo])`;
    const statusLine = found
      ? `arr[${f.pos}] = ${arr[f.pos!]} — found!`
      : f.pos !== undefined
        ? `arr[${f.pos}] = ${arr[f.pos]} ${arr[f.pos]<target?'< target → search right':'> target → search left'}`
        : null;
    return (
      <div style={{ marginTop:8 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-tertiary)', marginBottom:3 }}>interpolation formula</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color, wordBreak:'break-all' }}>{formula}</div>
        {statusLine && <div style={{ marginTop:4, fontFamily:'var(--font-mono)', fontSize:9.5, color }}>{statusLine}</div>}
      </div>
    );
  }

  if (kind === 'jump') {
    const prev = f.prev ?? 0;
    const end  = f.step !== undefined ? Math.min(f.step, n) - 1 : n-1;
    const phase = f.check !== undefined ? 'jump' : 'linear';
    const chk   = f.check !== undefined ? f.check : prev;
    const found = hit(chk);
    const color = found ? '#2dd4a8' : (phase === 'jump' ? '#a78bfa' : '#ef9f27');
    const label = found
      ? `arr[${chk}] = ${arr[chk]} — found!`
      : phase === 'jump'
        ? `arr[${chk}] = ${arr[chk]} < ${target} → jump fwd  block [${prev}..${end}]`
        : `arr[${chk}] = ${arr[chk]} < ${target} → scan fwd  block [${prev}..${end}]`;
    return (
      <div style={{ marginTop:8 }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:5 }}>
          <Pill
            text={phase === 'jump' ? '⤳ jumping' : '← scanning'}
            color={phase === 'jump' ? '#a78bfa' : '#ef9f27'}
            bg={phase === 'jump' ? 'rgba(167,139,250,0.1)' : 'rgba(239,159,39,0.1)'}
          />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color }}>{label}</span>
        </div>
        <div style={{ display:'flex', height:4, borderRadius:3, overflow:'hidden', background:'rgba(255,255,255,0.04)' }}>
          {Array.from({ length:n }, (_,x) => (
            <div key={x} style={{
              flex:1,
              background: x===chk ? color : (x>=prev && x<=end) ? 'rgba(167,139,250,0.2)' : 'transparent',
              transition:'background 0.22s',
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'exponential') {
    const isP2 = f.lo !== undefined && f.hi !== undefined;
    if (isP2) {
      const lo = f.lo!, hi = f.hi!;
      const found = hit(f.mid);
      const color = found ? '#2dd4a8' : '#22d3ee';
      const label = found
        ? `arr[${f.mid}] = ${arr[f.mid!]} — found!`
        : f.mid !== undefined
          ? `arr[${f.mid}] = ${arr[f.mid]} ${arr[f.mid]<target?'<':'>'} ${target}`
          : `binary search [${lo}..${hi}]`;
      return (
        <div style={{ marginTop:8 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:5 }}>
            <Pill text="⬡ binary phase" color="#22d3ee" bg="rgba(34,211,238,0.08)" />
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color }}>{label}</span>
          </div>
          <RangeBar n={n} lo={lo} hi={hi} probe={f.mid} probeColor={color} label="" />
        </div>
      );
    }
    const b = f.bound !== undefined ? Math.min(f.bound, n-1) : 0;
    const found = hit(b);
    const color = found ? '#2dd4a8' : '#ef9f27';
    return (
      <div style={{ marginTop:8 }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:5 }}>
          <Pill text="↑↑ doubling" color="#ef9f27" bg="rgba(239,159,39,0.08)" />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color }}>
            {found ? `arr[${b}] = ${arr[b]} — found!` : `bound=${f.bound} → arr[${b}]=${arr[b]} ${arr[b]<=target?'≤':'>'} ${target}`}
          </span>
        </div>
        <div style={{ display:'flex', height:4, borderRadius:3, overflow:'hidden', background:'rgba(255,255,255,0.04)' }}>
          {Array.from({ length:n }, (_,x) => (
            <div key={x} style={{
              flex:1,
              background: x===b ? color : x<b ? 'rgba(239,159,39,0.18)' : 'transparent',
              transition:'background 0.22s',
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'ternary') {
    const lo = f.lo ?? 0, hi = f.hi ?? n-1;
    const f1 = hit(f.mid1), f2 = hit(f.mid2);
    const color = (f1 || f2) ? '#2dd4a8' : 'var(--text-tertiary)';
    const label = f1
      ? `arr[${f.mid1}] = ${arr[f.mid1!]} — found at m₁!`
      : f2
        ? `arr[${f.mid2}] = ${arr[f.mid2!]} — found at m₂!`
        : (f.mid1 !== undefined && f.mid2 !== undefined)
          ? `arr[${f.mid1}]=${arr[f.mid1]}  arr[${f.mid2}]=${arr[f.mid2]}  range [${lo}..${hi}]`
          : `range [${lo}..${hi}]`;
    return (
      <div style={{ marginTop:8 }}>
        <div style={{ display:'flex', height:4, borderRadius:3, overflow:'hidden', background:'rgba(255,255,255,0.04)', marginBottom:5 }}>
          {Array.from({ length:n }, (_,x) => (
            <div key={x} style={{
              flex:1,
              background: x===f.mid1 ? (f1?'#2dd4a8':'#22d3ee')
                        : x===f.mid2 ? (f2?'#2dd4a8':'#fb923c')
                        : (x>=lo && x<=hi) ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition:'background 0.22s',
            }} />
          ))}
        </div>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color }}>{label}</span>
      </div>
    );
  }

  if (kind === 'fibonacci') {
    const { fib_m, fib_m1, fib_m2, offset=-1, probe } = f;
    const found = hit(probe);
    const color = found ? '#2dd4a8' : '#ef9f27';
    return (
      <div style={{ marginTop:8 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:3, flexWrap:'wrap' }}>
          {[['fibM',fib_m],['fibM1',fib_m1],['fibM2',fib_m2],['offset',offset]].map(([lbl,val]) =>
            val !== undefined && (
              <span key={String(lbl)} style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-tertiary)' }}>
                {lbl}=<span style={{ color:'var(--text-secondary)' }}>{String(val)}</span>
              </span>
            )
          )}
        </div>
        {probe !== undefined && (
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color }}>
            {found
              ? `arr[${probe}] = ${arr[probe]} — found!`
              : `i=${probe}  arr[${probe}]=${arr[probe]} ${arr[probe]<target?'< target → shift offset right':'> target → shrink range'}`}
          </div>
        )}
      </div>
    );
  }

  return null;
}
