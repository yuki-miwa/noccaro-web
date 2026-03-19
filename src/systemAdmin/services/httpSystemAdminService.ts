import type { ApiListResponse, ApiListMeta, ApiResponse } from '../../types/api'
import { HttpClient } from '../../services/httpClient'
import { getAppStorage } from '../../utils/storage'
import type {
  SystemAdminAuthResult,
  SystemAdminMeResult,
  SystemAuditLog,
  SystemDashboardMetrics,
  SystemReportSummary,
  SystemSpaceResource,
  SystemSpaceSummary,
  SystemUserSummary,
} from '../types'
import type {
  AssignPrimaryOwnerInput,
  CreateSystemSpaceInput,
  PatchSystemSpaceInput,
  PatchSystemUserInput,
  ResolveSystemReportInput,
  SystemAdminLoginInput,
  SystemAdminService,
  SystemReportListQuery,
  SystemSpaceListQuery,
  SystemUserListQuery,
} from './systemAdminService'

const TOKEN_KEY = 'noccaro.system-admin.token'
const storage = getAppStorage()

export class HttpSystemAdminService implements SystemAdminService {
  readonly mode = 'real' as const

  private token: string | null
  private readonly client: HttpClient

  constructor(baseUrl: string) {
    this.token = storage.getItem(TOKEN_KEY)
    this.client = new HttpClient(baseUrl, () => this.token)
  }

  hasStoredSession(): boolean {
    return Boolean(this.token)
  }

  async login(input: SystemAdminLoginInput): Promise<SystemAdminAuthResult> {
    const response = await this.client.request<ApiResponse<SystemAdminAuthResult>>('/api/v1/system-admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })

    this.token = response.data.token
    storage.setItem(TOKEN_KEY, response.data.token)
    return response.data
  }

  async logout(): Promise<void> {
    if (this.token) {
      await this.client.request<void>('/api/v1/system-admin/auth/logout', { method: 'POST' })
    }
    this.token = null
    storage.removeItem(TOKEN_KEY)
  }

  async getMe(): Promise<SystemAdminMeResult> {
    const response = await this.client.request<ApiResponse<SystemAdminMeResult>>('/api/v1/system-admin/me')
    return response.data
  }

  async getDashboard(): Promise<SystemDashboardMetrics> {
    const response = await this.client.request<ApiResponse<SystemDashboardMetrics>>('/api/v1/system-admin/dashboard')
    return response.data
  }

  async getSpaces(query?: SystemSpaceListQuery): Promise<{ data: SystemSpaceSummary[]; meta: ApiListMeta }> {
    return this.client.request<ApiListResponse<SystemSpaceSummary>>(
      '/api/v1/system-admin/spaces',
      undefined,
      query as Record<string, string | number | null | undefined> | undefined,
    )
  }

  async createSpace(input: CreateSystemSpaceInput): Promise<SystemSpaceSummary> {
    const response = await this.client.request<ApiResponse<SystemSpaceSummary>>('/api/v1/system-admin/spaces', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return response.data
  }

  async patchSpace(spaceId: string, input: PatchSystemSpaceInput): Promise<SystemSpaceResource> {
    const response = await this.client.request<ApiResponse<SystemSpaceResource>>(`/api/v1/system-admin/spaces/${spaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return response.data
  }

  async assignPrimaryOwner(spaceId: string, input: AssignPrimaryOwnerInput): Promise<SystemSpaceSummary> {
    const response = await this.client.request<ApiResponse<SystemSpaceSummary>>(
      `/api/v1/system-admin/spaces/${spaceId}/primary-owner`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
    return response.data
  }

  async getUsers(query?: SystemUserListQuery): Promise<{ data: SystemUserSummary[]; meta: ApiListMeta }> {
    return this.client.request<ApiListResponse<SystemUserSummary>>(
      '/api/v1/system-admin/users',
      undefined,
      query as Record<string, string | number | null | undefined> | undefined,
    )
  }

  async patchUser(userId: string, input: PatchSystemUserInput): Promise<SystemUserSummary> {
    const response = await this.client.request<ApiResponse<SystemUserSummary>>(`/api/v1/system-admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return response.data
  }

  async getReports(query?: SystemReportListQuery): Promise<{ data: SystemReportSummary[]; meta: ApiListMeta }> {
    return this.client.request<ApiListResponse<SystemReportSummary>>(
      '/api/v1/system-admin/reports',
      undefined,
      query as Record<string, string | number | null | undefined> | undefined,
    )
  }

  async resolveReport(reportId: string, input: ResolveSystemReportInput): Promise<SystemReportSummary> {
    const response = await this.client.request<ApiResponse<SystemReportSummary>>(
      `/api/v1/system-admin/reports/${reportId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
    return response.data
  }

  async getAuditLogs(): Promise<{ data: SystemAuditLog[]; meta: ApiListMeta }> {
    return this.client.request<ApiListResponse<SystemAuditLog>>('/api/v1/system-admin/audit-logs')
  }
}
