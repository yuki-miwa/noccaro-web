import type { AdminService } from './adminService'
import { HttpAdminService } from './httpAdminService'
import { MockAdminService } from './mockAdminService'

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

export function createAdminService(): AdminService {
  const mode = import.meta.env.VITE_API_MODE
  const baseUrl = resolveBaseUrl()

  if (mode === 'mock') {
    return new MockAdminService()
  }

  if (baseUrl) {
    return new HttpAdminService(baseUrl)
  }

  if (mode === 'real') {
    throw new Error('VITE_API_BASE_URL is required when VITE_API_MODE=real.')
  }

  return new MockAdminService()
}
