# trumps-core (トランプス・コア)

[![CI](https://github.com/LifeOnFloor/trumps/actions/workflows/deploy.yml/badge.svg)](https://github.com/LifeOnFloor/trumps/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

サーバーレス・P2P（PeerJS / WebRTC）で手軽に友達とオンライン対戦できる、モダンなブラウザ向けトランプゲームプラットフォームです。

---

## 🃏 実装済みゲーム一覧

| ゲーム名 | モード | プレイ人数 | 特徴・ルール |
| :--- | :--- | :--- | :--- |
| **大富豪** | オンライン対戦 | 3〜8人 | 15種以上のローカルルール（革命・8切り・11バック・都落ち・片/両/激縛り・連番縛り・5スキップ・7渡し・10捨て・砂嵐・下剋上・階段等）、チップ対戦モード（アンティ、ポット分配、破産ルール） |
| **神経衰弱** | ソロ / オンライン対戦 | 1〜6人 | 52枚標準トランプ。ランク一致でペア獲得＆連続手番。1人タイムアタック（経過秒数・めくり手数記録）およびP2Pオンラインリアルタイムマルチ対戦 |
| **ソリティア**<br>(クロンダイク) | ソロ | 1人 | 標準7列タブロー（赤黒交互・数字下降）、4組ファンデーション（A→K）、山札リサイクル、1タップオートムーブ、手数カウント |
| **ゲームカタログ** | 検索・閲覧 | - | 30種類以上の世界中のトランプゲーム（ババ抜き・七並べ・ナポレオン・ハーツ・ポーカー等）の詳細ルール・検索 |

---

## 🛠️ 主なアーキテクチャ・技術スタック

本リポジトリは **「Core Domain の完全独立」** と **「AI-DLC (Spec-Driven Development)」** の掟に基づいて設計されています。

- **Core Domain (`src/core/`)**:
  - UIフレームワークやネットワークライブラリに一切依存しない、純粋な TypeScript ロジック。
  - **イミュータブル設計**: ゲーム状態遷移はすべて副作用のない純粋関数として実装。
  - **情報隠蔽 (Sanitization)**: サーバー/ホストから各クライアントへ状態を送信する際、他プレイヤーの非公開情報（手札や伏せカード）を厳格に不可視化（`card = null`）。
- **P2P Networking (`src/network/`)**:
  - 中央サーバー不要の WebRTC / PeerJS P2P 通信。
  - ホスト権威型（Host-Authoritative）セッション管理、URL クエリによるルーム招待・ルール同期。
  - テスト用のインメモリトランスポート（`MemoryTransport`）を内包し、P2P 通信の挙動を CI 上でミリ秒単位で高速自動テスト。
- **UI Layer (`src/ui/`)**:
  - React 19 + Tailwind CSS + Lucide Icons。
  - モバイル / デスクトップ両対応のレスポンシブデザイン。
  - サウンド・バイブレーション（触覚フィードバック）制御。
- **Configuration (`src/config/`)**:
  - 広告枠トグル（デフォルト: オフ、`VITE_ENABLE_ADS` で切替可能）。
  - 多言語トグル（デフォルト: 日本語固定、`VITE_ENABLE_MULTILINGUAL` で復元可能）。

---

## 🚀 クイックスタート

### 前提条件
- Node.js 20 以上
- npm 10 以上

### インストール
```bash
git clone https://github.com/LifeOnFloor/trumps.git
cd trumps
npm install
```

### 開発用ローカルサーバーの起動
```bash
npm run dev
```
ブラウザで `http://localhost:5173`（または表示されたローカル URL）を開きます。

---

## 🧪 テスト・検証コマンド

本プロジェクトでは、コードの変更前後に以下の検証を行うことが義務付けられています。

```bash
# 1. TypeScript 型検査
npm run typecheck   # または npx tsc --noEmit

# 2. 全単体・統合テスト実行 (Vitest)
npm run test        # または npx vitest run

# 3. 本番用静的バンドルビルド
npm run build
```

---

## 📁 ディレクトリ構成

```text
trumps/
├── .github/workflows/      # GitHub Pages 自動デプロイ CI/CD
├── src/
│   ├── catalog/            # 30+ トランプゲームのメタデータ・検索
│   ├── config/             # 広告・i18n 設定フラグ
│   ├── core/               # 純粋関数ゲームドメイン（完全独立）
│   │   ├── engine/         # GameRunner (ゲーム進行エンジン)
│   │   ├── rules/          # 大富豪・神経衰弱・クロンダイク
│   │   ├── types/          # カード・状態・エンジン型定義
│   │   └── utils/          # デッキ生成・シャッフル
│   ├── i18n/               # 多言語辞書・コンテキスト
│   ├── network/            # P2P セッション (Host / Client / PeerJS)
│   └── ui/                 # React コンポーネント・画面・フック
├── tests/                  # 全40+テストファイル (Core / Network / UI)
├── index.html              # エントリーポイント HTML
├── package.json
└── tsconfig.json
```

---

## 📜 ライセンス

[MIT License](LICENSE)
