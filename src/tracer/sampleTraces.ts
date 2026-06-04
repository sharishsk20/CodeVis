/**
 * sampleTraces.ts
 *
 * Pre-built demo traces.  Shown on first load so the app is immediately
 * interactive — no Pyodide download required.
 *
 * Schema matches TraceStep exactly.  The C++ trace is always hardcoded
 * (no live C++ execution yet); the Python trace can be replaced at runtime
 * by running real code through pythonTracer.ts.
 */

import type { SampleTrace, HeapNode, TraceStep } from '../types/trace';

// ─── Python — Bubble Sort ────────────────────────────────────────────────────

const PY_CODE = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

arr = [5, 3, 8, 1]
result = bubble_sort(arr)
print(result)`;

const m = (v: any) => ({ f: '<module>', v });
const bs = (v: any) => ({ f: 'bubble_sort', v });

export const PYTHON_SAMPLE: SampleTrace = {
  code: PY_CODE,
  steps: [
    { step:0,  line:9,  event:'step',   stack:[{ func:'<module>', locals:{} }],                                                                         stdout:'', note:'Program starts' },
    { step:1,  line:9,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[5,3,8,1] } }],                                                          stdout:'', note:'arr = [5, 3, 8, 1]' },
    { step:2,  line:10, event:'call',   stack:[{ func:'<module>', locals:{ arr:[5,3,8,1] } }, { func:'bubble_sort', locals:{ arr:[5,3,8,1] } }],         stdout:'', note:'Calling bubble_sort(arr)' },
    { step:3,  line:2,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[5,3,8,1] } }, { func:'bubble_sort', locals:{ arr:[5,3,8,1], n:4 } }],   stdout:'', note:'n = len(arr) → 4' },
    { step:4,  line:3,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[5,3,8,1] } }, { func:'bubble_sort', locals:{ arr:[5,3,8,1], n:4, i:0 } }], stdout:'', note:'Pass i = 0' },
    { step:5,  line:4,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[5,3,8,1] } }, { func:'bubble_sort', locals:{ arr:[5,3,8,1], n:4, i:0, j:0 } }], stdout:'', note:'Inner loop j = 0' },
    { step:6,  line:5,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[5,3,8,1] } }, { func:'bubble_sort', locals:{ arr:[5,3,8,1], n:4, i:0, j:0 } }], stdout:'', note:'arr[0]=5 > arr[1]=3 → True' },
    { step:7,  line:6,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,8,1] } }, { func:'bubble_sort', locals:{ arr:[3,5,8,1], n:4, i:0, j:0 } }], stdout:'', note:'Swapped! → [3, 5, 8, 1]' },
    { step:8,  line:4,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,8,1] } }, { func:'bubble_sort', locals:{ arr:[3,5,8,1], n:4, i:0, j:1 } }], stdout:'', note:'j = 1' },
    { step:9,  line:5,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,8,1] } }, { func:'bubble_sort', locals:{ arr:[3,5,8,1], n:4, i:0, j:1 } }], stdout:'', note:'arr[1]=5 > arr[2]=8 → False, no swap' },
    { step:10, line:4,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,8,1] } }, { func:'bubble_sort', locals:{ arr:[3,5,8,1], n:4, i:0, j:2 } }], stdout:'', note:'j = 2' },
    { step:11, line:5,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,8,1] } }, { func:'bubble_sort', locals:{ arr:[3,5,8,1], n:4, i:0, j:2 } }], stdout:'', note:'arr[2]=8 > arr[3]=1 → True' },
    { step:12, line:6,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,1,8] } }, { func:'bubble_sort', locals:{ arr:[3,5,1,8], n:4, i:0, j:2 } }], stdout:'', note:'Swapped! → [3, 5, 1, 8]' },
    { step:13, line:3,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,1,8] } }, { func:'bubble_sort', locals:{ arr:[3,5,1,8], n:4, i:1 } }],     stdout:'', note:'Pass i = 1  (8 placed ✓)' },
    { step:14, line:4,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,1,8] } }, { func:'bubble_sort', locals:{ arr:[3,5,1,8], n:4, i:1, j:0 } }], stdout:'', note:'j = 0' },
    { step:15, line:5,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,1,8] } }, { func:'bubble_sort', locals:{ arr:[3,5,1,8], n:4, i:1, j:0 } }], stdout:'', note:'arr[0]=3 > arr[1]=5 → False' },
    { step:16, line:4,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,1,8] } }, { func:'bubble_sort', locals:{ arr:[3,5,1,8], n:4, i:1, j:1 } }], stdout:'', note:'j = 1' },
    { step:17, line:5,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,5,1,8] } }, { func:'bubble_sort', locals:{ arr:[3,5,1,8], n:4, i:1, j:1 } }], stdout:'', note:'arr[1]=5 > arr[2]=1 → True' },
    { step:18, line:6,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,1,5,8] } }, { func:'bubble_sort', locals:{ arr:[3,1,5,8], n:4, i:1, j:1 } }], stdout:'', note:'Swapped! → [3, 1, 5, 8]' },
    { step:19, line:3,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,1,5,8] } }, { func:'bubble_sort', locals:{ arr:[3,1,5,8], n:4, i:2 } }],     stdout:'', note:'Pass i = 2  (5, 8 placed ✓)' },
    { step:20, line:4,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,1,5,8] } }, { func:'bubble_sort', locals:{ arr:[3,1,5,8], n:4, i:2, j:0 } }], stdout:'', note:'j = 0' },
    { step:21, line:5,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[3,1,5,8] } }, { func:'bubble_sort', locals:{ arr:[3,1,5,8], n:4, i:2, j:0 } }], stdout:'', note:'arr[0]=3 > arr[1]=1 → True' },
    { step:22, line:6,  event:'step',   stack:[{ func:'<module>', locals:{ arr:[1,3,5,8] } }, { func:'bubble_sort', locals:{ arr:[1,3,5,8], n:4, i:2, j:0 } }], stdout:'', note:'Swapped! → [1, 3, 5, 8]' },
    { step:23, line:7,  event:'return', stack:[{ func:'<module>', locals:{ arr:[1,3,5,8] } }, { func:'bubble_sort', locals:{ arr:[1,3,5,8], n:4 } }],         stdout:'', note:'Return [1, 3, 5, 8]' },
    { step:24, line:10, event:'step',   stack:[{ func:'<module>', locals:{ arr:[1,3,5,8], result:[1,3,5,8] } }],                                              stdout:'', note:'result = [1, 3, 5, 8]' },
    { step:25, line:11, event:'step',   stack:[{ func:'<module>', locals:{ arr:[1,3,5,8], result:[1,3,5,8] } }],                                              stdout:'[1, 3, 5, 8]', note:'print(result)' },
  ],
};

// ─── C++ — Linked List push() ────────────────────────────────────────────────

const CPP_CODE = `#include <stdlib.h>

