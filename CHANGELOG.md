# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-05-19

### Fixed
- スライダー（シークバー・ボリューム）が動作しない問題を修正 (#26)
- 停止後に再生ボタンが動作しない問題を修正 (#26)
- 誤って削除したエラーハンドリングを復旧 (#25)

### Changed
- デバッグ用のconsole.log/fmt.Printfを削除（エラーログは保持） (#20, #21, #22, #23, #24)
- LyricsPanelのデバッグログを削除 (#19)
- TrackListPanelのダミーデータとデバッグコードを削除 (#18)
- ArtistPanelのデバッグコードを削除 (#16)
- AlbumPanelのダミーデータを削除 (#15)

## [1.0.0] - 2026-05-18

### Added
- 初回リリース
- Go + Wails v2 によるデスクトップ音楽プレイヤー
- React/TypeScript フロントエンド
- MP3再生機能
- アーティスト/アルバム/トラックリスト表示
- 歌詞表示（ID3タグ・LRCLIB API）
- アルバムアート表示（ID3タグ・フォルダ内画像・MusicBrainz API）
- Linux環境でのスリープ抑制機能
