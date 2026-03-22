import type {
  AdminJoinRequestItem,
  AdminMemberItem,
  AdminReportItem,
  ApiListMeta,
  ApiListResponse,
  ApiResponse,
  AuthResult,
  JoinedSpacesResult,
  MeResult,
  MembershipResource,
  NotificationSettingsResource,
  ProfileUpdateResult,
  PostResource,
  ReportResource,
  SpaceDetailResult,
  WhisperResource,
} from '../types/api'
import type {
  AdminService,
  CreateOrUpdatePostInput,
  LoginInput,
  MemberListQuery,
  PatchMembershipInput,
  ReportListQuery,
  ResolveReportInput,
  UpdateProfileInput,
  UpdateSpaceInput,
  WhisperListQuery,
} from './adminService'
import { HttpClient } from './httpClient'
import { getAppStorage } from '../utils/storage'

const TOKEN_KEY = 'noccaro.admin.token'
const storage = getAppStorage()

export class HttpAdminService implements AdminService {
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

  async login(input: LoginInput): Promise<AuthResult> {
    const response = await this.client.request<ApiResponse<AuthResult>>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })

    this.token = response.data.token
    storage.setItem(TOKEN_KEY, response.data.token)
    return response.data
  }

  async logout(): Promise<void> {
    if (this.token) {
      await this.client.request<void>('/api/v1/auth/logout', { method: 'POST' })
    }
    this.token = null
    storage.removeItem(TOKEN_KEY)
  }

  async getMe(): Promise<MeResult> {
    const response = await this.client.request<ApiResponse<MeResult>>('/api/v1/me')
    return response.data
  }

  async updateProfile(input: UpdateProfileInput): Promise<ProfileUpdateResult> {
    const response = await this.client.request<ApiResponse<ProfileUpdateResult>>('/api/v1/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return response.data
  }

  async getJoinedSpaces(): Promise<JoinedSpacesResult> {
    const response = await this.client.request<ApiResponse<JoinedSpacesResult>>('/api/v1/spaces/joined')
    return response.data
  }

  async getAdminSpace(spaceId: string): Promise<SpaceDetailResult> {
    const response = await this.client.request<ApiResponse<SpaceDetailResult>>(`/api/v1/admin/spaces/${spaceId}`)
    return response.data
  }

  async updateAdminSpace(spaceId: string, input: UpdateSpaceInput): Promise<SpaceDetailResult> {
    const response = await this.client.request<ApiResponse<SpaceDetailResult>>(`/api/v1/admin/spaces/${spaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return response.data
  }

  async getJoinRequests(spaceId: string): Promise<AdminJoinRequestItem[]> {
    const response = await this.client.request<ApiResponse<AdminJoinRequestItem[]>>(
      `/api/v1/admin/spaces/${spaceId}/join-requests`,
    )
    return response.data
  }

  async approveMembership(membershipId: string, note?: string | null): Promise<MembershipResource> {
    const response = await this.client.request<ApiResponse<{ membership: MembershipResource }>>(
      `/api/v1/admin/memberships/${membershipId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ note: note ?? null }),
      },
    )
    return response.data.membership
  }

  async rejectMembership(membershipId: string, note?: string | null): Promise<MembershipResource> {
    const response = await this.client.request<ApiResponse<{ membership: MembershipResource }>>(
      `/api/v1/admin/memberships/${membershipId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ note: note ?? null }),
      },
    )
    return response.data.membership
  }

  async getMembers(spaceId: string, query?: MemberListQuery): Promise<{ data: AdminMemberItem[]; meta: ApiListMeta }> {
    return this.client.request<ApiListResponse<AdminMemberItem>>(
      `/api/v1/admin/spaces/${spaceId}/members`,
      undefined,
      query as Record<string, string | number | null | undefined> | undefined,
    )
  }

  async patchMembership(membershipId: string, input: PatchMembershipInput): Promise<MembershipResource> {
    const response = await this.client.request<ApiResponse<{ membership: MembershipResource }>>(
      `/api/v1/admin/memberships/${membershipId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    )
    return response.data.membership
  }

  async getAdminPosts(spaceId: string): Promise<{ data: PostResource[]; meta: ApiListMeta }> {
    return this.client.request<ApiListResponse<PostResource>>(`/api/v1/admin/spaces/${spaceId}/posts`)
  }

  async createAdminPost(spaceId: string, input: CreateOrUpdatePostInput): Promise<PostResource> {
    const response = await this.client.request<ApiResponse<{ post: PostResource }>>(
      `/api/v1/admin/spaces/${spaceId}/posts`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
    return response.data.post
  }

  async updateAdminPost(postId: string, input: CreateOrUpdatePostInput): Promise<PostResource> {
    const response = await this.client.request<ApiResponse<{ post: PostResource }>>(`/api/v1/admin/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    return response.data.post
  }

  async publishAdminPost(postId: string, notifyMembers: boolean): Promise<PostResource> {
    const response = await this.client.request<ApiResponse<{ post: PostResource }>>(
      `/api/v1/admin/posts/${postId}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({ notifyMembers }),
      },
    )
    return response.data.post
  }

  async archiveAdminPost(postId: string): Promise<PostResource> {
    const response = await this.client.request<ApiResponse<{ post: PostResource }>>(
      `/api/v1/admin/posts/${postId}/archive`,
      {
        method: 'POST',
      },
    )
    return response.data.post
  }

  async deleteAdminPost(postId: string): Promise<void> {
    await this.client.request<void>(`/api/v1/admin/posts/${postId}`, { method: 'DELETE' })
  }

  async getWhispers(
    spaceId: string,
    query?: WhisperListQuery,
  ): Promise<{ data: WhisperResource[]; meta: Record<string, string | null> }> {
    return this.client.request<ApiListResponse<WhisperResource, Record<string, string | null>>>(
      `/api/v1/spaces/${spaceId}/whispers`,
      undefined,
      query as Record<string, string | number | null | undefined> | undefined,
    )
  }

  async getReports(spaceId: string, query?: ReportListQuery): Promise<{ data: AdminReportItem[]; meta: ApiListMeta }> {
    return this.client.request<ApiListResponse<AdminReportItem>>(
      `/api/v1/admin/spaces/${spaceId}/reports`,
      undefined,
      query as Record<string, string | number | null | undefined> | undefined,
    )
  }

  async resolveReport(reportId: string, input: ResolveReportInput): Promise<ReportResource> {
    const response = await this.client.request<ApiResponse<{ report: ReportResource }>>(
      `/api/v1/admin/reports/${reportId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({
          resolutionType: input.resolutionType,
          note: input.note ?? null,
        }),
      },
    )
    return response.data.report
  }

  async removeWhisper(whisperId: string, reason?: string | null): Promise<WhisperResource> {
    const response = await this.client.request<ApiResponse<{ whisper: WhisperResource }>>(
      `/api/v1/admin/whispers/${whisperId}/remove`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason ?? null }),
      },
    )
    return response.data.whisper
  }

  async getNotificationSettings(): Promise<NotificationSettingsResource> {
    const response = await this.client.request<ApiResponse<NotificationSettingsResource>>(
      '/api/v1/me/notification-settings',
    )
    return response.data
  }
}
