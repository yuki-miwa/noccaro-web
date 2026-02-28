# noccaro-web

Noccaro の Web 管理画面（MVP向け）です。現在はバックエンド未接続で、要件定義・DDLを元にした **Mock/Stub 実装** で動作します。

## 実装方針

- サーバー連携が必要な処理は `src/services/mockAdminApi.ts` の in-memory API で代替
- テストデータは `src/data/mockData.ts` に保持
- UI は React + TypeScript + Vite
- 将来的に API 連携へ差し替えやすいよう、画面は `AdminContext` 経由でデータ操作

## 画面

- Dashboard
- Space Settings
- Members (承認・owner付与・mute/suspend/kick/ban など)
- Posts (オーナー記事作成、通知キュー確認)
- Whispers (一覧、削除、報告シミュレーション)
- Reports (通報トリアージ、解決)

## ローカル起動

```bash
npm install
npm run dev
```

## 品質チェック

```bash
npm run lint
npm run test
npm run build
```

## ディレクトリ概要

- `src/context/AdminContext.tsx`: 画面から使うデータアクセス境界
- `src/services/mockAdminApi.ts`: モックAPI（ビジネスルール含む）
- `src/data/mockData.ts`: 初期データセット
- `src/pages/*`: 管理画面
- `src/services/mockAdminApi.test.ts`: 主要ルールの単体テスト

## バックエンド連携に切り替える時

1. `MockAdminApi` と同等のメソッド契約で実 API クライアントを作る
2. `AdminContext` で注入する実体を差し替える
3. 既存画面はほぼ変更なしで利用可能

## 既知事項

- 現在の環境 Node.js `22.5.1` では Vite が警告を表示します（推奨は `22.12+`）。
