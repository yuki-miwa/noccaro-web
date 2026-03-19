# noccaro-web

Noccaro の Web 管理画面です。`backend_api_spec.md` の API 契約に合わせて、管理画面を `mock` / `real` の両モードで動かせる構成にしています。

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
- `GET /api/v1/spaces/{spaceId}/whispers`
- `GET /api/v1/admin/spaces/{spaceId}/reports`
- `POST /api/v1/admin/reports/{reportId}/resolve`
- `POST /api/v1/admin/whispers/{whisperId}/remove`

## 画面

- Login
- Dashboard
- Space Settings
- Members (承認・owner付与・mute/suspend/kick/ban など)
- Posts (下書き、編集、公開、アーカイブ、削除)
- Whispers (一覧、削除)
- Reports (通報トリアージ、解決)

## ローカル起動

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 環境変数

```bash
VITE_API_MODE=mock
VITE_API_BASE_URL=http://localhost:8000
```

- `VITE_API_MODE=mock`: ローカルの in-memory モックで起動
- `VITE_API_MODE=real`: `VITE_API_BASE_URL` を使って実 API に接続
- `.env.local` は `.gitignore` 済み

## Mock ログイン

```text
email: primary-owner@noccaro.local
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

## バックエンド連携に切り替える時

1. `.env.local` で `VITE_API_MODE=real` を設定
2. `VITE_API_BASE_URL` に Laravel API のベース URL を指定
3. 既存画面は `AdminService` 契約のまま利用可能

## 既知事項

- このリポジトリにはバックエンド本体は含まれていません。`real` モードは API クライアント実装のみです。
- Whisper の管理一覧は API 契約上 `GET /api/v1/spaces/{spaceId}/whispers` を利用しています。非表示済み whisper の詳細確認は主に Reports 画面経由です。
- 現在の環境 Node.js `22.5.1` では Vite が警告を表示します（推奨は `22.12+`）。
