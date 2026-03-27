import { describe, expect, it } from 'vitest'
import { toDatetimeLocalValue, toLocalOffsetIsoString } from './datetime'

describe('datetime utilities', () => {
  it('converts api iso strings into datetime-local values', () => {
    expect(toDatetimeLocalValue('2026-03-27T19:00:00+09:00')).toBe('2026-03-27T19:00')
  })

  it('preserves the wall-clock value when creating offset iso strings', () => {
    const result = toLocalOffsetIsoString('2026-03-27T19:00')

    expect(result.startsWith('2026-03-27T19:00:00')).toBe(true)
    expect(/[+-]\d{2}:\d{2}$/.test(result)).toBe(true)
  })
})