typedef struct Node {
    int val;
    struct Node* next;
} Node;

Node* head = NULL;

void push(int val) {
    Node* n = malloc(sizeof(Node));
    n->val = val;
    n->next = head;
    head = n;
}

int main() {
    push(3);
    push(7);
    push(1);
    return 0;
}`;

const nd = (id: string, val: any, nv: any, nt: string | null | undefined): HeapNode => ({
  id,
  fields: [
    { key: 'val',  val,  isPtr: false },
    { key: 'next', val: nv, isPtr: true, target: nt },
  ],
});

const h1: HeapNode[] = [nd('0x100', 3, 'NULL', null)];
const h2: HeapNode[] = [...h1, nd('0x200', 7, '0x100', '0x100')];
const h3: HeapNode[] = [...h2, nd('0x300', 1, '0x200', '0x200')];

export const CPP_SAMPLE: SampleTrace = {
  code: CPP_CODE,
  steps: [
    { step:0,  line:17, event:'call',   stack:[{ func:'main', locals:{}, globals:{ head:'NULL' } }], heap:[],       stdout:'', note:'main() starts' },
    { step:1,  line:18, event:'call',   stack:[{ func:'main', locals:{}, globals:{ head:'NULL' } }, { func:'push', locals:{ val:3 } }],               heap:[],                                    stdout:'', note:'push(3) called' },
    { step:2,  line:11, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'NULL' } }, { func:'push', locals:{ val:3, n:'0x100' } }],     heap:[nd('0x100','?','?',undefined)],        stdout:'', note:'malloc → 0x100' },
    { step:3,  line:12, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'NULL' } }, { func:'push', locals:{ val:3, n:'0x100' } }],     heap:[nd('0x100',3,'?',undefined)],          stdout:'', note:'n->val = 3' },
    { step:4,  line:13, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'NULL' } }, { func:'push', locals:{ val:3, n:'0x100' } }],     heap:[nd('0x100',3,'NULL',null)],            stdout:'', note:'n->next = head (NULL)' },
    { step:5,  line:14, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x100' } }, { func:'push', locals:{ val:3, n:'0x100' } }],    heap:[...h1],                               stdout:'', note:'head = 0x100' },
    { step:6,  line:18, event:'return', stack:[{ func:'main', locals:{}, globals:{ head:'0x100' } }],                                                   heap:[...h1],                               stdout:'', note:'push(3) returned' },
    { step:7,  line:19, event:'call',   stack:[{ func:'main', locals:{}, globals:{ head:'0x100' } }, { func:'push', locals:{ val:7 } }],               heap:[...h1],                               stdout:'', note:'push(7) called' },
    { step:8,  line:11, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x100' } }, { func:'push', locals:{ val:7, n:'0x200' } }],    heap:[...h1, nd('0x200','?','?',undefined)], stdout:'', note:'malloc → 0x200' },
    { step:9,  line:12, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x100' } }, { func:'push', locals:{ val:7, n:'0x200' } }],    heap:[...h1, nd('0x200',7,'?',undefined)],  stdout:'', note:'n->val = 7' },
    { step:10, line:13, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x100' } }, { func:'push', locals:{ val:7, n:'0x200' } }],    heap:[...h1, nd('0x200',7,'0x100','0x100')], stdout:'', note:'n->next = 0x100 (head)' },
    { step:11, line:14, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x200' } }, { func:'push', locals:{ val:7, n:'0x200' } }],    heap:[...h2],                               stdout:'', note:'head = 0x200' },
    { step:12, line:19, event:'return', stack:[{ func:'main', locals:{}, globals:{ head:'0x200' } }],                                                   heap:[...h2],                               stdout:'', note:'push(7) returned' },
    { step:13, line:20, event:'call',   stack:[{ func:'main', locals:{}, globals:{ head:'0x200' } }, { func:'push', locals:{ val:1 } }],               heap:[...h2],                               stdout:'', note:'push(1) called' },
    { step:14, line:11, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x200' } }, { func:'push', locals:{ val:1, n:'0x300' } }],    heap:[...h2, nd('0x300','?','?',undefined)], stdout:'', note:'malloc → 0x300' },
    { step:15, line:12, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x200' } }, { func:'push', locals:{ val:1, n:'0x300' } }],    heap:[...h2, nd('0x300',1,'?',undefined)],  stdout:'', note:'n->val = 1' },
    { step:16, line:13, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x200' } }, { func:'push', locals:{ val:1, n:'0x300' } }],    heap:[...h2, nd('0x300',1,'0x200','0x200')], stdout:'', note:'n->next = 0x200 (head)' },
    { step:17, line:14, event:'step',   stack:[{ func:'main', locals:{}, globals:{ head:'0x300' } }, { func:'push', locals:{ val:1, n:'0x300' } }],    heap:[...h3],                               stdout:'', note:'head = 0x300' },
    { step:18, line:21, event:'return', stack:[{ func:'main', locals:{}, globals:{ head:'0x300' } }],                                                   heap:[...h3],                               stdout:'', note:'return 0 — list: 1→7→3→NULL' },
  ],
};

export const SAMPLE_TRACES: Record<string, SampleTrace> = {
  python: PYTHON_SAMPLE,
  cpp:    CPP_SAMPLE,
};

// ─── Python — Linear Search ──────────────────────────────────────────────────

const LINEAR_SEARCH_CODE = `def linear_search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1

