import type { AdminService } from './adminService'
import { HttpAdminService } from './httpAdminService'
import { MockAdminService } from './mockAdminService'

export function createAdminService(): AdminService {
  const mode = import.meta.env.VITE_API_MODE
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (mode === 'real' || (mode !== 'mock' && baseUrl)) {
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL is required when VITE_API_MODE=real.')
    }
    return new HttpAdminService(baseUrl)
  }

  return new MockAdminService()
}
