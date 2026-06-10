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
  
  // 1. Collect all Node objects referenced in locals
  const objects = new Map<string, any>();
  const visited = new Set<string>();
  for (const v of Object.values(locals)) {
    collectObjects(v, visited, objects);
  }

  if (objects.size === 0) return null;

  // 2. Locate pointers (local variable name -> node id)
  const ptrs = new Map<string, string>(); // varName -> nodeId
  for (const [k, v] of Object.entries(locals)) {
    if (v && typeof v === 'object' && (v as any).__id__) {
      ptrs.set(k, (v as any).__id__);
    }
  }

  // Helper to extract value from a node
  const getValStr = (node: any): string => {
    const val = node.val !== undefined ? node.val : (node.data !== undefined ? node.data : node.value);
    if (val === undefined || val === null) return '?';
    if (typeof val === 'object' && val.__class__) return val.__class__;
    return String(val);
  };

  // Helper to extract next ID from a node
  const getNextId = (node: any): string | null => {
    const nxt = node.next !== undefined ? node.next : (node.next_node !== undefined ? node.next_node : node.nxt);
    if (!nxt) return null;
    if (typeof nxt === 'string') {
      // Could be a string pointer in C++ style or repr
      return nxt === 'NULL' ? null : nxt;
    }
    if (typeof nxt === 'object' && nxt.__id__) {
      return nxt.__id__;
    }
    return null;
  };

  // 3. Find list heads. A node is a head if it is pointed to by a local variable,
  // or it has no incoming pointer from any other nodes in our collection.
  const allIds = Array.from(objects.keys());
  const incoming = new Set<string>();
  for (const node of objects.values()) {
    const nxtId = getNextId(node);
    if (nxtId) incoming.add(nxtId);
  }

  let heads = allIds.filter(id => !incoming.has(id));
  // Fallback: if there are circular lists or we only have a partial set, use local variables
  if (heads.length === 0) {
    heads = Array.from(new Set(ptrs.values()));
  }

  if (heads.length === 0) return null;

  // 4. Build node chain starting from the primary head (prefer variables named 'head', 'root', etc.)
  let headId = heads[0];
  for (const hId of heads) {
    const varNames = Array.from(ptrs.entries()).filter(([_, id]) => id === hId).map(([name]) => name);
    if (varNames.includes('head') || varNames.includes('root') || varNames.includes('list')) {
      headId = hId;
      break;
    }
  }

  const listNodes: LinkedListNode[] = [];
  const listVisited = new Set<string>();
  let currId: string | null = headId;

  while (currId && objects.has(currId) && !listVisited.has(currId)) {
    listVisited.add(currId);
    const rawNode = objects.get(currId);
    const nextId = getNextId(rawNode);

    // Get variable pointers pointing to this node
    const labels = Array.from(ptrs.entries())
      .filter(([_, id]) => id === currId)
      .map(([name]) => name);

    listNodes.push({
      id: currId,
      val: getValStr(rawNode),
      nextId,
      labels,
    });

    currId = nextId;
  }

  // If we couldn't construct a chain of at least 1 node, return null
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
  return (
    <div>
      <SectionLabel>linked list state</SectionLabel>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        overflowX: 'auto', padding: '28px 8px 24px',
        scrollBehavior: 'smooth',
      }}>
        {nodes.map((node, idx) => {
          const hasPointers = node.labels.length > 0;
          return (
            <React.Fragment key={node.id}>
              {/* Node layout */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative', flexShrink: 0,
              }}>
                {/* Pointer variables list above node */}
                <div style={{
                  position: 'absolute', top: -26,
                  display: 'flex', gap: 4, height: 20,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {node.labels.map(lbl => (
                    <span key={lbl} style={{
                      fontSize: 10.5, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      background: lbl === 'head' ? 'rgba(29,158,117,0.15)' : 'rgba(56,189,248,0.15)',
                      color: lbl === 'head' ? '#2dd4a8' : '#38bdf8',
                      border: `1.5px solid ${lbl === 'head' ? 'rgba(29,158,117,0.45)' : 'rgba(56,189,248,0.45)'}`,
                      padding: '2px 7px', borderRadius: 5,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}>{lbl}</span>
                  ))}
                </div>

                {/* Node Box */}
                <div style={{
                  display: 'flex', height: 48, minWidth: 100,
                  background: 'var(--bg-surface)',
                  border: `2px solid ${hasPointers ? '#22d3ee' : 'var(--border)'}`,
                  borderRadius: 8, overflow: 'hidden',
                  boxShadow: hasPointers ? '0 0 16px rgba(34,211,238,0.25)' : 'none',
                  transition: 'all 0.25s ease',
                }}>
                  {/* Left part: Val */}
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 12px', fontSize: 16, fontFamily: 'var(--font-mono)',
                    fontWeight: 700, color: 'var(--text-primary)',
                    borderRight: '2px solid var(--border)',
                  }}>
                    {node.val}
                  </div>
                  {/* Right part: Pointer */}
                  <div style={{
                    width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.015)', position: 'relative',
                  }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: node.nextId ? '#22d3ee' : '#484f58',
                    }} />
                  </div>
                </div>

                {/* Address label below node - big and readable */}
                <span style={{
                  fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: '#58a6ff', marginTop: 6,
                  textShadow: '0 0 1px rgba(88,166,255,0.2)',
                }}>{node.id}</span>
              </div>

              {/* Arrow Connector */}
              <div style={{
                display: 'flex', alignItems: 'center',
                width: 40, justifyContent: 'center',
                flexShrink: 0, marginTop: -16,
              }}>
                <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
                  <path
                    d={node.nextId ? "M0 8 H28 M22 3 L29 8 L22 13" : "M0 8 H22 M18 3 L10 13"}
                    stroke={node.nextId ? "#22d3ee" : "#8b949e"}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={node.nextId ? undefined : "3,3"}
                  />
                  {!node.nextId && (
                    <text x="17" y="14" fontSize="7" fontFamily="monospace" fill="#8b949e" fontWeight="bold">X</text>
                  )}
                </svg>
              </div>
            </React.Fragment>
          );
        })}

        {/* Tail marker */}
        <div style={{
          display: 'flex', height: 48, width: 56,
          alignItems: 'center', justifyContent: 'center',
          border: '2px dashed var(--border)', borderRadius: 8,
          color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--font-mono)', flexShrink: 0, marginTop: -16,
          background: 'rgba(255,255,255,0.01)',
        }}>
          NULL
        </div>
      </div>
    </div>
  );
}

