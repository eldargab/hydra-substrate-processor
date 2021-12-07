import {BlockHandler, EventHandler} from "./interfaces/handlerContext"
import {Hooks} from "./interfaces/hooks"
import {QualifiedName} from "./interfaces/substrate"
import {Heap} from "./util/heap"
import {Range, rangeDifference, rangeIntersection} from "./util/range"
import {assertNotNull} from "./util/util"


export interface Batch {
    range: Range
    pre: BlockHandler[]
    post: BlockHandler[]
    events: Record<QualifiedName, EventHandler[]>
}


export function createBatches(hooks: Hooks, range?: Range): Batch[] {
    let batches: Batch[] = []

    hooks.pre.forEach(hook => {
        batches.push({
            range: hook.range || {from: 0},
            pre: [hook.handler],
            post: [],
            events: {}
        })
    })

    hooks.post.forEach(hook => {
        batches.push({
            range: hook.range || {from: 0},
            pre: [],
            post: [hook.handler],
            events: {}
        })
    })

    hooks.event.forEach(hook => {
        batches.push({
            range: hook.range || {from: 0},
            pre: [],
            post: [],
            events: {
                [hook.event]: [hook.handler]
            }
        })
    })

    batches = mergeBatches(batches)

    if (range != null) {
        trimToStart(batches, range.from)
        if (range.to != null) {
            trimFromEnd(batches, range.to)
        }
    }

    return batches
}


export function mergeBatches(batches: Batch[]): Batch[] {
    if (batches.length <= 1) return batches

    let union: Batch[] = []
    let heap = new Heap<Batch>((a, b) => b.range.from - a.range.from)

    heap.init(batches.slice())

    let top = assertNotNull(heap.pop())
    let batch: Batch | undefined
    while (batch = heap.peek()) {
        let i = rangeIntersection(top.range, batch.range)
        if (i == null) {
            union.push(top)
            top = assertNotNull(heap.pop())
        } else {
            heap.pop()
            rangeDifference(top.range, i).forEach(range => {
                heap.push({...top, range})
            })
            rangeDifference(batch.range, i).forEach(range => {
                heap.push({...batch!, range})
            })
            heap.push(mergeBatchHandlers(top, batch, i))
            top = assertNotNull(heap.pop())
        }
    }
    union.push(top)
    return union
}


function mergeBatchHandlers(a: Batch, b: Batch, range: Range): Batch {
    return {
        range,
        pre: a.pre.concat(b.pre),
        post: a.post.concat(b.post),
        events: mergeHandlers(a.events, b.events)
    }
}


function mergeHandlers<T>(a: Record<string, T[]>, b: Record<string, T[]>): Record<string, T[]> {
    let result: Record<string, T[]> = {}

    function add(col: Record<string, T[]>, key: string): void {
        let list = result[key]
        if (list == null) {
            result[key] = col[key].slice()
        } else {
            list.push(...col[key])
        }
    }

    for (let key in a) {
        add(a, key)
    }
    for (let key in b) {
        add(b, key)
    }
    return result
}


function trimToStart(batches: Batch[], start: number): void {
    let b: Batch | undefined
    while (b = batches[0]) {
        let end = b.range.to ?? Infinity
        if (start <= end) {
            batches[0] = {
                ...b,
                range: {from: start, to: b.range.to}
            }
            return
        } else {
            batches.shift()
        }
    }
}


function trimFromEnd(batches: Batch[], end: number): void {
    for (let i = 0; i < batches.length; i++) {
        let b = batches[i]
        let to = b.range.to ?? end
        if (end < to) {
            batches[i] = {
                ...b,
                range: {from: b.range.from, to: end}
            }
            while (batches.length > i + 1) {
                batches.pop()
            }
            return
        }
    }
}
