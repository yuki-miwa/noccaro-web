/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import type {
  AdminJoinRequestItem,
  AdminMemberItem,
  AdminReportItem,
  JoinedSpaceSummary,
  LiveBroadcastResource,
  LiveEligibilityResource,
  LivePermissionsResource,
  LiveStreamResource,
  LiveThreadScheduleResource,
  LiveThreadResource,
  MembershipResource,
  NotificationSettingsResource,
  ProfileStateResource,
  PostResource,
  SpaceResource,
  UserResource,
  WhisperResource,
} from '../types/api'
import { createAdminService } from '../services/createAdminService'
import type {
  AdminService,
  CreateOrUpdatePostInput,
  LiveLocationInput,
  PatchMembershipInput,
  ResolveReportInput,
  UpdateLiveThreadScheduleInput,
  UpdateProfileInput,
  UpdateSpaceInput,
} from '../services/adminService'
import { ApiClientError } from '../services/httpClient'
import { MockApiError } from '../services/mockAdminApi'
import { getAppStorage } from '../utils/storage'

const SELECTED_SPACE_KEY = 'noccaro.admin.selected-space-id'
const storage = getAppStorage()

interface DashboardMetrics {
  activeMemberCount: number
  pendingMemberCount: number
  activeWhisperCount: number
  openReportCount: number
  publishedPostCount: number
}

interface AdminContextValue {
  serviceMode: 'mock' | 'real'
  ready: boolean
  authenticated: boolean
  loading: boolean
  error: string | null
  user: UserResource | null
  notificationSettings: NotificationSettingsResource | null
  profile: ProfileStateResource | null
  joinedSpaces: JoinedSpaceSummary[]
  adminSpaces: JoinedSpaceSummary[]
  selectedSpaceId: string | null
  selectedSpace: SpaceResource | null
  selectedMembership: MembershipResource | null
  liveSchedule: LiveThreadScheduleResource | null
  liveThread: LiveThreadResource | null
  liveStream: LiveStreamResource
  livePermissions: LivePermissionsResource | null
  liveEligibility: LiveEligibilityResource | null
  liveBroadcast: LiveBroadcastResource | null
  joinRequests: AdminJoinRequestItem[]
  members: AdminMemberItem[]
  posts: PostResource[]
  whispers: WhisperResource[]
  reports: AdminReportItem[]
  metrics: DashboardMetrics
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  selectSpace: (spaceId: string) => Promise<void>
  resetMock: () => Promise<void>
  updateSpaceSettings: (input: UpdateSpaceInput) => Promise<void>
  approveMembership: (membershipId: string, note?: string | null) => Promise<void>
  rejectMembership: (membershipId: string, note?: string | null) => Promise<void>
  patchMembership: (membershipId: string, input: PatchMembershipInput) => Promise<void>
  createPost: (input: CreateOrUpdatePostInput) => Promise<void>
  updatePost: (postId: string, input: CreateOrUpdatePostInput) => Promise<void>
  publishPost: (postId: string, notifyMembers: boolean) => Promise<void>
  archivePost: (postId: string) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  refreshLiveState: (location?: Partial<LiveLocationInput>) => Promise<void>
  updateLiveThreadSchedule: (input: UpdateLiveThreadScheduleInput) => Promise<void>
  startLiveThread: (location: LiveLocationInput) => Promise<void>
  closeLiveThread: () => Promise<void>
  startLiveStream: () => Promise<void>
  endLiveStream: () => Promise<void>
  resolveReport: (reportId: string, input: ResolveReportInput) => Promise<void>
  removeWhisper: (whisperId: string, reason?: string | null) => Promise<void>
  updateProfile: (input: UpdateProfileInput) => Promise<void>
}

const emptyMetrics: DashboardMetrics = {
  activeMemberCount: 0,
  pendingMemberCount: 0,
  activeWhisperCount: 0,
  openReportCount: 0,
  publishedPostCount: 0,
}

