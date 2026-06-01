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

import type { SampleTrace, HeapNode } from '../types/trace';

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
