import type { SystemAdminPostItem, SystemSpaceSummary } from '../types'

export const ALL_SPACES_SCOPE = '__all_spaces__'

export function isAllSpacesScope(spaceId: string | null | undefined): boolean {
  return spaceId === ALL_SPACES_SCOPE
}

export function resolvePostScopeSelection(
  requestedPostSpaceId: string | null | undefined,
  spaces: SystemSpaceSummary[],
): string | null {
  if (isAllSpacesScope(requestedPostSpaceId)) {
    return ALL_SPACES_SCOPE
  }

  if (requestedPostSpaceId && spaces.some((item) => item.space.id === requestedPostSpaceId)) {
    return requestedPostSpaceId
  }

  return spaces[0]?.space.id ?? null
}

export function getBroadcastTargetSpaceIds(spaces: SystemSpaceSummary[]): string[] {
  return spaces.filter((item) => item.space.status === 'active').map((item) => item.space.id)
}

export function mergePostItemsByUpdatedAt(groups: SystemAdminPostItem[][]): SystemAdminPostItem[] {
  return groups
    .flat()
    .slice()
    .sort((left, right) => right.post.updatedAt.localeCompare(left.post.updatedAt))
}
