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
  SystemAdminUser,
  SystemAuditLog,
  SystemDashboardMetrics,
  SystemReportSummary,
  SystemSpaceSummary,
  SystemUserSummary,
} from '../types'
import { createSystemAdminService } from '../services/createSystemAdminService'
import type {
  AssignPrimaryOwnerInput,
  CreateSystemSpaceInput,
  PatchSystemSpaceInput,
  PatchSystemUserInput,
  ResolveSystemReportInput,
  SystemAdminService,
} from '../services/systemAdminService'
import { ApiClientError } from '../../services/httpClient'
import { SystemAdminApiError } from '../services/mockSystemAdminService'

interface SystemAdminContextValue {
  serviceMode: 'mock' | 'real'
  ready: boolean
  authenticated: boolean
  loading: boolean
  error: string | null
  user: SystemAdminUser | null
  dashboard: SystemDashboardMetrics | null
  spaces: SystemSpaceSummary[]
  users: SystemUserSummary[]
  reports: SystemReportSummary[]
  auditLogs: SystemAuditLog[]
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  createSpace: (input: CreateSystemSpaceInput) => Promise<void>
  updateSpace: (spaceId: string, input: PatchSystemSpaceInput) => Promise<void>
  assignPrimaryOwner: (spaceId: string, input: AssignPrimaryOwnerInput) => Promise<void>
  updateUser: (userId: string, input: PatchSystemUserInput) => Promise<void>
  resolveReport: (reportId: string, input: ResolveSystemReportInput) => Promise<void>
  resetMock: () => Promise<void>
}

const SystemAdminContext = createContext<SystemAdminContextValue | undefined>(undefined)

function normalizeError(error: unknown): string {
  if (error instanceof SystemAdminApiError) {
    return error.message
  }
  if (error instanceof ApiClientError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '不明なエラーが発生しました。'
}

export function SystemAdminProvider({ children }: PropsWithChildren) {
  const serviceRef = useRef<SystemAdminService>(createSystemAdminService())
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<SystemAdminUser | null>(null)
  const [dashboard, setDashboard] = useState<SystemDashboardMetrics | null>(null)
  const [spaces, setSpaces] = useState<SystemSpaceSummary[]>([])
  const [users, setUsers] = useState<SystemUserSummary[]>([])
  const [reports, setReports] = useState<SystemReportSummary[]>([])
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([])

  const clearState = useCallback(() => {
    setUser(null)
    setDashboard(null)
    setSpaces([])
    setUsers([])
    setReports([])
    setAuditLogs([])
  }, [])

  const bootstrap = useCallback(async () => {
    const service = serviceRef.current
    setLoading(true)
    setError(null)

    try {
      if (!service.hasStoredSession()) {
        clearState()
        setReady(true)
        return
      }

      const [meResult, dashboardResult, spaceResult, userResult, reportResult, auditResult] = await Promise.all([
        service.getMe(),
        service.getDashboard(),
        service.getSpaces({ limit: 100 }),
        service.getUsers({ limit: 100 }),
        service.getReports({ limit: 100 }),
        service.getAuditLogs(),
      ])

      setUser(meResult.user)
      setDashboard(dashboardResult)
      setSpaces(spaceResult.data)
      setUsers(userResult.data)
      setReports(reportResult.data)
      setAuditLogs(auditResult.data)
      setReady(true)
    } catch (caughtError) {
      clearState()
      setError(normalizeError(caughtError))
      setReady(true)
    } finally {
      setLoading(false)
    }
  }, [clearState])

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

  const value = useMemo<SystemAdminContextValue>(
    () => ({
      serviceMode: serviceRef.current.mode,
      ready,
      authenticated: Boolean(user),
      loading,
      error,
      user,
      dashboard,
      spaces,
      users,
      reports,
      auditLogs,
      login: async (email, password) => {
        await runAction(async () => {
          await serviceRef.current.login({ email, password })
          await bootstrap()
        })
      },
      logout: async () => {
        await runAction(async () => {
          await serviceRef.current.logout()
          clearState()
        })
      },
      refresh: async () => {
        await bootstrap()
      },
      createSpace: async (input) => {
        await runAction(async () => {
          await serviceRef.current.createSpace(input)
          await bootstrap()
        })
      },
      updateSpace: async (spaceId, input) => {
        await runAction(async () => {
          await serviceRef.current.patchSpace(spaceId, input)
          await bootstrap()
        })
      },
      assignPrimaryOwner: async (spaceId, input) => {
        await runAction(async () => {
          await serviceRef.current.assignPrimaryOwner(spaceId, input)
          await bootstrap()
        })
      },
      updateUser: async (userId, input) => {
        await runAction(async () => {
          await serviceRef.current.patchUser(userId, input)
          await bootstrap()
        })
      },
      resolveReport: async (reportId, input) => {
        await runAction(async () => {
          await serviceRef.current.resolveReport(reportId, input)
          await bootstrap()
        })
      },
      resetMock: async () => {
        await runAction(async () => {
          if (serviceRef.current.resetMock) {
            await serviceRef.current.resetMock()
            await bootstrap()
          }
        })
      },
    }),
    [auditLogs, bootstrap, clearState, dashboard, error, loading, ready, reports, spaces, user, users],
  )

  return <SystemAdminContext.Provider value={value}>{children}</SystemAdminContext.Provider>
}

export function useSystemAdminContext(): SystemAdminContextValue {
  const context = useContext(SystemAdminContext)
  if (!context) {
    throw new Error('useSystemAdminContext must be used inside SystemAdminProvider')
  }
  return context
}
