import type { ApiErrorEnvelope } from '../types/api'

export class ApiClientError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    searchParams.set(key, String(value))
  })

  const encoded = searchParams.toString()
  return encoded ? `?${encoded}` : ''
}

export class HttpClient {
  private readonly baseUrl: string
  private readonly getToken: () => string | null

  constructor(baseUrl: string, getToken: () => string | null) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.getToken = getToken
  }

  buildPath(path: string, query?: Record<string, string | number | null | undefined>): string {
    return `${this.baseUrl}${path}${query ? buildQuery(query) : ''}`
  }

  async request<T>(path: string, init?: RequestInit, query?: Record<string, string | number | null | undefined>): Promise<T> {
    const token = this.getToken()
    const headers = new Headers(init?.headers)

    headers.set('Accept', 'application/json')
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(this.buildPath(path, query), {
      ...init,
      headers,
    })

    if (response.status === 204) {
      return undefined as T
    }

    const payload = (await response.json()) as T | ApiErrorEnvelope
    if (!response.ok) {
      const errorPayload = payload as ApiErrorEnvelope
      throw new ApiClientError(
        errorPayload.error?.code ?? 'UNKNOWN_ERROR',
        errorPayload.error?.message ?? 'Request failed.',
        response.status,
        errorPayload.error?.details,
      )
    }

    return payload as T
  }
}