nums = [4, 7, 2, 11, 9, 15]
result = linear_search(nums, 11)
print(f"Found 11 at index {result}")`;

const LS_MOD = (extra: Record<string, unknown> = {}) => ({
  func: '<module>', locals: { nums: [4, 7, 2, 11, 9, 15], ...extra },
});
const LS_FN = (i?: number) => ({
  func: 'linear_search',
  locals: { arr: [4, 7, 2, 11, 9, 15], target: 11, ...(i !== undefined ? { i } : {}) },
});

export const PYTHON_LINEAR_SEARCH_SAMPLE: SampleTrace = {
  code: LINEAR_SEARCH_CODE,
  steps: [
    { step: 0,  line: 7, event: 'step',   stack: [{ func: '<module>', locals: {} }],                       stdout: '', note: 'Program starts' },
    { step: 1,  line: 7, event: 'step',   stack: [LS_MOD()],                                               stdout: '', note: 'nums = [4, 7, 2, 11, 9, 15]' },
    { step: 2,  line: 8, event: 'call',   stack: [LS_MOD(), LS_FN()],                                      stdout: '', note: 'linear_search(nums, 11)' },
    { step: 3,  line: 2, event: 'step',   stack: [LS_MOD(), LS_FN(0)],                                     stdout: '', note: 'i = 0' },
    { step: 4,  line: 3, event: 'step',   stack: [LS_MOD(), LS_FN(0)],                                     stdout: '', note: 'arr[0] = 4 — check 4 == 11?' },
    { step: 5,  line: 2, event: 'step',   stack: [LS_MOD(), LS_FN(1)],                                     stdout: '', note: 'i = 1' },
    { step: 6,  line: 3, event: 'step',   stack: [LS_MOD(), LS_FN(1)],                                     stdout: '', note: 'arr[1] = 7 — check 7 == 11?' },
    { step: 7,  line: 2, event: 'step',   stack: [LS_MOD(), LS_FN(2)],                                     stdout: '', note: 'i = 2' },
    { step: 8,  line: 3, event: 'step',   stack: [LS_MOD(), LS_FN(2)],                                     stdout: '', note: 'arr[2] = 2 — check 2 == 11?' },
    { step: 9,  line: 2, event: 'step',   stack: [LS_MOD(), LS_FN(3)],                                     stdout: '', note: 'i = 3' },
    { step: 10, line: 3, event: 'step',   stack: [LS_MOD(), LS_FN(3)],                                     stdout: '', note: 'arr[3] = 11 — check 11 == 11? ✓' },
    { step: 11, line: 4, event: 'return', stack: [LS_MOD(), LS_FN(3)],                                     stdout: '', note: 'Found! Return index 3' },
    { step: 12, line: 8, event: 'step',   stack: [LS_MOD({ result: 3 })],                                  stdout: '', note: 'result = 3' },
    { step: 13, line: 9, event: 'step',   stack: [LS_MOD({ result: 3 })], stdout: 'Found 11 at index 3',  note: 'print result' },
  ],
};

// ─── Python — Binary Search ──────────────────────────────────────────────────

const BINARY_SEARCH_CODE = `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

