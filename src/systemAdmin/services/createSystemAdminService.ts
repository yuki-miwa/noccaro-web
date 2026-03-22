import type { SystemAdminService } from './systemAdminService'
import { HttpSystemAdminService } from './httpSystemAdminService'
import { MockSystemAdminService } from './mockSystemAdminService'

function resolveBaseUrl(): string | null {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl
  }

  if (typeof window === 'undefined') {
    return null
  }

  const hostname = window.location.hostname
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  return isLocalHost ? null : window.location.origin
}

export function createSystemAdminService(): SystemAdminService {
  const mode = import.meta.env.VITE_API_MODE
  const baseUrl = resolveBaseUrl()

  if (mode === 'mock') {
    return new MockSystemAdminService()
  }

  if (baseUrl) {
    return new HttpSystemAdminService(baseUrl)
  }

  if (mode === 'real') {
    throw new Error('VITE_API_BASE_URL is required when VITE_API_MODE=real.')
  }

  return new MockSystemAdminService()
}
