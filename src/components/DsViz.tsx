import React from 'react';
import type { TraceStep, StackFrame } from '../types/trace';
import { SectionLabel } from './ArrayViz';

// ── Types ──

export type DsKind = 'linked_list' | 'stack' | 'queue';

interface LinkedListNode {
  id: string;
  val: string;
  nextId: string | null;
  labels: string[]; // local variables pointing to this node
}

interface StackQueueData {
  kind: 'stack' | 'queue';
  name: string;
  elements: any[];
  labels: Record<number, string[]>; // index -> labels (e.g. FRONT, REAR, TOP)
}

// ── Detection Helpers ──

// Traverses local variables to collect all custom user-defined objects (e.g., class instances)
function collectObjects(val: any, visited = new Set<string>(), objects: Map<string, any> = new Map()): Map<string, any> {
  if (!val || typeof val !== 'object') return objects;
  
  if (val.__id__ && val.__class__) {
    const id = val.__id__;
    if (visited.has(id)) return objects;
    visited.add(id);
    objects.set(id, val);
  }

  if (Array.isArray(val)) {
    for (const item of val) {
      collectObjects(item, visited, objects);
    }
  } else {
    for (const k of Object.keys(val)) {
      if (k !== '__id__' && k !== '__class__') {
        collectObjects(val[k], visited, objects);
      }
    }
  }

  return objects;
}

// Attempts to extract the linked list nodes from serialized custom objects
function detectLinkedList(frame: StackFrame): LinkedListNode[] | null {
  const locals = frame.locals;
  
  // 1. Collect all custom objects referenced in locals
  const allObjects = new Map<string, any>();
  const visited = new Set<string>();
  for (const v of Object.values(locals)) {
    collectObjects(v, visited, allObjects);
  }

  if (allObjects.size === 0) return null;

  // 2. Identify actual list Nodes vs container/helper objects
  // A Node is an object that has a key like next/nxt/next_node, or its class name contains 'Node'
  const isNode = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    if (obj.__class__ && /Node/i.test(obj.__class__)) return true;
    return ('next' in obj) || ('nxt' in obj) || ('next_node' in obj);
  };

  const nodeObjects = new Map<string, any>();
  const containers = new Map<string, any>();

  for (const [id, obj] of allObjects.entries()) {
    if (isNode(obj)) {
      nodeObjects.set(id, obj);
    } else {
      containers.set(id, obj);
    }
  }

  if (nodeObjects.size === 0) return null;

  // Helper to extract next ID from a node
  const getNextId = (node: any): string | null => {
    const nxt = node.next !== undefined ? node.next : (node.next_node !== undefined ? node.next_node : node.nxt);
    if (!nxt) return null;
    if (typeof nxt === 'string') return nxt === 'NULL' ? null : nxt;
    if (typeof nxt === 'object' && nxt.__id__) return nxt.__id__;
    return null;
  };

  // 3. Locate pointers (variable/property path -> node id)
  const ptrs = new Map<string, string>(); // pathLabel -> nodeId

  for (const [k, v] of Object.entries(locals)) {
    if (!v || typeof v !== 'object') continue;
    
    const valObj = v as any;
    if (valObj.__id__) {
      const id = valObj.__id__;
      if (nodeObjects.has(id)) {
        ptrs.set(k, id);
      } else if (containers.has(id)) {
        // It's a container! Check if it has a head/root/first pointer to a Node
        const headVal = valObj.head !== undefined ? valObj.head : (valObj.root !== undefined ? valObj.root : valObj.first);
        if (headVal) {
          const headId = typeof headVal === 'object' ? headVal.__id__ : (typeof headVal === 'string' && headVal !== 'NULL' ? headVal : null);
          if (headId && nodeObjects.has(headId)) {
            ptrs.set(`${k}.head`, headId);
          }
        }
      }
    }
  }

  // 4. Find list heads. A node is a head if it has no incoming next pointers from other Node objects.
  const nodeIds = Array.from(nodeObjects.keys());
  const incoming = new Set<string>();
  for (const node of nodeObjects.values()) {
    const nxtId = getNextId(node);
    if (nxtId && nodeObjects.has(nxtId)) {
      incoming.add(nxtId);
    }
  }

  let heads = nodeIds.filter(id => !incoming.has(id));
  
  // Fallback: if all nodes have incoming (circular list), use pointer references
  if (heads.length === 0) {
    heads = Array.from(new Set(ptrs.values()));
  }

  if (heads.length === 0) return null;

  // 5. Select primary headId. Prefer one pointed to by pointers like 'head', 'll.head', 'root'
  let headId = heads[0];
  for (const hId of heads) {
    const labels = Array.from(ptrs.entries()).filter(([_, id]) => id === hId).map(([lbl]) => lbl);
    if (labels.some(l => l.includes('head') || l.includes('root') || l.includes('list'))) {
      headId = hId;
      break;
    }
  }

  // Helper to extract value from a node
  const getValStr = (node: any): string => {
    const val = node.val !== undefined ? node.val : (node.data !== undefined ? node.data : node.value);
    if (val === undefined || val === null) return '?';
    if (typeof val === 'object' && val.__class__) return val.__class__;
    return String(val);
  };

  // 6. Build chain of nodes
  const listNodes: LinkedListNode[] = [];
  const listVisited = new Set<string>();
  let currId: string | null = headId;

  while (currId && nodeObjects.has(currId) && !listVisited.has(currId)) {
    listVisited.add(currId);
    const rawNode = nodeObjects.get(currId);
    const nextId = getNextId(rawNode);

    // Collect all pointer labels pointing to this node
    const labels = Array.from(ptrs.entries())
      .filter(([_, id]) => id === currId)
      .map(([lbl]) => lbl);

    listNodes.push({
      id: currId,
      val: getValStr(rawNode),
      nextId,
      labels,
    });

    currId = nextId;
  }

  return listNodes.length > 0 ? listNodes : null;
}

