import type { SystemAdminService } from './systemAdminService'
import { HttpSystemAdminService } from './httpSystemAdminService'
import { MockSystemAdminService } from './mockSystemAdminService'

export function createSystemAdminService(): SystemAdminService {
  const mode = import.meta.env.VITE_API_MODE
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (mode === 'real' || (mode !== 'mock' && baseUrl)) {
    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL is required when VITE_API_MODE=real.')
    }
    return new HttpSystemAdminService(baseUrl)
  }

  return new MockSystemAdminService()
}
