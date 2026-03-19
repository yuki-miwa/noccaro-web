import type { SystemAdminService } from './systemAdminService'
import { MockSystemAdminService } from './mockSystemAdminService'

export function createSystemAdminService(): SystemAdminService {
  return new MockSystemAdminService()
}