// Attempts to detect a stack or queue structure from local lists
function detectStackQueue(frame: StackFrame): StackQueueData | null {
  const locals = frame.locals;
  const funcName = frame.func.toLowerCase();

  for (const [k, v] of Object.entries(locals)) {
    if (!Array.isArray(v)) continue;

    const nameLower = k.toLowerCase();
    const isStackName = nameLower.includes('stack') || nameLower === 'st' || nameLower === 's';
    const isQueueName = nameLower.includes('queue') || nameLower === 'q' || nameLower === 'dq' || nameLower === 'deque';
    const isStackFunc = funcName.includes('stack') || funcName.includes('push') || funcName.includes('pop') || funcName.includes('bracket');
    const isQueueFunc = funcName.includes('queue') || funcName.includes('bfs') || funcName.includes('enqueue') || funcName.includes('dequeue');

    // Prioritize name matches
    if (isStackName || (!isQueueName && isStackFunc)) {
      const labels: Record<number, string[]> = {};
      if (v.length > 0) {
        labels[v.length - 1] = ['top'];
      }
      return { kind: 'stack', name: k, elements: v, labels };
    }

    if (isQueueName || isQueueFunc) {
      const labels: Record<number, string[]> = {};
      if (v.length > 0) {
        labels[0] = ['front'];
        if (v.length > 1) {
          labels[v.length - 1] = ['rear'];
        } else {
          labels[0].push('rear');
        }
      }
      return { kind: 'queue', name: k, elements: v, labels };
    }
  }

  return null;
}

export function detectDs(step: TraceStep | undefined): { kind: DsKind; data: any } | null {
  if (!step || step.stack.length === 0) return null;
  const topFrame = step.stack[step.stack.length - 1];

  // 1. Check for Python linked list
  const listNodes = detectLinkedList(topFrame);
  if (listNodes) {
    return { kind: 'linked_list', data: listNodes };
  }

  // 2. Check for C++ linked list (heap visualization)
  if (step.heap && step.heap.length > 0) {
    const globals = step.stack.find((f) => f.globals)?.globals ?? {};
    const headPtr = typeof globals.head === 'string' ? globals.head : undefined;
    
    const nodes: LinkedListNode[] = [];
    const idToNode = new Map(step.heap.map(n => [n.id, n]));
    
    let currId: string | null = headPtr && headPtr !== 'NULL' ? headPtr : null;
    const visited = new Set<string>();

    while (currId && idToNode.has(currId) && !visited.has(currId)) {
      visited.add(currId);
      const raw = idToNode.get(currId)!;
      const valField = raw.fields.find(f => !f.isPtr);
      const ptrField = raw.fields.find(f => f.isPtr);
      
      const val = valField ? String(valField.val) : '?';
      const nextId = ptrField?.target || null;

      // Find local variables pointing to this ID
      const labels: string[] = [];
      if (currId === headPtr) labels.push('head');
      
      // Check active frame locals for pointers pointing to this address
      for (const [k, v] of Object.entries(topFrame.locals)) {
        if (v === currId && k !== 'head') {
          labels.push(k);
        }
      }

      nodes.push({ id: currId, val, nextId, labels });
      currId = nextId;
    }

    if (nodes.length > 0) {
      return { kind: 'linked_list', data: nodes };
    }
  }

  // 3. Check for Stack/Queue list
  const sq = detectStackQueue(topFrame);
  if (sq) {
    return { kind: sq.kind, data: sq };
  }

  return null;
}

