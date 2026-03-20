# noccaro-web

Noccaro の Web 管理画面です。`backend_api_spec.md` の API 契約に合わせて、以下 2 系統の画面を `mock` / `real` の両モードで動かせる構成にしています。

- スペースオーナー向け管理画面
- システム管理者向け管理画面

## 実装方針

- 画面は `AdminContext` -> `AdminService` 経由で API を呼ぶ
- `mock` モードでは `src/services/mockAdminService.ts` + `src/services/mockAdminApi.ts` の in-memory API を利用
- `real` モードでは `src/services/httpAdminService.ts` から `/api/v1` を呼ぶ
- テストデータは `src/data/mockData.ts` に保持
- UI は React + TypeScript + Vite

## 対応済み API 範囲

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/spaces/joined`
- `GET /api/v1/me/notification-settings`
- `GET/PATCH /api/v1/admin/spaces/{spaceId}`
- `GET /api/v1/admin/spaces/{spaceId}/join-requests`
- `POST /api/v1/admin/memberships/{membershipId}/approve`
- `POST /api/v1/admin/memberships/{membershipId}/reject`
- `GET /api/v1/admin/spaces/{spaceId}/members`
- `PATCH /api/v1/admin/memberships/{membershipId}`
- `GET /api/v1/admin/spaces/{spaceId}/posts`
- `POST /api/v1/admin/spaces/{spaceId}/posts`
- `PATCH /api/v1/admin/posts/{postId}`
- `POST /api/v1/admin/posts/{postId}/publish`
- `POST /api/v1/admin/posts/{postId}/archive`
- `DELETE /api/v1/admin/posts/{postId}`
- `GET /api/v1/system-admin/spaces/{spaceId}/posts`
- `POST /api/v1/system-admin/spaces/{spaceId}/posts`
- `PATCH /api/v1/system-admin/posts/{postId}`
- `POST /api/v1/system-admin/posts/{postId}/publish`
- `POST /api/v1/system-admin/posts/{postId}/archive`
- `DELETE /api/v1/system-admin/posts/{postId}`
- `GET /api/v1/spaces/{spaceId}/whispers`
- `GET /api/v1/admin/spaces/{spaceId}/reports`
- `POST /api/v1/admin/reports/{reportId}/resolve`
- `POST /api/v1/admin/whispers/{whisperId}/remove`

## 画面

- System Admin Login
- System Admin Dashboard
- System Admin Spaces (スペース作成、初期主オーナー割当、停止状態管理)
- System Admin Posts (operation お知らせ作成、指定アカウント配信)
- System Admin Users (横断ユーザー検索、ロック/解除)
- System Admin Reports (横断通報の解決)
- System Admin Audit Logs
- Login
- Dashboard
- Space Settings
- Members (承認・owner付与・mute/suspend/kick/ban など)
- Posts (owner お知らせの下書き、編集、公開、アーカイブ、削除、指定アカウント配信)
- Whispers (一覧、削除)
- Reports (通報トリアージ、解決)

## ローカル起動

```bash
npm install
cp .env.example .env.local
npm run dev
```

- スペースオーナー画面: `http://127.0.0.1:5173/`
- システム管理画面: `http://127.0.0.1:5173/system-admin/login`

## 環境変数

```bash
VITE_API_MODE=mock
VITE_API_BASE_URL=http://localhost:8000
```

- `VITE_API_MODE=mock`: ローカルの in-memory モックで起動
- `VITE_API_MODE=real`: `VITE_API_BASE_URL` を使って実 API に接続
- `.env.local` は `.gitignore` 済み

## Mock ログイン

スペースオーナー:

```text
email: primary-owner@noccaro.local
password: password123
```

システム管理者:

```text
email: sysadmin@noccaro.local
password: password123
```

## 品質チェック

```bash
npm run lint
npm run test
npm run build
```

## ディレクトリ概要

- `src/context/AdminContext.tsx`: 画面から使うデータアクセス境界
- `src/services/adminService.ts`: 画面が依存するサービス契約
- `src/services/httpAdminService.ts`: backend_api_spec 準拠の HTTP 実装
- `src/services/mockAdminService.ts`: API 契約互換の Mock 実装
- `src/services/mockAdminApi.ts`: モックAPIの内部エンジン（ビジネスルール含む）
- `src/data/mockData.ts`: 初期データセット
- `src/types/api.ts`: API 契約の型
- `src/pages/*`: 管理画面
- `src/services/mockAdminApi.test.ts`: 主要ルールの単体テスト
- `src/services/mockAdminService.test.ts`: API 契約レベルのモックテスト
- `src/systemAdmin/*`: system admin 用の型、サービス、mock、context、画面群
- `docs/system_admin_responsibility_split.md`: owner admin と system admin の責務分離方針
- `docs/system_admin_api_draft.md`: system admin API の叩き台

## バックエンド連携に切り替える時

1. `.env.local` で `VITE_API_MODE=real` を設定
2. `VITE_API_BASE_URL` に Laravel API のベース URL を指定
3. 既存画面は `AdminService` 契約のまま利用可能

## お知らせ管理

- owner 管理画面では `owner` カテゴリのお知らせを扱います
- system admin 画面では `operation` カテゴリのお知らせを扱います
- どちらも `all_members` / `targeted_users` を切り替えられます
- `targeted_users` の場合は対象アカウントを複数指定できます
- 指定配信では通知は無効化されます
- post object は `category`, `audienceType`, `recipientUserIds`, `isRead`, `readAt`, `targetedToMe` を受け取れる前提です

## 既知事項

- このリポジトリにはバックエンド本体は含まれていません。`real` モードは API クライアント実装のみです。
- Whisper の管理一覧は API 契約上 `GET /api/v1/spaces/{spaceId}/whispers` を利用しています。非表示済み whisper の詳細確認は主に Reports 画面経由です。
- system admin 側の `real` API も operation お知らせ管理まで接続済みです。
- 現在の環境 Node.js `22.5.1` では Vite が警告を表示します（推奨は `22.12+`）。