nums = [2, 5, 8, 12, 16, 23, 38, 42]
idx = binary_search(nums, 23)
print(f"Found 23 at index {idx}")`;

const BS_ARR = [2, 5, 8, 12, 16, 23, 38, 42];
const BS_MOD = (extra: Record<string, unknown> = {}) => ({
  func: '<module>', locals: { nums: BS_ARR, ...extra },
});
const BS_FN = (vars: Record<string, unknown>) => ({
  func: 'binary_search', locals: { arr: BS_ARR, target: 23, ...vars },
});

export const PYTHON_BINARY_SEARCH_SAMPLE: SampleTrace = {
  code: BINARY_SEARCH_CODE,
  steps: [
    { step: 0,  line: 13, event: 'step',   stack: [{ func: '<module>', locals: {} }],         stdout: '', note: 'Program starts' },
    { step: 1,  line: 13, event: 'step',   stack: [BS_MOD()],                                  stdout: '', note: 'nums = [2, 5, 8, 12, 16, 23, 38, 42]' },
    { step: 2,  line: 14, event: 'call',   stack: [BS_MOD(), BS_FN({})],                        stdout: '', note: 'binary_search(nums, 23)' },
    { step: 3,  line: 2,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 0, hi: 7 })],         stdout: '', note: 'lo = 0, hi = 7 (n−1)' },
    { step: 4,  line: 3,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 0, hi: 7 })],         stdout: '', note: 'lo(0) ≤ hi(7) → enter loop' },
    { step: 5,  line: 4,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 0, hi: 7, mid: 3 })], stdout: '', note: 'mid = (0+7)//2 = 3' },
    { step: 6,  line: 5,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 0, hi: 7, mid: 3 })], stdout: '', note: 'arr[3] = 12, check 12 == 23?' },
    { step: 7,  line: 7,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 0, hi: 7, mid: 3 })], stdout: '', note: '12 < 23 → search right half' },
    { step: 8,  line: 8,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 4, hi: 7, mid: 3 })], stdout: '', note: 'lo = mid+1 = 4' },
    { step: 9,  line: 3,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 4, hi: 7 })],          stdout: '', note: 'lo(4) ≤ hi(7) → continue' },
    { step: 10, line: 4,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 4, hi: 7, mid: 5 })],  stdout: '', note: 'mid = (4+7)//2 = 5' },
    { step: 11, line: 5,  event: 'step',   stack: [BS_MOD(), BS_FN({ lo: 4, hi: 7, mid: 5 })],  stdout: '', note: 'arr[5] = 23, check 23 == 23? ✓' },
    { step: 12, line: 6,  event: 'return', stack: [BS_MOD(), BS_FN({ lo: 4, hi: 7, mid: 5 })],  stdout: '', note: 'Found! Return index 5' },
    { step: 13, line: 14, event: 'step',   stack: [BS_MOD({ idx: 5 })],                          stdout: '', note: 'idx = 5' },
    { step: 14, line: 15, event: 'step',   stack: [BS_MOD({ idx: 5 })], stdout: 'Found 23 at index 5', note: 'print result' },
  ],
};

// ─── Code presets (for the Examples picker) ──────────────────────────────────

// ─── Python — Jump Search ───────────────────────────────────────────────────

const JUMP_SEARCH_CODE = `import math

def jump_search(arr, target):
    n = len(arr)
    step = int(math.sqrt(n))
    prev = 0
    check = min(step, n) - 1
    while arr[check] < target:
        prev = step
        step += int(math.sqrt(n))
        check = min(step, n) - 1
        if prev >= n:
            return -1
    while arr[prev] < target:
        prev += 1
        if prev == min(step, n):
            return -1
    return prev if arr[prev] == target else -1

arr = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
idx = jump_search(arr, 36)
print(f"Found 36 at index {idx}")`;

const JMP_ARR = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100];
const JMP_MOD = (x: Record<string, unknown> = {}) => ({ func: '<module>', locals: { arr: JMP_ARR, ...x } });
const JMP_FN  = (x: Record<string, unknown> = {}) => ({ func: 'jump_search', locals: { arr: JMP_ARR, target: 36, n: 10, ...x } });

export const PYTHON_JUMP_SEARCH_SAMPLE: SampleTrace = {
  code: JUMP_SEARCH_CODE,
  steps: [
    { step: 0,  line: 20, event: 'step',   stack: [{ func: '<module>', locals: {} }],                              stdout: '', note: 'Program starts' },
    { step: 1,  line: 20, event: 'step',   stack: [JMP_MOD()],                                                     stdout: '', note: 'arr = [1,4,9,16,25,36,49,64,81,100]' },
    { step: 2,  line: 21, event: 'call',   stack: [JMP_MOD(), JMP_FN({ step: 3, prev: 0, check: 2 })],             stdout: '', note: 'jump_search(arr,36) — step = √10 ≈ 3' },
    { step: 3,  line: 8,  event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 3, prev: 0, check: 2 })],             stdout: '', note: 'arr[2]=9 < 36 → jump forward' },
    { step: 4,  line: 9,  event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 3, prev: 3, check: 2 })],             stdout: '', note: 'prev = 3' },
    { step: 5,  line: 10, event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 3, check: 2 })],             stdout: '', note: 'step += 3 → step = 6' },
    { step: 6,  line: 11, event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 3, check: 5 })],             stdout: '', note: 'check = min(6,10)−1 = 5' },
    { step: 7,  line: 8,  event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 3, check: 5 })],             stdout: '', note: 'arr[5]=36 < 36 → False, stop jumping' },
    { step: 8,  line: 14, event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 3 })],                       stdout: '', note: 'linear scan: arr[3]=16 < 36 → True' },
    { step: 9,  line: 15, event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 4 })],                       stdout: '', note: 'prev = 4' },
    { step: 10, line: 14, event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 4 })],                       stdout: '', note: 'arr[4]=25 < 36 → True' },
    { step: 11, line: 15, event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 5 })],                       stdout: '', note: 'prev = 5' },
    { step: 12, line: 14, event: 'step',   stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 5 })],                       stdout: '', note: 'arr[5]=36 < 36 → False, stop scan' },
    { step: 13, line: 18, event: 'return', stack: [JMP_MOD(), JMP_FN({ step: 6, prev: 5 })],                       stdout: '', note: 'arr[5]=36 == 36 → return 5' },
    { step: 14, line: 21, event: 'step',   stack: [JMP_MOD({ idx: 5 })],                                           stdout: '', note: 'idx = 5' },
    { step: 15, line: 22, event: 'step',   stack: [JMP_MOD({ idx: 5 })],   stdout: 'Found 36 at index 5',          note: 'print result' },
  ],
};

// ─── Python — Interpolation Search ──────────────────────────────────────────

const INTERP_SEARCH_CODE = `def interpolation_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi and arr[lo] <= target <= arr[hi]:
        pos = lo + (target - arr[lo]) * (hi - lo) // (arr[hi] - arr[lo])
        if arr[pos] == target:
            return pos
        elif arr[pos] < target:
            lo = pos + 1
        else:
            hi = pos - 1
    return -1

