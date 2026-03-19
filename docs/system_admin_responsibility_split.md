# Noccaro Admin Responsibility Split

## 1. 目的

Noccaro の管理機能を、以下の 2 系統に明確に分離する。

- スペース運営者向け管理画面
- システム運営者向け管理画面

この分離は、初回スペース作成と初期 `primary_owner` 設定が、既存の space owner 管理画面だけでは完結しないため必要である。

## 2. 前提

- 承認済み仕様と DDL では、`primary_owner` はスペース単位のロールである
- `primary_owner` は各スペースに必ず 1 人必要である
- `primary_owner` が不在のスペースはアプリケーション整合性上の異常状態である
- 既存の `owner` / `primary_owner` 向け管理 API は「既に存在する space を運営する」責務に寄っている
- `POST /api/v1/admin/spaces` のような初回作成 API は現行 API 契約に定義されていない

## 3. 責務分離

### 3.1 Space Owner Admin

対象者:

- `owner`
- `primary_owner`

責務:

- 自分が所属するスペースの設定変更
- 参加申請承認 / 却下
- メンバーの `role` / `status` 操作
- オーナー記事の作成 / 公開 / アーカイブ / 削除
- whisper / report の moderation
- スペース内通知の作成

責務外:

- 新規スペース作成
- 初期 `primary_owner` のアサイン
- 全スペース横断の監視
- 全ユーザー横断のロック / 調査
- オーナー不在スペースの修復
- システム全体の監査 / サポート / abuse 対応

### 3.2 System Admin

対象者:

- Noccaro 運営者
- サポート担当
- abuse / moderation 担当

責務:

- 新規スペース作成
- 初期 `primary_owner` 設定
- スペース停止 / 復旧 / アーカイブ
- オーナー不在スペースの修復
- 全ユーザー検索
- ユーザーのロック / 復旧
- 全スペース横断の通報監視
- 監査ログ参照
- システム運用上の例外対応

責務外:

- 日常的なスペース運営判断
- 個別スペース内の細かい投稿運営の代行

## 4. UI / Route 分離方針

### 4.1 Space Owner Admin

- Route prefix: `/`
- 認証文脈: スペース運営者セッション
- データ文脈: selected space 前提
- 権限制御: `owner` / `primary_owner`

### 4.2 System Admin

- Route prefix: `/system-admin`
- 認証文脈: システム管理者セッション
- データ文脈: 全スペース / 全ユーザー横断
- 権限制御: `system_admin`

## 5. 実装上の原則

- system admin と space owner admin で Context / Service / Storage key を分離する
- 将来バックエンド接続時も API namespace を分ける
- space owner 側から system admin 機能を見せない
- mock 実装でも、権限境界は UI と service 層で分離する

## 6. MVP で system admin に最低限必要な機能

- ダッシュボード
- スペース一覧 / 検索
- スペース作成
- 初期 `primary_owner` 指定
- スペース状態変更
- ユーザー一覧 / 検索
- ユーザーロック / 復旧
- 横断通報の確認

## 7. 補足

MVP では system admin を「内部運用画面」として扱い、一般公開しない前提でよい。