// ── Render Component ──

interface Props {
  step: TraceStep | undefined;
}

export default function DsViz({ step }: Props) {
  const detected = detectDs(step);
  if (!detected) return null;

  const { kind, data } = detected;

  return (
    <div style={{ marginTop: 4 }}>
      {kind === 'linked_list' && <LinkedListVisual nodes={data as LinkedListNode[]} />}
      {kind === 'stack' && <StackVisual data={data as StackQueueData} />}
      {kind === 'queue' && <QueueVisual data={data as StackQueueData} />}
    </div>
  );
}

// ── Sub-components for Visualizing ──

function LinkedListVisual({ nodes }: { nodes: LinkedListNode[] }) {
  const nodeCount = nodes.length;

  // Determine if a label is a "head-like" pointer
  const isHeadLabel = (lbl: string) =>
    /head|root|list|first|start/i.test(lbl);

  return (
    <div>
      <SectionLabel>
        linked list
        <span style={{ color: 'var(--t3)', fontWeight: 400, marginLeft: 6 }}>
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
        </span>
      </SectionLabel>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        overflowX: 'auto', padding: '36px 12px 32px',
        scrollBehavior: 'smooth',
      }}>
        {/* HEAD indicator arrow before first node */}
        {nodeCount > 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginRight: 6, flexShrink: 0,
          }}>
            <span style={{
              fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700,
              color: '#34d399', letterSpacing: '0.06em', marginBottom: 4,
            }}>HEAD</span>
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
              <path d="M2 6 H18 M14 2 L20 6 L14 10" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {nodes.map((node, idx) => {
          const hasPointers = node.labels.length > 0;
          const isFirst = idx === 0;
          const isLast = idx === nodeCount - 1;

          // Node accent color based on pointer labels
          const nodeAccent = hasPointers
            ? (node.labels.some(isHeadLabel) ? '#2dd4a8' : '#38bdf8')
            : 'var(--line)';

          return (
            <React.Fragment key={node.id}>
              {/* Node layout */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative', flexShrink: 0,
              }}>
                {/* Pointer variable labels above node */}
                <div style={{
                  position: 'absolute', top: -30,
                  display: 'flex', gap: 5, height: 24,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {node.labels.map(lbl => {
                    const isHead = isHeadLabel(lbl);
                    const pillColor = isHead ? '#2dd4a8' : '#38bdf8';
                    const pillBg = isHead ? 'rgba(29,158,117,0.12)' : 'rgba(56,189,248,0.12)';
                    const pillBorder = isHead ? 'rgba(29,158,117,0.4)' : 'rgba(56,189,248,0.4)';
                    return (
                      <div key={lbl} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}>
                        <span style={{
                          fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 800,
                          background: pillBg, color: pillColor,
                          border: `1.5px solid ${pillBorder}`,
                          padding: '2px 10px', borderRadius: 6,
                          boxShadow: `0 2px 10px rgba(0,0,0,0.25), 0 0 8px ${pillColor}15`,
                          letterSpacing: '0.02em',
                        }}>{lbl}</span>
                        {/* Arrow from label down to node */}
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none" style={{ marginTop: -1 }}>
                          <path d="M4 0 L4 6" stroke={pillColor} strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    );
                  })}
                </div>

                {/* Node Box — larger and more prominent */}
                <div style={{
                  display: 'flex', height: 60, minWidth: 140,
                  background: hasPointers
                    ? `linear-gradient(135deg, var(--surf), rgba(${nodeAccent === '#2dd4a8' ? '29,158,117' : '56,189,248'},0.04))`
                    : 'var(--surf)',
                  border: `2.5px solid ${hasPointers ? nodeAccent : 'var(--line)'}`,
                  borderRadius: 10, overflow: 'hidden',
                  boxShadow: hasPointers
                    ? `0 0 20px ${nodeAccent}20, 0 4px 16px rgba(0,0,0,0.3)`
                    : '0 4px 12px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                  {/* Left: Data field */}
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0 16px', position: 'relative',
                    borderRight: '2px solid var(--line)',
                  }}>
                    <span style={{
                      fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 600,
                      color: 'var(--t3)', letterSpacing: '0.06em',
                      position: 'absolute', top: 4, left: 8,
                    }}>DATA</span>
                    <span style={{
                      fontSize: 20, fontFamily: 'var(--mono)',
                      fontWeight: 800, color: 'var(--t1)',
                      letterSpacing: '-0.01em',
                    }}>
                      {node.val}
                    </span>
                  </div>

                  {/* Right: Pointer field */}
                  <div style={{
                    width: 44, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.02)', position: 'relative',
                  }}>
                    <span style={{
                      fontSize: 7, fontFamily: 'var(--mono)', fontWeight: 600,
                      color: 'var(--t3)', letterSpacing: '0.06em',
                      position: 'absolute', top: 4,
                    }}>NEXT</span>
                    {/* Pointer dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: node.nextId
                        ? 'radial-gradient(circle, #22d3ee, #0ea5e9)'
                        : '#484f58',
                      boxShadow: node.nextId
                        ? '0 0 8px rgba(34,211,238,0.4)'
                        : 'none',
                      transition: 'all 0.3s ease',
                    }} />
                  </div>
                </div>

                {/* Address label below node — pill style */}
                <div style={{
                  marginTop: 8, padding: '2px 10px', borderRadius: 5,
                  background: 'rgba(88,166,255,0.06)',
                  border: '1px solid rgba(88,166,255,0.15)',
                }}>
                  <span style={{
                    fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
                    color: '#58a6ff',
                    textShadow: '0 0 2px rgba(88,166,255,0.15)',
                    letterSpacing: '0.02em',
                  }}>{node.id}</span>
                </div>
              </div>

              {/* Arrow Connector — wider, more prominent */}
              <div style={{
                display: 'flex', alignItems: 'center',
                width: 56, justifyContent: 'center',
                flexShrink: 0, marginTop: -20,
              }}>
                {node.nextId ? (
                  <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
                    {/* Arrow line */}
                    <line x1="2" y1="10" x2="38" y2="10" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Arrowhead */}
                    <path d="M34 4 L42 10 L34 16" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    {/* Glow circle at start */}
                    <circle cx="4" cy="10" r="2.5" fill="#22d3ee" opacity="0.4" />
                  </svg>
                ) : (
                  <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
                    {/* Dashed line to null */}
                    <line x1="2" y1="10" x2="32" y2="10" stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeDasharray="4,4" />
                    {/* Ground / null symbol */}
                    <line x1="36" y1="4" x2="36" y2="16" stroke="#8b949e" strokeWidth="2" strokeLinecap="round" />
                    <line x1="39" y1="6" x2="39" y2="14" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="42" y1="8" x2="42" y2="12" stroke="#8b949e" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </React.Fragment>
          );
        })}

        {/* NULL terminator box */}
        <div style={{
          display: 'flex', flexDirection: 'column', height: 60, width: 64,
          alignItems: 'center', justifyContent: 'center',
          border: '2.5px dashed rgba(139,148,158,0.3)', borderRadius: 10,
          color: '#8b949e', fontSize: 12, fontWeight: 800,
          fontFamily: 'var(--mono)', flexShrink: 0, marginTop: -20,
          background: 'rgba(139,148,158,0.03)',
          letterSpacing: '0.06em',
          gap: 4,
        }}>
          {/* Null symbol */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="#8b949e" strokeWidth="1.5" opacity="0.5" />
            <line x1="4" y1="14" x2="14" y2="4" stroke="#8b949e" strokeWidth="1.5" opacity="0.5" />
          </svg>
          <span style={{ fontSize: 10 }}>NULL</span>
        </div>
      </div>

      {/* Node count info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px 4px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {/* Chain icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4" cy="7" r="2.5" stroke="#22d3ee" strokeWidth="1.2" />
            <circle cx="10" cy="7" r="2.5" stroke="#22d3ee" strokeWidth="1.2" />
            <line x1="6.5" y1="7" x2="7.5" y2="7" stroke="#22d3ee" strokeWidth="1.2" />
          </svg>
          <span style={{
            fontSize: 10, fontFamily: 'var(--mono)',
            color: 'var(--t3)',
          }}>
            {nodeCount} node{nodeCount !== 1 ? 's' : ''} linked
          </span>
        </div>

        <div style={{ flex: 1, height: 1, background: 'var(--line)', opacity: 0.4 }} />

        <span style={{
          fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)',
        }}>
          {nodes[0]?.id ?? '—'} → … → NULL
        </span>
      </div>
    </div>
  );
}

function StackVisual({ data }: { data: StackQueueData }) {
  const total = data.elements.length;
  const MAX_DISPLAY = 12;

  return (
    <div>
      <SectionLabel>
        {data.name}
        <span style={{ color: 'var(--t3)', fontWeight: 400, marginLeft: 6 }}>
          stack · {total} element{total !== 1 ? 's' : ''}
        </span>
      </SectionLabel>

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 24,
        padding: '24px 16px 16px',
      }}>
        {/* ── Push/Pop direction indicator ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          width: 44, flexShrink: 0,
        }}>
          {/* PUSH arrow (down into stack) */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{
              fontSize: 8.5, fontFamily: 'var(--mono)', fontWeight: 700,
              color: '#34d399', letterSpacing: '0.05em',
            }}>PUSH</span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
              <path d="M8 0 L8 18 M3 14 L8 20 L13 14" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Divider */}
          <div style={{
            width: 1, height: 12, background: 'var(--line)',
          }} />

          {/* POP arrow (up out of stack) */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
              <path d="M8 24 L8 6 M3 10 L8 4 L13 10" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{
              fontSize: 8.5, fontFamily: 'var(--mono)', fontWeight: 700,
              color: '#f97316', letterSpacing: '0.05em',
            }}>POP</span>
          </div>
        </div>

        {/* ── Stack bucket ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Stack opening bracket top */}
          <div style={{
            width: 200, height: 4,
            borderLeft: '3px solid var(--violet)',
            borderRight: '3px solid var(--violet)',
            opacity: 0.4,
          }} />

          {/* Stack body */}
          <div style={{
            display: 'flex', flexDirection: 'column-reverse', gap: 4,
            width: 200, minHeight: 220,
            padding: '6px 6px 10px',
            borderLeft: '3px solid var(--violet)',
            borderRight: '3px solid var(--violet)',
            borderBottom: '3px solid var(--violet)',
            borderRadius: '0 0 14px 14px',
            background: 'linear-gradient(180deg, rgba(168,85,247,0.01) 0%, rgba(168,85,247,0.05) 100%)',
            boxShadow: '0 12px 40px rgba(168,85,247,0.06), inset 0 -20px 40px rgba(168,85,247,0.02)',
            position: 'relative',
          }}>
            {data.elements.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                {/* Empty stack icon */}
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity="0.3">
                  <rect x="6" y="20" width="20" height="4" rx="1" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" />
                  <rect x="6" y="14" width="20" height="4" rx="1" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
                  <rect x="6" y="8" width="20" height="4" rx="1" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.25" />
                </svg>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: 'var(--t3)', fontStyle: 'italic',
                }}>
                  empty
                </span>
              </div>
            ) : (
              data.elements.slice(0, MAX_DISPLAY).map((el, idx) => {
                const isTop = idx === total - 1;
                const depth = total - 1 - idx;
                const fillOpacity = Math.max(0.03, 0.14 - depth * 0.015);

                return (
                  <div key={idx} style={{
                    height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isTop
                      ? `linear-gradient(135deg, rgba(168,85,247,${fillOpacity + 0.08}), rgba(139,92,246,${fillOpacity + 0.04}))`
                      : `rgba(168,85,247,${fillOpacity})`,
                    border: `1.5px solid ${isTop ? '#a855f7' : 'rgba(168,85,247,0.2)'}`,
                    borderRadius: 8, position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isTop
                      ? '0 0 16px rgba(168,85,247,0.15), 0 0 4px rgba(168,85,247,0.1)'
                      : 'none',
                  }}>
                    {/* Index badge */}
                    <span style={{
                      position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 9, fontFamily: 'var(--mono)',
                      color: isTop ? 'rgba(192,132,252,0.7)' : 'var(--t3)',
                      fontWeight: 500,
                    }}>
                      {idx}
                    </span>

                    {/* Value */}
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 14,
                      fontWeight: isTop ? 700 : 500,
                      color: isTop ? '#f0e6ff' : 'var(--t1)',
                      letterSpacing: isTop ? '0.01em' : undefined,
                    }}>
                      {typeof el === 'object' ? JSON.stringify(el) : String(el)}
                    </span>

                    {/* TOP pointer arrow */}
                    {isTop && (
                      <div style={{
                        position: 'absolute', right: -72,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                          <path d="M0 5 H12 M8 1 L13 5 L8 9" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 800,
                          color: '#c084fc',
                          background: 'rgba(168,85,247,0.12)',
                          border: '1.5px solid rgba(168,85,247,0.3)',
                          padding: '2px 8px', borderRadius: 5,
                          boxShadow: '0 0 10px rgba(168,85,247,0.08)',
                          letterSpacing: '0.04em',
                        }}>TOP</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {total > MAX_DISPLAY && (
              <div style={{
                textAlign: 'center', fontSize: 10, color: 'var(--t3)',
                fontFamily: 'var(--mono)', padding: '2px 0',
              }}>
                +{total - MAX_DISPLAY} more…
              </div>
            )}
          </div>

          {/* Capacity bar */}
          <div style={{
            width: 200, marginTop: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              flex: 1, height: 4, borderRadius: 2,
              background: 'rgba(168,85,247,0.1)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${Math.min(100, (total / MAX_DISPLAY) * 100)}%`,
                background: total > MAX_DISPLAY * 0.8
                  ? 'linear-gradient(90deg, #a855f7, #f43f5e)'
                  : 'linear-gradient(90deg, #a855f7, #c084fc)',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{
              fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)',
              flexShrink: 0,
            }}>
              {total}/{MAX_DISPLAY}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueVisual({ data }: { data: StackQueueData }) {
  const total = data.elements.length;

  return (
    <div>
      <SectionLabel>
        {data.name}
        <span style={{ color: 'var(--t3)', fontWeight: 400, marginLeft: 6 }}>
          queue · {total} element{total !== 1 ? 's' : ''}
        </span>
      </SectionLabel>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 8px 20px',
      }}>
        {/* Flow direction banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 14, width: '100%', maxWidth: 520,
          justifyContent: 'space-between',
        }}>
          {/* Dequeue / OUT label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <path d="M16 6 H4 M8 2 L3 6 L8 10" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
              color: '#22d3ee', letterSpacing: '0.06em',
            }}>DEQUEUE</span>
          </div>

          {/* Flow dots */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, flex: 1,
            justifyContent: 'center',
          }}>
            {[0.2, 0.35, 0.5, 0.65, 0.5, 0.35, 0.2].map((o, i) => (
              <div key={i} style={{
                width: 3, height: 3, borderRadius: '50%',
                background: `rgba(34,211,238,${o})`,
              }} />
            ))}
          </div>

          {/* Enqueue / IN label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
              color: '#a855f7', letterSpacing: '0.06em',
            }}>ENQUEUE</span>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <path d="M2 6 H14 M10 2 L15 6 L10 10" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Queue pipe container */}
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: 520,
        }}>
          {/* Left gate (OUT) */}
          <div style={{
            position: 'absolute', left: -6, top: 0, bottom: 0,
            width: 6, zIndex: 2,
            background: 'linear-gradient(180deg, #22d3ee, rgba(34,211,238,0.3))',
            borderRadius: '4px 0 0 4px',
            boxShadow: '0 0 12px rgba(34,211,238,0.15)',
          }} />

          {/* Right gate (IN) */}
          <div style={{
            position: 'absolute', right: -6, top: 0, bottom: 0,
            width: 6, zIndex: 2,
            background: 'linear-gradient(180deg, #a855f7, rgba(168,85,247,0.3))',
            borderRadius: '0 4px 4px 0',
            boxShadow: '0 0 12px rgba(168,85,247,0.15)',
          }} />

          {/* Queue body */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            width: '100%', minHeight: 76,
            padding: '10px 18px',
            borderTop: '2.5px solid rgba(34,211,238,0.4)',
            borderBottom: '2.5px solid rgba(34,211,238,0.4)',
            background: 'linear-gradient(90deg, rgba(34,211,238,0.04), rgba(168,85,247,0.02) 50%, rgba(168,85,247,0.04))',
            position: 'relative',
            overflowX: 'auto',
          }}>
            {/* Conveyor track lines */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '50%',
              height: 1, opacity: 0.06,
              background: 'repeating-linear-gradient(90deg, #22d3ee 0px, #22d3ee 8px, transparent 8px, transparent 16px)',
            }} />

            {data.elements.length === 0 ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 0',
              }}>
                <svg width="36" height="20" viewBox="0 0 36 20" fill="none" opacity="0.3">
                  <rect x="2" y="4" width="12" height="12" rx="2" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path d="M17 10 H22 M20 7 L23 10 L20 13" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                  <rect x="22" y="4" width="12" height="12" rx="2" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
                </svg>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: 'var(--t3)', fontStyle: 'italic',
                }}>
                  empty
                </span>
              </div>
            ) : (
              data.elements.map((el, idx) => {
                const isFront = idx === 0;
                const isRear = idx === total - 1;
                const isSpecial = isFront || isRear;

                const borderCol = isFront ? '#22d3ee' : (isRear ? '#a855f7' : 'rgba(255,255,255,0.1)');
                const bgCol = isFront
                  ? 'linear-gradient(135deg, rgba(34,211,238,0.14), rgba(34,211,238,0.06))'
                  : isRear
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(168,85,247,0.06))'
                    : 'rgba(255,255,255,0.03)';

                return (
                  <React.Fragment key={idx}>
                    {/* Element cell */}
                    <div style={{
                      height: 48, minWidth: 72, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: bgCol,
                      border: `2px solid ${borderCol}`,
                      borderRadius: 8, position: 'relative', flexShrink: 0,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSpecial ? `0 0 14px ${isFront ? 'rgba(34,211,238,0.12)' : 'rgba(168,85,247,0.12)'}` : 'none',
                      padding: '0 10px',
                      zIndex: 1,
                    }}>
                      {/* Value */}
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 14,
                        fontWeight: isSpecial ? 700 : 500,
                        color: isFront ? '#a5f3fc' : isRear ? '#e9d5ff' : 'var(--t1)',
                      }}>
                        {typeof el === 'object' ? JSON.stringify(el) : String(el)}
                      </span>

                      {/* Index */}
                      <span style={{
                        position: 'absolute', top: 3, left: 5,
                        fontSize: 8, fontFamily: 'var(--mono)',
                        color: isFront ? 'rgba(34,211,238,0.4)' : isRear ? 'rgba(168,85,247,0.4)' : 'var(--t3)',
                      }}>
                        {idx}
                      </span>

                      {/* FRONT / REAR label below */}
                      {isSpecial && (
                        <div style={{
                          position: 'absolute', bottom: -22,
                          display: 'flex', gap: 3,
                        }}>
                          {isFront && (
                            <span style={{
                              fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 800,
                              color: '#22d3ee', background: 'rgba(34,211,238,0.1)',
                              padding: '1px 7px', borderRadius: 4,
                              border: '1.5px solid rgba(34,211,238,0.25)',
                              letterSpacing: '0.04em',
                            }}>FRONT</span>
                          )}
                          {isRear && (
                            <span style={{
                              fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 800,
                              color: '#c084fc', background: 'rgba(168,85,247,0.1)',
                              padding: '1px 7px', borderRadius: 4,
                              border: '1.5px solid rgba(168,85,247,0.25)',
                              letterSpacing: '0.04em',
                            }}>REAR</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Flow chevron between elements */}
                    {idx < total - 1 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, flexShrink: 0,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 2 L8 6 L3 10" stroke="rgba(34,211,238,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* Element count bar */}
        <div style={{
          width: '100%', maxWidth: 520, marginTop: 28,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            fontSize: 9, fontFamily: 'var(--mono)', color: '#22d3ee', flexShrink: 0,
          }}>OUT</span>
          <div style={{
            flex: 1, height: 3, borderRadius: 2,
            background: 'rgba(34,211,238,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: total > 0 ? '100%' : '0%',
              background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
              transition: 'width 0.4s ease',
              opacity: 0.35,
            }} />
          </div>
          <span style={{
            fontSize: 9, fontFamily: 'var(--mono)', color: '#a855f7', flexShrink: 0,
          }}>IN</span>
          <span style={{
            fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)',
            marginLeft: 4, flexShrink: 0,
          }}>
            {total} item{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
