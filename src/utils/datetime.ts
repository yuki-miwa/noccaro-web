export function toDatetimeLocalValue(value: string | null): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function toLocalOffsetIsoString(value: string): string {
  if (!value) {
    return ''
  }

  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) {
    return ''
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0)

  if (Number.isNaN(localDate.getTime())) {
    return ''
  }

  const offsetMinutes = -localDate.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffsetMinutes = Math.abs(offsetMinutes)
  const offsetHours = String(Math.floor(absoluteOffsetMinutes / 60)).padStart(2, '0')
  const offsetRemainderMinutes = String(absoluteOffsetMinutes % 60).padStart(2, '0')

  return `${datePart}T${timePart}:00${sign}${offsetHours}:${offsetRemainderMinutes}`
}
