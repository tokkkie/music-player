// app.go - アプリケーションのコア構造体と初期化
package app

import (
	"context"
	"fmt"
	"sync"

	"github.com/gopxl/beep/v2"
	"github.com/gopxl/beep/v2/effects"
	"github.com/tokkkie/music-player/internal/app/power"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App はアプリケーションのメイン構造体
type App struct {
	ctx           context.Context
	musicPath     string
	tracks        []MusicTrack
	currentTrack  string
	isPlaying     bool
	isPaused      bool
	volume        float64
	currentTime   float64
	duration      float64
	streamer      beep.StreamSeekCloser
	ctrl          *beep.Ctrl
	volumeCtrl    *effects.Volume
	format        beep.Format
	mu            sync.Mutex
	speakerInit   bool
	stopChan      chan bool
	tracksReady   chan struct{}
	domReady      chan struct{}
	inhibitCancel func()
}

// NewApp は新しいAppインスタンスを作成する
func NewApp() *App {
	return &App{
		volume:      0.5, // デフォルト50%
		tracksReady: make(chan struct{}),
		domReady:    make(chan struct{}),
	}
}

// Startup はアプリケーション起動時に呼ばれる
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// バックグラウンドでトラック読み込み
	go func() {
		config, err := loadConfig()
		if err == nil && config.MusicDirectory != "" {
			a.SetMusicDirectory(config.MusicDirectory)
		}
		close(a.tracksReady)
	}()

	// トラック読み込みとDOM準備の両方を待ってイベント発行
	go func() {
		<-a.tracksReady
		<-a.domReady
		runtime.EventsEmit(a.ctx, "dataReady", true)
	}()
}

// OnDomReady はDOM準備完了時に呼ばれる
func (a *App) OnDomReady(ctx context.Context) {
	close(a.domReady)
}

// SetMusicDirectory は音楽ディレクトリを設定してトラックを読み込む
func (a *App) SetMusicDirectory(path string) error {
	a.musicPath = path
	tracks, err := loadTracksFromDirectory(path)
	if err != nil {
		return err
	}
	a.tracks = tracks

	config, _ := loadConfig()
	config.MusicDirectory = path
	if err := saveConfig(config); err != nil {
		fmt.Printf("Warning: failed to save config: %v\n", err)
	}

	return nil
}

// SaveLastSelection は最後に選択したアーティスト/アルバムを保存する
func (a *App) SaveLastSelection(artist, album string) error {
	config, err := loadConfig()
	if err != nil {
		config = &Config{}
	}
	config.LastArtist = artist
	config.LastAlbum = album

	// アルバムの年情報を取得
	if artist != "" && album != "" {
		albums := a.GetAlbumsByArtist(artist)
		for _, albumInfo := range albums {
			if albumInfo.Album == album {
				config.LastAlbumYear = albumInfo.Year
				break
			}
		}
	}

	if err := saveConfig(config); err != nil {
		return fmt.Errorf("failed to save selection: %w", err)
	}
	return nil
}

// GetLastSelection は最後に選択したアーティスト/アルバムを取得する
func (a *App) GetLastSelection() map[string]string {
	config, err := loadConfig()
	if err != nil {
		return map[string]string{"artist": "", "album": "", "year": ""}
	}
	return map[string]string{
		"artist": config.LastArtist,
		"album":  config.LastAlbum,
		"year":   config.LastAlbumYear,
	}
}

// OpenDirectoryDialog はディレクトリ選択ダイアログを開く
func (a *App) OpenDirectoryDialog() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Music Directory",
	})
	return path, err
}

// startInhibitLocked はスリープ抑制を開始する。呼び出し元で a.mu を保持していること。
func (a *App) startInhibitLocked() {
	if a.inhibitCancel != nil {
		return
	}
	cancel, err := power.Inhibit()
	if err != nil {
		fmt.Printf("Warning: failed to inhibit sleep: %v\n", err)
		return
	}
	a.inhibitCancel = cancel
}

// stopInhibitLocked はスリープ抑制を解除する。呼び出し元で a.mu を保持していること。
func (a *App) stopInhibitLocked() {
	if a.inhibitCancel != nil {
		a.inhibitCancel()
		a.inhibitCancel = nil
	}
}