arr = [2, 5, 11, 20, 32, 47, 65, 86, 110, 137]
idx = interpolation_search(arr, 65)
print(f"Found 65 at index {idx}")`;

const INT_ARR = [2, 5, 11, 20, 32, 47, 65, 86, 110, 137];
const INT_MOD = (x: Record<string, unknown> = {}) => ({ func: '<module>', locals: { arr: INT_ARR, ...x } });
const INT_FN  = (x: Record<string, unknown> = {}) => ({ func: 'interpolation_search', locals: { arr: INT_ARR, target: 65, ...x } });

// pos computation (using integer division):
// probe1: 0 + (65-2)*9 // (137-2) = 567//135 = 4  → arr[4]=32
// probe2: 5 + (65-47)*4 // (137-47) = 5+72//90 = 5 → arr[5]=47
// probe3: 6 + (65-65)*3 // (137-65) = 6+0 = 6      → arr[6]=65 ✓

export const PYTHON_INTERP_SEARCH_SAMPLE: SampleTrace = {
  code: INTERP_SEARCH_CODE,
  steps: [
    { step: 0,  line: 13, event: 'step',   stack: [{ func: '<module>', locals: {} }],                  stdout: '', note: 'Program starts' },
    { step: 1,  line: 13, event: 'step',   stack: [INT_MOD()],                                          stdout: '', note: 'arr = [2,5,11,20,32,47,65,86,110,137]' },
    { step: 2,  line: 14, event: 'call',   stack: [INT_MOD(), INT_FN({ lo: 0, hi: 9 })],                stdout: '', note: 'interpolation_search(arr, 65)' },
    { step: 3,  line: 4,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 0, hi: 9, pos: 4 })],        stdout: '', note: 'pos = 0+(65−2)×9÷135 = 4' },
    { step: 4,  line: 5,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 0, hi: 9, pos: 4 })],        stdout: '', note: 'arr[4]=32 == 65? No' },
    { step: 5,  line: 7,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 0, hi: 9, pos: 4 })],        stdout: '', note: 'arr[4]=32 < 65 → search right' },
    { step: 6,  line: 8,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 5, hi: 9, pos: 4 })],        stdout: '', note: 'lo = pos+1 = 5' },
    { step: 7,  line: 4,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 5, hi: 9, pos: 5 })],        stdout: '', note: 'pos = 5+(65−47)×4÷90 = 5' },
    { step: 8,  line: 5,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 5, hi: 9, pos: 5 })],        stdout: '', note: 'arr[5]=47 == 65? No' },
    { step: 9,  line: 7,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 5, hi: 9, pos: 5 })],        stdout: '', note: 'arr[5]=47 < 65 → search right' },
    { step: 10, line: 8,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 6, hi: 9, pos: 5 })],        stdout: '', note: 'lo = pos+1 = 6' },
    { step: 11, line: 4,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 6, hi: 9, pos: 6 })],        stdout: '', note: 'pos = 6+(65−65)×3÷72 = 6' },
    { step: 12, line: 5,  event: 'step',   stack: [INT_MOD(), INT_FN({ lo: 6, hi: 9, pos: 6 })],        stdout: '', note: 'arr[6]=65 == 65 — found!' },
    { step: 13, line: 6,  event: 'return', stack: [INT_MOD(), INT_FN({ lo: 6, hi: 9, pos: 6 })],        stdout: '', note: 'Return index 6' },
    { step: 14, line: 14, event: 'step',   stack: [INT_MOD({ idx: 6 })],                                stdout: '', note: 'idx = 6' },
    { step: 15, line: 15, event: 'step',   stack: [INT_MOD({ idx: 6 })],   stdout: 'Found 65 at index 6', note: 'print result' },
  ],
};

// ─── Python — Exponential Search ────────────────────────────────────────────

const EXP_SEARCH_CODE = `def exponential_search(arr, target):
    n = len(arr)
    if arr[0] == target:
        return 0
    bound = 1
    while bound < n and arr[bound] <= target:
        bound *= 2
    lo = bound // 2
    hi = min(bound, n - 1)
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

