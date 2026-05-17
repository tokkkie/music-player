# 開発環境セットアップ

## 必要要件

- Go 1.21+
- Node.js 18+
- Wails v2

## Wailsのインストール

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## 依存関係のインストール

```bash
# Go依存関係
go mod download

# フロントエンド依存関係
cd frontend
npm install
cd ..
```

## 開発モードで起動

```bash
wails dev
```

ホットリロードが有効になり、コード変更が即座に反映されます。

## ビルド

```bash
wails build
```

ビルド成果物は `build/bin/` に出力されます。

## プロジェクト構造

```text
.
├── main.go                    # エントリーポイント
├── wails.json                 # Wails設定
├── internal/
│   └── app/
│       ├── app.go             # App構造体、初期化
│       ├── player.go          # 再生制御
│       ├── tracks.go          # トラック管理
│       ├── lyrics.go          # 歌詞取得（ID3/LRCLIB）
│       ├── albumart.go        # アルバムアート取得（ID3/フォルダ/MusicBrainz）
│       └── config.go          # 設定管理
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # メインアプリケーション
│   │   ├── components/        # UIコンポーネント
│   │   ├── hooks/             # カスタムフック
│   │   ├── utils/             # ユーティリティ
│   │   └── types/             # 型定義
│   └── package.json
└── go.mod
```