const idleLiveStream: LiveStreamResource = {
  id: null,
  liveThreadId: null,
  spaceId: null,
  status: 'idle',
  isLive: false,
  playbackUrl: null,
  startedAt: null,
  endedAt: null,
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

const localizedErrorMessages: Record<string, string> = {
  UNAUTHENTICATED: 'ログイン情報を確認してください。',
  FORBIDDEN: 'この操作を行う権限がありません。',
  RESOURCE_NOT_FOUND: '対象データが見つかりません。',
  EMAIL_ALREADY_TAKEN: 'このメールアドレスはすでに使われています。',
  CURRENT_PASSWORD_INVALID: '現在のパスワードが正しくありません。',
  user_not_found: 'ユーザーが見つかりません。',
  space_not_found: 'スペースが見つかりません。',
  membership_not_found: 'メンバーシップが見つかりません。',
  post_not_found: '投稿が見つかりません。',
  whisper_not_found: 'Whisper が見つかりません。',
  report_not_found: '通報が見つかりません。',
  owner_limit_reached: 'オーナー上限に達しています。',
  invalid_membership_state: '現在の状態ではこの操作を実行できません。',
  invalid_role_transition: 'この権限変更は許可されていません。',
  duplicate_report: '同じ対象への重複通報はできません。',
  cross_space_operation: '別スペースのデータは操作できません。',
  forbidden_target: 'この対象には操作できません。',
  membership_inactive: '現在のメンバー状態では操作できません。',
  LIVE_THREAD_SCHEDULE_NOT_FOUND: 'ライブスレッド開始条件がまだ設定されていません。',
  LIVE_THREAD_WINDOW_NOT_OPEN: '開始可能時間前のため、まだライブスレッドを開始できません。',
  LIVE_THREAD_WINDOW_EXPIRED: '開始可能時間を過ぎたため、ライブスレッドを開始できません。',
  LIVE_THREAD_OUT_OF_AREA: '開始エリア外にいるため、ライブスレッドを開始できません。',
  LIVE_THREAD_ALREADY_ACTIVE: 'ライブスレッドはすでに開始されています。',
  LIVE_THREAD_NOT_ACTIVE: '現在アクティブなライブスレッドがありません。',
  LIVE_STREAM_UNAVAILABLE: 'ライブ配信の開始条件を満たしていません。',
  LIVE_CHAT_UNAVAILABLE: 'ライブチャットは現在利用できません。',
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof MockApiError) {
    return localizedErrorMessages[error.code] ?? `${error.code}: ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return '不明なエラーが発生しました。'
}

export function AdminProvider({ children }: PropsWithChildren) {
  const serviceRef = useRef<AdminService>(createAdminService())
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UserResource | null>(null)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsResource | null>(null)
  const [profile, setProfile] = useState<ProfileStateResource | null>(null)
  const [joinedSpaces, setJoinedSpaces] = useState<JoinedSpaceSummary[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<SpaceResource | null>(null)
  const [selectedMembership, setSelectedMembership] = useState<MembershipResource | null>(null)
  const [liveSchedule, setLiveSchedule] = useState<LiveThreadScheduleResource | null>(null)
  const [liveThread, setLiveThread] = useState<LiveThreadResource | null>(null)
  const [liveStream, setLiveStream] = useState<LiveStreamResource>(idleLiveStream)
  const [livePermissions, setLivePermissions] = useState<LivePermissionsResource | null>(null)
  const [liveEligibility, setLiveEligibility] = useState<LiveEligibilityResource | null>(null)
  const [liveBroadcast, setLiveBroadcast] = useState<LiveBroadcastResource | null>(null)
  const [joinRequests, setJoinRequests] = useState<AdminJoinRequestItem[]>([])
  const [members, setMembers] = useState<AdminMemberItem[]>([])
  const [posts, setPosts] = useState<PostResource[]>([])
  const [whispers, setWhispers] = useState<WhisperResource[]>([])
  const [reports, setReports] = useState<AdminReportItem[]>([])

  const adminSpaces = useMemo(
    () =>
      joinedSpaces.filter(
        (item) =>
          item.membership.status === 'active' &&
          (item.membership.role === 'owner' || item.membership.role === 'primary_owner'),
      ),
    [joinedSpaces],
  )

  const metrics = useMemo<DashboardMetrics>(
    () => ({
      activeMemberCount: members.filter((item) => item.membership.status === 'active').length,
      pendingMemberCount: joinRequests.length,
      activeWhisperCount: whispers.length,
      openReportCount: reports.filter((item) => item.report.status === 'open').length,
      publishedPostCount: posts.filter((item) => item.status === 'published').length,
    }),
    [joinRequests.length, members, posts, reports, whispers.length],
  )

  const clearSpaceState = useCallback(() => {
    setSelectedSpace(null)
    setSelectedMembership(null)
    setLiveSchedule(null)
    setLiveThread(null)
    setLiveStream(idleLiveStream)
    setLivePermissions(null)
    setLiveEligibility(null)
    setLiveBroadcast(null)
    setJoinRequests([])
    setMembers([])
    setPosts([])
    setWhispers([])
    setReports([])
  }, [])

  const loadAdminData = useCallback(async (spaceId: string) => {
    const service = serviceRef.current
    const [spaceDetail, liveState, joinRequestItems, memberList, postList, whisperList, reportList] = await Promise.all([
      service.getAdminSpace(spaceId),
      service.getLiveThread(spaceId),
      service.getJoinRequests(spaceId),
      service.getMembers(spaceId, { limit: 100 }),
      service.getAdminPosts(spaceId),
      service.getWhispers(spaceId, { limit: 100 }),
      service.getReports(spaceId, { limit: 100 }),
    ])

    setSelectedSpace(spaceDetail.space)
    setSelectedMembership(spaceDetail.membership)
    setLiveSchedule(liveState.scheduledThread)
    setLiveThread(liveState.liveThread)
    setLiveStream(liveState.liveStream)
    setLivePermissions(liveState.permissions)
    setLiveEligibility(liveState.eligibility)
    setJoinRequests(joinRequestItems)
    setMembers(memberList.data)
    setPosts(postList.data)
    setWhispers(whisperList.data)
    setReports(reportList.data)
  }, [])

  const bootstrap = useCallback(async (requestedSpaceId?: string | null) => {
    const service = serviceRef.current
    setLoading(true)
    setError(null)

    try {
      if (!service.hasStoredSession()) {
        setUser(null)
        setNotificationSettings(null)
        setProfile(null)
        setJoinedSpaces([])
        setSelectedSpaceId(null)
        clearSpaceState()
        setReady(true)
        return
      }

      const [meResult, joinedSpaceResult, nextNotificationSettings] = await Promise.all([
        service.getMe(),
        service.getJoinedSpaces(),
        service.getNotificationSettings(),
      ])

      setUser(meResult.user)
      setNotificationSettings(nextNotificationSettings)
      setProfile(meResult.profile)
      setJoinedSpaces(joinedSpaceResult.joinedSpaces)

      const adminEligibleSpaces = joinedSpaceResult.joinedSpaces.filter(
        (item) =>
          item.membership.status === 'active' &&
          (item.membership.role === 'owner' || item.membership.role === 'primary_owner'),
      )

      const preferredSpaceId =
        requestedSpaceId ??
        storage.getItem(SELECTED_SPACE_KEY) ??
        adminEligibleSpaces[0]?.space.id ??
        joinedSpaceResult.joinedSpaces[0]?.space.id ??
        null

      setSelectedSpaceId(preferredSpaceId)

      if (!preferredSpaceId || !adminEligibleSpaces.some((item) => item.space.id === preferredSpaceId)) {
        clearSpaceState()
        setReady(true)
        return
      }

      storage.setItem(SELECTED_SPACE_KEY, preferredSpaceId)
      await loadAdminData(preferredSpaceId)
      setReady(true)
    } catch (caughtError) {
      setError(normalizeError(caughtError))
      setProfile(null)
      clearSpaceState()
      setReady(true)
    } finally {
      setLoading(false)
    }
  }, [clearSpaceState, loadAdminData])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const runAction = async (task: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    try {
      await task()
    } catch (caughtError) {
      setError(normalizeError(caughtError))
    } finally {
      setLoading(false)
    }
  }

  const value = useMemo<AdminContextValue>(
    () => ({
      serviceMode: serviceRef.current.mode,
      ready,
      authenticated: Boolean(user),
      loading,
      error,
      user,
      notificationSettings,
      profile,
      joinedSpaces,
      adminSpaces,
      selectedSpaceId,
      selectedSpace,
      selectedMembership,
      liveSchedule,
      liveThread,
      liveStream,
      livePermissions,
      liveEligibility,
      liveBroadcast,
      joinRequests,
      members,
      posts,
      whispers,
      reports,
      metrics: metrics ?? emptyMetrics,
      login: async (email, password) => {
        await runAction(async () => {
          await serviceRef.current.login({ email, password })
          await bootstrap()
        })
      },
      logout: async () => {
        await runAction(async () => {
          await serviceRef.current.logout()
          storage.removeItem(SELECTED_SPACE_KEY)
          setUser(null)
          setNotificationSettings(null)
          setProfile(null)
          setJoinedSpaces([])
          setSelectedSpaceId(null)
          clearSpaceState()
        })
      },
      refresh: async () => {
        await bootstrap(selectedSpaceId)
      },
      selectSpace: async (spaceId) => {
        await runAction(async () => {
          storage.setItem(SELECTED_SPACE_KEY, spaceId)
          setSelectedSpaceId(spaceId)
          await bootstrap(spaceId)
        })
      },
      resetMock: async () => {
        await runAction(async () => {
          if (serviceRef.current.resetMock) {
            await serviceRef.current.resetMock()
            await bootstrap(selectedSpaceId)
          }
        })
      },
      updateSpaceSettings: async (input) => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          await serviceRef.current.updateAdminSpace(selectedSpaceId, input)
          await bootstrap(selectedSpaceId)
        })
      },
      approveMembership: async (membershipId, note) => {
        await runAction(async () => {
          await serviceRef.current.approveMembership(membershipId, note)
          await bootstrap(selectedSpaceId)
        })
      },
      rejectMembership: async (membershipId, note) => {
        await runAction(async () => {
          await serviceRef.current.rejectMembership(membershipId, note)
          await bootstrap(selectedSpaceId)
        })
      },
      patchMembership: async (membershipId, input) => {
        await runAction(async () => {
          await serviceRef.current.patchMembership(membershipId, input)
          await bootstrap(selectedSpaceId)
        })
      },
      createPost: async (input) => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          await serviceRef.current.createAdminPost(selectedSpaceId, input)
          await bootstrap(selectedSpaceId)
        })
      },
      updatePost: async (postId, input) => {
        await runAction(async () => {
          await serviceRef.current.updateAdminPost(postId, input)
          await bootstrap(selectedSpaceId)
        })
      },
      publishPost: async (postId, notifyMembers) => {
        await runAction(async () => {
          await serviceRef.current.publishAdminPost(postId, notifyMembers)
          await bootstrap(selectedSpaceId)
        })
      },
      archivePost: async (postId) => {
        await runAction(async () => {
          await serviceRef.current.archiveAdminPost(postId)
          await bootstrap(selectedSpaceId)
        })
      },
      deletePost: async (postId) => {
        await runAction(async () => {
          await serviceRef.current.deleteAdminPost(postId)
          await bootstrap(selectedSpaceId)
        })
      },
      refreshLiveState: async (location) => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          const result = await serviceRef.current.getLiveThread(selectedSpaceId, location)
          setLiveSchedule(result.scheduledThread)
          setLiveThread(result.liveThread)
          setLiveStream(result.liveStream)
          setLivePermissions(result.permissions)
          setLiveEligibility(result.eligibility)
        })
      },
      updateLiveThreadSchedule: async (input) => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          const result = await serviceRef.current.updateLiveThreadSchedule(selectedSpaceId, input)
          setLiveSchedule(result.scheduledThread)
          setLiveThread(result.liveThread)
          setLiveStream(result.liveStream)
          setLivePermissions(result.permissions)
          setLiveEligibility(result.eligibility)
        })
      },
      startLiveThread: async (location) => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          const result = await serviceRef.current.startLiveThread(selectedSpaceId, location)
          setLiveSchedule(result.scheduledThread)
          setLiveThread(result.liveThread)
          setLiveStream(result.liveStream)
          setLivePermissions(result.permissions)
          setLiveEligibility(result.eligibility)
        })
      },
      closeLiveThread: async () => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          const result = await serviceRef.current.closeLiveThread(selectedSpaceId)
          setLiveSchedule(result.scheduledThread)
          setLiveThread(result.liveThread)
          setLiveStream(result.liveStream)
          setLivePermissions(result.permissions)
          setLiveEligibility(result.eligibility)
          setLiveBroadcast(null)
        })
      },
      startLiveStream: async () => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          const result = await serviceRef.current.startLiveStream(selectedSpaceId)
          setLiveSchedule(result.scheduledThread)
          setLiveThread(result.liveThread)
          setLiveStream(result.liveStream)
          setLivePermissions(result.permissions)
          setLiveEligibility(result.eligibility)
          setLiveBroadcast(result.broadcast)
        })
      },
      endLiveStream: async () => {
        if (!selectedSpaceId) {
          return
        }
        await runAction(async () => {
          const result = await serviceRef.current.endLiveStream(selectedSpaceId)
          setLiveSchedule(result.scheduledThread)
          setLiveThread(result.liveThread)
          setLiveStream(result.liveStream)
          setLivePermissions(result.permissions)
          setLiveEligibility(result.eligibility)
          setLiveBroadcast(null)
        })
      },
      resolveReport: async (reportId, input) => {
        await runAction(async () => {
          await serviceRef.current.resolveReport(reportId, input)
          await bootstrap(selectedSpaceId)
        })
      },
      removeWhisper: async (whisperId, reason) => {
        await runAction(async () => {
          await serviceRef.current.removeWhisper(whisperId, reason)
          await bootstrap(selectedSpaceId)
        })
      },
      updateProfile: async (input) => {
        setLoading(true)
        setError(null)
        try {
          const result = await serviceRef.current.updateProfile(input)
          setUser(result.user)
          setProfile({
            pendingEmail: result.profileUpdate.pendingEmail,
          })
        } catch (caughtError) {
          setError(normalizeError(caughtError))
          throw caughtError
        } finally {
          setLoading(false)
        }
      },
    }),
    [
      adminSpaces,
      bootstrap,
      clearSpaceState,
      error,
      joinRequests,
      joinedSpaces,
      loading,
      metrics,
      members,
      livePermissions,
      liveEligibility,
      liveSchedule,
      liveBroadcast,
      liveStream,
      liveThread,
      notificationSettings,
      posts,
      profile,
      ready,
      reports,
      selectedMembership,
      selectedSpace,
      selectedSpaceId,
      user,
      whispers,
    ],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdminContext(): AdminContextValue {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdminContext must be used inside AdminProvider')
  }
  return context
}