arr = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
idx = exponential_search(arr, 13)
print(f"Found 13 at index {idx}")`;

const EXP_ARR = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const EXP_MOD = (x: Record<string, unknown> = {}) => ({ func: '<module>', locals: { arr: EXP_ARR, ...x } });
const EXP_BOUND = (b: number) => ({ func: 'exponential_search', locals: { arr: EXP_ARR, target: 13, n: 10, bound: b } });
const EXP_BIN   = (lo: number, hi: number, mid?: number) => ({
  func: 'exponential_search',
  locals: { arr: EXP_ARR, target: 13, n: 10, bound: 8, lo, hi, ...(mid !== undefined ? { mid } : {}) },
});

// Doubling: bound=1(arr[1]=3≤13)→2(arr[2]=5≤13)→4(arr[4]=9≤13)→8(arr[8]=17>13) → stop
// Binary [4..8]: mid=6 → arr[6]=13 ✓

export const PYTHON_EXP_SEARCH_SAMPLE: SampleTrace = {
  code: EXP_SEARCH_CODE,
  steps: [
    { step: 0,  line: 20, event: 'step',   stack: [{ func: '<module>', locals: {} }],     stdout: '', note: 'Program starts' },
    { step: 1,  line: 20, event: 'step',   stack: [EXP_MOD()],                             stdout: '', note: 'arr = [1,3,5,7,9,11,13,15,17,19]' },
    { step: 2,  line: 21, event: 'call',   stack: [EXP_MOD(), EXP_BOUND(1)],               stdout: '', note: 'exponential_search(arr, 13) — bound = 1' },
    { step: 3,  line: 6,  event: 'step',   stack: [EXP_MOD(), EXP_BOUND(1)],               stdout: '', note: 'bound=1, arr[1]=3 ≤ 13 → bound×=2' },
    { step: 4,  line: 7,  event: 'step',   stack: [EXP_MOD(), EXP_BOUND(2)],               stdout: '', note: 'bound = 2' },
    { step: 5,  line: 6,  event: 'step',   stack: [EXP_MOD(), EXP_BOUND(2)],               stdout: '', note: 'bound=2, arr[2]=5 ≤ 13 → bound×=2' },
    { step: 6,  line: 7,  event: 'step',   stack: [EXP_MOD(), EXP_BOUND(4)],               stdout: '', note: 'bound = 4' },
    { step: 7,  line: 6,  event: 'step',   stack: [EXP_MOD(), EXP_BOUND(4)],               stdout: '', note: 'bound=4, arr[4]=9 ≤ 13 → bound×=2' },
    { step: 8,  line: 7,  event: 'step',   stack: [EXP_MOD(), EXP_BOUND(8)],               stdout: '', note: 'bound = 8' },
    { step: 9,  line: 6,  event: 'step',   stack: [EXP_MOD(), EXP_BOUND(8)],               stdout: '', note: 'bound=8, arr[8]=17 > 13 → exit doubling' },
    { step: 10, line: 10, event: 'step',   stack: [EXP_MOD(), EXP_BIN(4, 8)],              stdout: '', note: 'binary search [lo=4 .. hi=8]' },
    { step: 11, line: 11, event: 'step',   stack: [EXP_MOD(), EXP_BIN(4, 8, 6)],           stdout: '', note: 'mid = (4+8)//2 = 6' },
    { step: 12, line: 12, event: 'step',   stack: [EXP_MOD(), EXP_BIN(4, 8, 6)],           stdout: '', note: 'arr[6]=13 == 13 — found!' },
    { step: 13, line: 13, event: 'return', stack: [EXP_MOD(), EXP_BIN(4, 8, 6)],           stdout: '', note: 'Return index 6' },
    { step: 14, line: 21, event: 'step',   stack: [EXP_MOD({ idx: 6 })],                   stdout: '', note: 'idx = 6' },
    { step: 15, line: 22, event: 'step',   stack: [EXP_MOD({ idx: 6 })], stdout: 'Found 13 at index 6', note: 'print result' },
  ],
};

// ─── Python — Ternary Search ─────────────────────────────────────────────────

const TERN_SEARCH_CODE = `def ternary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid1 = lo + (hi - lo) // 3
        mid2 = hi - (hi - lo) // 3
        if arr[mid1] == target:
            return mid1
        if arr[mid2] == target:
            return mid2
        if target < arr[mid1]:
            hi = mid1 - 1
        elif target > arr[mid2]:
            lo = mid2 + 1
        else:
            lo, hi = mid1 + 1, mid2 - 1
    return -1