function StackVisual({ data }: { data: StackQueueData }) {
  const total = data.elements.length;

  return (
    <div>
      <SectionLabel>
        {data.name}
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
          stack · {total} elements
        </span>
      </SectionLabel>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '20px 0',
      }}>
        {/* Stack vertical bucket */}
        <div style={{
          display: 'flex', flexDirection: 'column-reverse', gap: 6,
          width: 140, minHeight: 180,
          padding: '8px 8px 12px',
          borderLeft: '3px solid var(--accent-violet)',
          borderRight: '3px solid var(--accent-violet)',
          borderBottom: '3px solid var(--accent-violet)',
          borderRadius: '0 0 12px 12px',
          background: 'linear-gradient(180deg, transparent, rgba(168,85,247,0.02))',
          boxShadow: '0 8px 24px rgba(168,85,247,0.02)',
        }}>
          {data.elements.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)',
            }}>
              stack is empty
            </div>
          ) : (
            data.elements.map((el, idx) => {
              const isTop = idx === total - 1;
              return (
                <div key={idx} style={{
                  height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isTop ? 'rgba(168,85,247,0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isTop ? '#a855f7' : 'var(--border)'}`,
                  borderRadius: 6, position: 'relative',
                  transition: 'all 0.25s ease',
                  boxShadow: isTop ? '0 0 10px rgba(168,85,247,0.1)' : 'none',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12.5,
                    fontWeight: isTop ? 600 : 400,
                    color: isTop ? '#e9d5ff' : 'var(--text-primary)',
                  }}>
                    {typeof el === 'object' ? JSON.stringify(el) : String(el)}
                  </span>
                  
                  {isTop && (
                    <span style={{
                      position: 'absolute', right: -56,
                      fontSize: 8.5, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      background: 'rgba(168,85,247,0.15)', color: '#c084fc',
                      border: '1px solid rgba(168,85,247,0.3)',
                      padding: '1px 5px', borderRadius: 4,
                      display: 'flex', alignItems: 'center', gap: 2,
                    }}>
                      ← TOP
                    </span>
                  )}

                  <span style={{
                    position: 'absolute', left: 8,
                    fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
                  }}>
                    [{idx}]
                  </span>
                </div>
              );
            })
          )}
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
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
          queue · {total} elements
        </span>
      </SectionLabel>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '24px 0',
      }}>
        {/* Queue horizontal tube */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', maxWidth: 440, minHeight: 64,
          padding: '8px 16px',
          borderTop: '2.5px solid var(--accent-cyan)',
          borderBottom: '2.5px solid var(--accent-cyan)',
          background: 'linear-gradient(90deg, rgba(34,211,238,0.01), rgba(34,211,238,0.03), rgba(34,211,238,0.01))',
          position: 'relative', overflowX: 'auto',
        }}>
          {/* In / Out Flow indicators */}
          <div style={{
            position: 'absolute', left: 4, top: -18,
            fontSize: 9, fontFamily: 'var(--font-mono)', color: '#22d3ee', fontWeight: 600,
          }}>
            OUT (Front)
          </div>
          <div style={{
            position: 'absolute', right: 4, top: -18,
            fontSize: 9, fontFamily: 'var(--font-mono)', color: '#22d3ee', fontWeight: 600,
          }}>
            IN (Rear)
          </div>

          {data.elements.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)',
            }}>
              queue is empty
            </div>
          ) : (
            data.elements.map((el, idx) => {
              const isFront = idx === 0;
              const isRear = idx === total - 1;
              const isSpecial = isFront || isRear;
              
              const borderCol = isFront ? '#22d3ee' : (isRear ? '#a855f7' : 'var(--border)');
              const bgCol = isFront ? 'rgba(34,211,238,0.1)' : (isRear ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)');

              return (
                <div key={idx} style={{
                  height: 38, width: 68, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: bgCol,
                  border: `1.5px solid ${borderCol}`,
                  borderRadius: 6, position: 'relative', flexShrink: 0,
                  transition: 'all 0.25s ease',
                  boxShadow: isSpecial ? `0 0 8px ${borderCol}22` : 'none',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12.5,
                    fontWeight: isSpecial ? 600 : 400,
                    color: 'var(--text-primary)',
                  }}>
                    {typeof el === 'object' ? JSON.stringify(el) : String(el)}
                  </span>
                  
                  {/* Labels above/below element */}
                  <div style={{
                    position: 'absolute', bottom: -18,
                    display: 'flex', gap: 3,
                  }}>
                    {isFront && (
                      <span style={{
                        fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: '#22d3ee', background: 'rgba(34,211,238,0.12)',
                        padding: '0 4px', borderRadius: 3, border: '1px solid rgba(34,211,238,0.2)',
                      }}>FRONT</span>
                    )}
                    {isRear && (
                      <span style={{
                        fontSize: 8, fontFamily: 'var(--font-mono)', fontWeight: 700,
                        color: '#c084fc', background: 'rgba(168,85,247,0.12)',
                        padding: '0 4px', borderRadius: 3, border: '1px solid rgba(168,85,247,0.2)',
                      }}>REAR</span>
                    )}
                  </div>

                  <span style={{
                    position: 'absolute', top: 2, left: 4,
                    fontSize: 7.5, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
                  }}>
                    {idx}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
