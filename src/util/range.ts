/**
 * Closed range of numbers
 */
export interface Range {
    /**
     * Start of segment (inclusive)
     */
    from: number
    /**
     * End of segment (inclusive). Defaults to Infinity
     */
    to?: number
}


export function isWithinRange(range: Range, num: number): boolean {
    return range.from <= num && num <= (range.to ?? Infinity)
}


export function rangeIntersection(a: Range, b: Range): Range | undefined {
    let beg = Math.max(a.from, b.from)
    let end = Math.min(a.to ?? Infinity, b.to ?? Infinity)
    if (beg > end) return undefined
    if (end === Infinity) {
        return {from: beg}
    } else {
        return {from: beg, to: end}
    }
}


export function rangeDifference(a: Range, b: Range): Range[] {
    let i = rangeIntersection(a, b)
    if (i == null) return [a]
    let result: Range[] = []
    if (a.from < i.from) {
        result.push({from: a.from, to: i.from - 1})
    }
    if (i.to != null && i.to < (a.to ?? Infinity)) {
        let from = i.to + 1
        if (a.to) {
            result.push({from, to: a.to})
        } else {
            result.push({from})
        }
    }
    return result
}


export function rangeUnion(ranges: Range[]): Range[] {
    if (ranges.length == 0) return ranges
    ranges = ranges.slice().sort(
        (a, b) => a.from - b.from
    )
    let current = {...ranges[0]}
    let union: Range[] = [current]
    if (current.to == null) return union
    for (let i = 0; i < ranges.length; i++) {
        let range = ranges[i]
        let from = range.from
        if (current.to < from) {
            current = {...range}
            union.push(current)
            if (current.to == null) return union
        } else {
            let end = range.to
            if (end == null) {
                current.to = undefined
                return union
            } else {
                current.to = Math.max(current.to, end)
            }
        }
    }
    return union
}