arr = [2, 5, 8, 11, 14, 17, 20, 23, 26]
idx = ternary_search(arr, 17)
print(f"Found 17 at index {idx}")`;

const TERN_ARR = [2, 5, 8, 11, 14, 17, 20, 23, 26];
const TERN_MOD = (x: Record<string, unknown> = {}) => ({ func: '<module>', locals: { arr: TERN_ARR, ...x } });
const TERN_FN  = (x: Record<string, unknown> = {}) => ({ func: 'ternary_search', locals: { arr: TERN_ARR, target: 17, ...x } });

// Iter 1: lo=0,hi=8 → mid1=0+(8)//3=2, mid2=8-(8)//3=6  arr[2]=8,arr[6]=20  8<17<20 → lo=3,hi=5
// Iter 2: lo=3,hi=5 → mid1=3+(2)//3=3, mid2=5-(2)//3=5  arr[3]=11,arr[5]=17 → found at mid2!

export const PYTHON_TERN_SEARCH_SAMPLE: SampleTrace = {
  code: TERN_SEARCH_CODE,
  steps: [
    { step: 0,  line: 18, event: 'step',   stack: [{ func: '<module>', locals: {} }],                      stdout: '', note: 'Program starts' },
    { step: 1,  line: 18, event: 'step',   stack: [TERN_MOD()],                                             stdout: '', note: 'arr = [2,5,8,11,14,17,20,23,26]' },
    { step: 2,  line: 19, event: 'call',   stack: [TERN_MOD(), TERN_FN({ lo: 0, hi: 8, mid1: 2, mid2: 6 })], stdout: '', note: 'ternary_search(arr,17) — lo=0 hi=8' },
    { step: 3,  line: 6,  event: 'step',   stack: [TERN_MOD(), TERN_FN({ lo: 0, hi: 8, mid1: 2, mid2: 6 })], stdout: '', note: 'arr[2]=8 == 17? No' },
    { step: 4,  line: 8,  event: 'step',   stack: [TERN_MOD(), TERN_FN({ lo: 0, hi: 8, mid1: 2, mid2: 6 })], stdout: '', note: 'arr[6]=20 == 17? No' },
    { step: 5,  line: 10, event: 'step',   stack: [TERN_MOD(), TERN_FN({ lo: 0, hi: 8, mid1: 2, mid2: 6 })], stdout: '', note: '17 < 8? No. 17 > 20? No → middle third' },
    { step: 6,  line: 15, event: 'step',   stack: [TERN_MOD(), TERN_FN({ lo: 3, hi: 5, mid1: 2, mid2: 6 })], stdout: '', note: 'lo=mid1+1=3, hi=mid2−1=5' },
    { step: 7,  line: 4,  event: 'step',   stack: [TERN_MOD(), TERN_FN({ lo: 3, hi: 5, mid1: 3, mid2: 5 })], stdout: '', note: 'mid1=3+(5−3)//3=3, mid2=5−(5−3)//3=5' },
    { step: 8,  line: 6,  event: 'step',   stack: [TERN_MOD(), TERN_FN({ lo: 3, hi: 5, mid1: 3, mid2: 5 })], stdout: '', note: 'arr[3]=11 == 17? No' },
    { step: 9,  line: 8,  event: 'step',   stack: [TERN_MOD(), TERN_FN({ lo: 3, hi: 5, mid1: 3, mid2: 5 })], stdout: '', note: 'arr[5]=17 == 17 — found at mid2!' },
    { step: 10, line: 9,  event: 'return', stack: [TERN_MOD(), TERN_FN({ lo: 3, hi: 5, mid1: 3, mid2: 5 })], stdout: '', note: 'Return index 5' },
    { step: 11, line: 19, event: 'step',   stack: [TERN_MOD({ idx: 5 })],                                    stdout: '', note: 'idx = 5' },
    { step: 12, line: 20, event: 'step',   stack: [TERN_MOD({ idx: 5 })],  stdout: 'Found 17 at index 5',    note: 'print result' },
  ],
};

// ─── Python — Fibonacci Search ───────────────────────────────────────────────

const FIB_SEARCH_CODE = `def fibonacci_search(arr, target):
    n = len(arr)
    fib_m2, fib_m1, fib_m = 0, 1, 1
    while fib_m < n:
        fib_m2, fib_m1, fib_m = fib_m1, fib_m, fib_m1 + fib_m
    offset = -1
    while fib_m > 1:
        i = min(offset + fib_m2, n - 1)
        if arr[i] < target:
            fib_m, fib_m1, fib_m2 = fib_m1, fib_m2, fib_m1 - fib_m2
            offset = i
        elif arr[i] > target:
            fib_m, fib_m1, fib_m2 = fib_m2, fib_m1 - fib_m2, fib_m2 - (fib_m1 - fib_m2)
        else:
            return i
    if fib_m1 and offset + 1 < n and arr[offset + 1] == target:
        return offset + 1
    return -1

