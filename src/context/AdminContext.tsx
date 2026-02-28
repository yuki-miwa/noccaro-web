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
import { MockAdminApi, MockApiError } from '../services/mockAdminApi'
import type { AdminSnapshot, DashboardMetrics } from '../types/domain'

interface SpaceSettingsInput {
  joinPolicy?: 'auto_approve' | 'approval_required'
  maxOwnerCount?: number
  locationGridMeters?: number
  whisperTtlMinutes?: number
  whisperRateLimitPerMinute?: number
  whisperRateLimitPer10Min?: number
}

interface CreatePostInput {
  title: string
  body: string
  notifyMembers: boolean
  publishNow: boolean
}

interface SuspendInput {
  membershipId: number
  hours: number
  reason: string
}

interface MuteInput {
  membershipId: number
  hours: number
  reason: string
}

interface ResolveReportInput {
  reportId: number
  status: 'resolved' | 'rejected'
  resolutionType: 'no_action' | 'content_removed' | 'mute' | 'kick' | 'suspend' | 'ban' | null
  note: string
}

interface CreateReportInput {
  reporterMembershipId: number
  targetType: 'whisper' | 'post' | 'member'
  targetId: number
  reasonType: 'spam' | 'harassment' | 'privacy_risk' | 'inappropriate' | 'other'
  detail: string
}

interface AdminContextValue {
  snapshot: AdminSnapshot | null
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  lastActionAt: string | null
  refresh: () => Promise<void>
  reset: () => Promise<void>
  updateSpaceSettings: (input: SpaceSettingsInput) => Promise<void>
  approveMembership: (membershipId: number, reason?: string) => Promise<void>
  rejectMembership: (membershipId: number, reason?: string) => Promise<void>
  grantOwner: (membershipId: number, reason?: string) => Promise<void>
  revokeOwner: (membershipId: number, reason?: string) => Promise<void>
  transferPrimaryOwner: (membershipId: number, reason?: string) => Promise<void>
  muteMember: (input: MuteInput) => Promise<void>
  unmuteMember: (membershipId: number, reason?: string) => Promise<void>
  kickMember: (membershipId: number, reason?: string) => Promise<void>
  suspendMember: (input: SuspendInput) => Promise<void>
  unsuspendMember: (membershipId: number, reason?: string) => Promise<void>
  banMember: (membershipId: number, reason?: string) => Promise<void>
  unbanMember: (membershipId: number, reason?: string) => Promise<void>
  createPost: (input: CreatePostInput) => Promise<void>
  removeWhisper: (whisperId: number, reason?: string) => Promise<void>
  expireWhispers: () => Promise<void>
  resolveReport: (input: ResolveReportInput) => Promise<void>
  createReport: (input: CreateReportInput) => Promise<void>
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined)

export function AdminProvider({ children }: PropsWithChildren) {
  const apiRef = useRef<MockAdminApi>(new MockAdminApi())
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastActionAt, setLastActionAt] = useState<string | null>(null)

  const sync = useCallback(async () => {
    const [nextSnapshot, nextMetrics] = await Promise.all([
      apiRef.current.getSnapshot(),
      apiRef.current.getDashboardMetrics(),
    ])
    setSnapshot(nextSnapshot)
    setMetrics(nextMetrics)
  }, [])

  const runAction = useCallback(async (action: () => Promise<unknown>) => {
    setLoading(true)
    setError(null)
    try {
      await action()
      await sync()
      setLastActionAt(new Date().toISOString())
    } catch (caughtError) {
      if (caughtError instanceof MockApiError) {
        setError(`${caughtError.code}: ${caughtError.message}`)
      } else if (caughtError instanceof Error) {
        setError(caughtError.message)
      } else {
        setError('Unknown error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }, [sync])

  const refresh = useCallback(async () => {
    await runAction(async () => {
      await Promise.resolve()
    })
  }, [runAction])

  const reset = useCallback(async () => {
    await runAction(async () => {
      await apiRef.current.reset()
    })
  }, [runAction])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AdminContextValue>(
    () => ({
      snapshot,
      metrics,
      loading,
      error,
      lastActionAt,
      refresh,
      reset,
      updateSpaceSettings: async (input) =>
        runAction(async () => {
          await apiRef.current.updateSpaceSettings(input)
        }),
      approveMembership: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.approveMembership(membershipId, reason)
        }),
      rejectMembership: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.rejectMembership(membershipId, reason)
        }),
      grantOwner: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.grantOwner(membershipId, reason)
        }),
      revokeOwner: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.revokeOwner(membershipId, reason)
        }),
      transferPrimaryOwner: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.transferPrimaryOwner(membershipId, reason)
        }),
      muteMember: async (input) =>
        runAction(async () => {
          await apiRef.current.muteMember(input)
        }),
      unmuteMember: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.unmuteMember(membershipId, reason)
        }),
      kickMember: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.kickMember(membershipId, reason)
        }),
      suspendMember: async (input) =>
        runAction(async () => {
          await apiRef.current.suspendMember(input)
        }),
      unsuspendMember: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.unsuspendMember(membershipId, reason)
        }),
      banMember: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.banMember(membershipId, reason)
        }),
      unbanMember: async (membershipId, reason) =>
        runAction(async () => {
          await apiRef.current.unbanMember(membershipId, reason)
        }),
      createPost: async (input) =>
        runAction(async () => {
          await apiRef.current.createPost(input)
        }),
      removeWhisper: async (whisperId, reason) =>
        runAction(async () => {
          await apiRef.current.removeWhisper(whisperId, reason)
        }),
      expireWhispers: async () =>
        runAction(async () => {
          await apiRef.current.expireWhispers()
        }),
      resolveReport: async (input) =>
        runAction(async () => {
          await apiRef.current.resolveReport(input)
        }),
      createReport: async (input) =>
        runAction(async () => {
          await apiRef.current.createReport(input)
        }),
    }),
    [error, lastActionAt, loading, metrics, refresh, reset, runAction, snapshot],
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
