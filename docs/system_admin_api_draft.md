# Noccaro System Admin API Draft

## 1. Positioning

この文書は system admin 向け API の叩き台である。
現行の `backend_api_spec.md` に未定義の領域を補うための draft であり、正式契約化前の検討材料として扱う。

前提:

- Base path: `/api/v1/system-admin`
- Auth: Bearer token
- Actor role: `system_admin`
- 成功 / 失敗 envelope は `backend_api_spec.md` と同じ形式を採用

## 2. Required resources

### 2.1 SystemAdminUser

```json
{
  "id": "uuid",
  "email": "ops@example.com",
  "displayName": "Ops Admin",
  "role": "system_admin",
  "createdAt": "2026-03-19T06:45:00Z"
}
```

### 2.2 SystemSpaceSummary

```json
{
  "space": {
    "id": "uuid",
    "code": "NOC2026",
    "name": "Noccaro コミュニティ",
    "status": "active",
    "joinPolicy": "approval_required",
    "maxOwnerCount": 3,
    "createdAt": "2026-03-01T03:00:00Z"
  },
  "primaryOwner": {
    "membershipId": "uuid",
    "userId": "uuid",
    "displayName": "Yuki",
    "email": "yuki@example.com"
  },
  "metrics": {
    "memberCount": 124,
    "pendingCount": 3,
    "ownerCount": 2,
    "openReportCount": 1
  }
}
```

### 2.3 SystemUserSummary

```json
{
  "user": {
    "id": "uuid",
    "email": "member@example.com",
    "displayName": "Member",
    "status": "active",
    "createdAt": "2026-03-01T03:00:00Z"
  },
  "memberships": [
    {
      "spaceId": "uuid",
      "spaceName": "Noccaro コミュニティ",
      "role": "guest",
      "status": "active"
    }
  ]
}
```

### 2.4 SystemReportSummary

```json
{
  "report": {
    "id": "uuid",
    "spaceId": "uuid",
    "targetType": "whisper",
    "targetId": "uuid",
    "reasonType": "privacy_risk",
    "status": "open",
    "createdAt": "2026-03-19T06:45:00Z"
  },
  "space": {
    "id": "uuid",
    "name": "Noccaro コミュニティ",
    "code": "NOC2026"
  },
  "target": {
    "body": "sample whisper"
  }
}
```

## 3. Authentication APIs

### `POST /api/v1/system-admin/auth/login`

Request:

```json
{
  "email": "ops@example.com",
  "password": "string"
}
```

Response `200`:

```json
{
  "data": {
    "token": "bearer-token",
    "user": {}
  }
}
```

### `POST /api/v1/system-admin/auth/logout`

Response `204`

### `GET /api/v1/system-admin/me`

Response `200`:

```json
{
  "data": {
    "user": {}
  }
}
```

## 4. Dashboard APIs

### `GET /api/v1/system-admin/dashboard`

Response `200`:

```json
{
  "data": {
    "spaceCount": 120,
    "activeSpaceCount": 116,
    "userCount": 5400,
    "lockedUserCount": 12,
    "openReportCount": 28,
    "orphanedPrimaryOwnerCount": 0
  }
}
```

## 5. Space operations

### `GET /api/v1/system-admin/spaces`

Query:

- `cursor`
- `limit`
- `search`
- `status`

Response `200`:

```json
{
  "data": [
    {}
  ],
  "meta": {
    "hasMore": false,
    "nextCursor": null,
    "limit": 20
  }
}
```

### `POST /api/v1/system-admin/spaces`

用途:

- 新規スペース作成
- 初期 `primary_owner` 割り当て

Request:

```json
{
  "name": "Noccaro コミュニティ",
  "description": "string | null",
  "spaceCode": "NOC2026",
  "joinPolicy": "approval_required",
  "maxOwnerCount": 3,
  "whisperTtlMinutes": 180,
  "whisperMaxLength": 30,
  "locationGridMeters": 120,
  "locationJitterEnabled": true,
  "initialPrimaryOwnerUserId": "uuid"
}
```

Behavior:

- spaces row 作成
- target user に active `primary_owner` membership 作成
- transaction 内で `primary_owner` 存在保証
- audit log 作成

Response `201`:

```json
{
  "data": {
    "space": {},
    "primaryOwnerMembership": {}
  }
}
```

### `GET /api/v1/system-admin/spaces/{spaceId}`

Response `200`:

```json
{
  "data": {}
}
```

### `PATCH /api/v1/system-admin/spaces/{spaceId}`

用途:

- スペース状態変更
- スペースコード再発行
- 緊急停止
- owner 不在復旧に必要な設定変更

Request example:

```json
{
  "status": "suspended",
  "spaceCode": "NEWCODE2026",
  "note": "support action"
}
```

### `POST /api/v1/system-admin/spaces/{spaceId}/primary-owner`

用途:

- 初期 owner 再設定
- owner 不在スペースの修復
- 主オーナー移管の強制実行

Request:

```json
{
  "userId": "uuid",
  "note": "support recovery"
}
```

Behavior:

- 対象 user の membership を active `primary_owner` にする
- 既存 primary owner がいれば整合的に role を更新
- transaction 内で `primary_owner` 一意保証

Response `200`

## 6. User operations

### `GET /api/v1/system-admin/users`

Query:

- `cursor`
- `limit`
- `search`
- `status`

### `GET /api/v1/system-admin/users/{userId}`

用途:

- 参加スペース一覧
- 現在の membership 状態確認
- サポート調査

### `PATCH /api/v1/system-admin/users/{userId}`

用途:

- lock / unlock
- 表示名補正
- サポート対応メモ更新

Request example:

```json
{
  "status": "locked",
  "note": "abuse investigation"
}
```

## 7. Cross-space moderation

### `GET /api/v1/system-admin/reports`

Query:

- `cursor`
- `limit`
- `status`
- `reasonType`
- `spaceId`

### `POST /api/v1/system-admin/reports/{reportId}/resolve`

Request:

```json
{
  "resolutionType": "content_removed",
  "note": "ops handled"
}
```

## 8. Audit and support

### `GET /api/v1/system-admin/audit-logs`

用途:

- space 作成
- primary owner 変更
- user lock / unlock
- emergency moderation

## 9. Notes

- 正式採用時は `backend_api_spec.md` へ統合する
- `system_admin` は space membership とは別権限で扱う
- `POST /api/v1/system-admin/spaces` と `POST /api/v1/system-admin/spaces/{spaceId}/primary-owner` は MVP 成立性のため優先度が高い