arr = [1, 4, 7, 10, 13, 16, 19, 22]
idx = fibonacci_search(arr, 16)
print(f"Found 16 at index {idx}")`;

const FIBS_ARR = [1, 4, 7, 10, 13, 16, 19, 22];
const FIBS_MOD = (x: Record<string, unknown> = {}) => ({ func: '<module>', locals: { arr: FIBS_ARR, ...x } });
const FIBS_FN  = (x: Record<string, unknown>) => ({ func: 'fibonacci_search', locals: { arr: FIBS_ARR, target: 16, n: 8, ...x } });

// Fib numbers ≥ n=8: 1,1,2,3,5,8 → fib_m=8, fib_m1=5, fib_m2=3, offset=−1
// Probe 1: i=min(−1+3,7)=2 → arr[2]=7<16  → fib_m=5,fib_m1=3,fib_m2=2, offset=2
// Probe 2: i=min(2+2,7)=4  → arr[4]=13<16 → fib_m=3,fib_m1=2,fib_m2=1, offset=4
// Probe 3: i=min(4+1,7)=5  → arr[5]=16=16 → found!

export const PYTHON_FIB_SEARCH_SAMPLE: SampleTrace = {
  code: FIB_SEARCH_CODE,
  steps: [
    { step: 0,  line: 20, event: 'step',   stack: [{ func: '<module>', locals: {} }],                                                          stdout: '', note: 'Program starts' },
    { step: 1,  line: 20, event: 'step',   stack: [FIBS_MOD()],                                                                                 stdout: '', note: 'arr = [1,4,7,10,13,16,19,22]' },
    { step: 2,  line: 21, event: 'call',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 3, fib_m1: 5, fib_m: 8, offset: -1 })],                       stdout: '', note: 'Init: fib 3,5,8 ≥ n=8 — offset=−1' },
    { step: 3,  line: 8,  event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 3, fib_m1: 5, fib_m: 8, offset: -1, i: 2 })],                 stdout: '', note: 'i = min(−1+3, 7) = 2' },
    { step: 4,  line: 9,  event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 3, fib_m1: 5, fib_m: 8, offset: -1, i: 2 })],                 stdout: '', note: 'arr[2]=7 < 16 → shift right' },
    { step: 5,  line: 11, event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 2, fib_m1: 3, fib_m: 5, offset:  2, i: 2 })],                 stdout: '', note: 'fib=(5,3,2) offset=2 — eliminated [0..2]' },
    { step: 6,  line: 8,  event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 2, fib_m1: 3, fib_m: 5, offset:  2, i: 4 })],                 stdout: '', note: 'i = min(2+2, 7) = 4' },
    { step: 7,  line: 9,  event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 2, fib_m1: 3, fib_m: 5, offset:  2, i: 4 })],                 stdout: '', note: 'arr[4]=13 < 16 → shift right' },
    { step: 8,  line: 11, event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 1, fib_m1: 2, fib_m: 3, offset:  4, i: 4 })],                 stdout: '', note: 'fib=(3,2,1) offset=4 — eliminated [0..4]' },
    { step: 9,  line: 8,  event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 1, fib_m1: 2, fib_m: 3, offset:  4, i: 5 })],                 stdout: '', note: 'i = min(4+1, 7) = 5' },
    { step: 10, line: 9,  event: 'step',   stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 1, fib_m1: 2, fib_m: 3, offset:  4, i: 5 })],                 stdout: '', note: 'arr[5]=16 == 16 — found!' },
    { step: 11, line: 15, event: 'return', stack: [FIBS_MOD(), FIBS_FN({ fib_m2: 1, fib_m1: 2, fib_m: 3, offset:  4, i: 5 })],                 stdout: '', note: 'Return index 5' },
    { step: 12, line: 21, event: 'step',   stack: [FIBS_MOD({ idx: 5 })],                                                                       stdout: '', note: 'idx = 5' },
    { step: 13, line: 22, event: 'step',   stack: [FIBS_MOD({ idx: 5 })], stdout: 'Found 16 at index 5',                                        note: 'print result' },
  ],
};

// ─── Code presets (for the Examples picker) ──────────────────────────────────

export interface Preset {
  label:        string;
  code:         string;
  sampleTrace?: TraceStep[];
}

export const PYTHON_PRESETS: Preset[] = [
  {
    label:       'Bubble Sort',
    code:        PY_CODE,
    sampleTrace: PYTHON_SAMPLE.steps,
  },
  {
    label:       'Linear Search',
    code:        LINEAR_SEARCH_CODE,
    sampleTrace: PYTHON_LINEAR_SEARCH_SAMPLE.steps,
  },
  {
    label:       'Binary Search',
    code:        BINARY_SEARCH_CODE,
    sampleTrace: PYTHON_BINARY_SEARCH_SAMPLE.steps,
  },
  {
    label:       'Jump Search',
    code:        JUMP_SEARCH_CODE,
    sampleTrace: PYTHON_JUMP_SEARCH_SAMPLE.steps,
  },
  {
    label:       'Interpolation Search',
    code:        INTERP_SEARCH_CODE,
    sampleTrace: PYTHON_INTERP_SEARCH_SAMPLE.steps,
  },
  {
    label:       'Exponential Search',
    code:        EXP_SEARCH_CODE,
    sampleTrace: PYTHON_EXP_SEARCH_SAMPLE.steps,
  },
  {
    label:       'Ternary Search',
    code:        TERN_SEARCH_CODE,
    sampleTrace: PYTHON_TERN_SEARCH_SAMPLE.steps,
  },
  {
    label:       'Fibonacci Search',
    code:        FIB_SEARCH_CODE,
    sampleTrace: PYTHON_FIB_SEARCH_SAMPLE.steps,
  },
  {
    label: 'Fibonacci (recursive)',
    code: `def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

for i in range(8):
    print(f"fib({i}) = {fib(i)}")`,
  },
  {
    label: 'Insertion Sort',
    code: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

arr = [9, 4, 7, 2, 6]
result = insertion_sort(arr)
print(result)`,
  },
];

export const CPP_PRESETS: Preset[] = [
  {
    label: 'Linked List',
    code:  CPP_CODE,
  },
  {
    label: 'Hello World',
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    cout << "Welcome to CodeVis!" << endl;
    return 0;
}`,
  },
  {
    label: 'FizzBuzz',
    code: `#include <iostream>
using namespace std;

int main() {
    for (int i = 1; i <= 20; i++) {
        if (i % 15 == 0)      cout << "FizzBuzz\\n";
        else if (i % 3 == 0)  cout << "Fizz\\n";
        else if (i % 5 == 0)  cout << "Buzz\\n";
        else                   cout << i << "\\n";
    }
    return 0;
}`,
  },
  {
    label: 'Fibonacci',
    code: `#include <iostream>
using namespace std;

int main() {
    int n = 12, a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        cout << a << "\\n";
        int t = a + b;
        a = b;
        b = t;
    }
    return 0;
}`,
  },
];
