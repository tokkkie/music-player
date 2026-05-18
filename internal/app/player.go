// player.go - 音楽再生制御
package app

import (
	"fmt"
	"os"
	"time"

	"github.com/gopxl/beep/v2"
	"github.com/gopxl/beep/v2/effects"
	"github.com/gopxl/beep/v2/mp3"
	"github.com/gopxl/beep/v2/speaker"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// PlayTrack は指定されたファイルを再生する
func (a *App) PlayTrack(filePath string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	// 既存の再生を停止
	if a.streamer != nil {
		speaker.Clear()
		a.streamer.Close()
		if a.stopChan != nil {
			close(a.stopChan)
		}
	}

	a.stopInhibitLocked()

	// ファイルを開く
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}

	// MP3デコード
	streamer, format, err := mp3.Decode(file)
	if err != nil {
		file.Close()
		return fmt.Errorf("failed to decode mp3: %w", err)
	}

	// スピーカー初期化（初回のみ）
	if !a.speakerInit {
		err = speaker.Init(format.SampleRate, format.SampleRate.N(time.Second/10))
		if err != nil {
			streamer.Close()
			return fmt.Errorf("failed to init speaker: %w", err)
		}
		a.speakerInit = true
	}

	a.streamer = streamer
	a.format = format
	a.currentTrack = filePath
	a.duration = float64(streamer.Len()) / float64(format.SampleRate)
	a.currentTime = 0

	// ボリュームコントロール（0.0-1.0を-5.0から0.0のデシベルに変換）
	volumeDB := (a.volume * 5.0) - 5.0
	a.volumeCtrl = &effects.Volume{
		Streamer: streamer,
		Base:     2,
		Volume:   volumeDB,
		Silent:   a.volume == 0,
	}

	// 再生コントロール
	a.ctrl = &beep.Ctrl{
		Streamer: a.volumeCtrl,
		Paused:   false,
	}

	a.stopChan = make(chan bool)

	// 再生完了時のコールバック
	done := make(chan bool, 1)
	speaker.Play(beep.Seq(a.ctrl, beep.Callback(func() {
		done <- true
	})))

	a.isPlaying = true
	a.isPaused = false

	runtime.EventsEmit(a.ctx, "trackChanged", filePath)
	runtime.EventsEmit(a.ctx, "playStateChanged", true)

	// 進捗更新用のゴルーチン
	go a.updateProgress(done)

	a.startInhibitLocked()
	return nil
}

// updateProgress は再生進捗を定期的にフロントエンドに通知する
func (a *App) updateProgress(done chan bool) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			a.mu.Lock()
			a.isPlaying = false
			a.currentTime = 0
			a.stopInhibitLocked()
			a.mu.Unlock()
			runtime.EventsEmit(a.ctx, "playStateChanged", false)
			runtime.EventsEmit(a.ctx, "trackEnded", true)
			return
		case <-a.stopChan:
			return
		case <-ticker.C:
			a.mu.Lock()
			if a.streamer != nil && a.isPlaying && !a.isPaused {
				pos := a.streamer.Position()
				a.currentTime = float64(pos) / float64(a.format.SampleRate)
				runtime.EventsEmit(a.ctx, "progressUpdate", a.currentTime)
			}
			a.mu.Unlock()
		}
	}
}

// PauseTrack は再生を一時停止する
func (a *App) PauseTrack() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.ctrl != nil {
		speaker.Lock()
		a.ctrl.Paused = true
		speaker.Unlock()
		a.isPaused = true
		a.isPlaying = false
		runtime.EventsEmit(a.ctx, "playStateChanged", false)
		a.stopInhibitLocked()
	}
	return nil
}

// ResumeTrack は一時停止を解除する
func (a *App) ResumeTrack() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.ctrl != nil && a.currentTrack != "" {
		speaker.Lock()
		a.ctrl.Paused = false
		speaker.Unlock()
		a.isPaused = false
		a.isPlaying = true
		runtime.EventsEmit(a.ctx, "playStateChanged", true)
		a.startInhibitLocked()
	}
	return nil
}

// StopTrack は再生を停止する
func (a *App) StopTrack() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.streamer != nil {
		speaker.Clear()
		a.streamer.Close()
		a.streamer = nil
		if a.stopChan != nil {
			close(a.stopChan)
			a.stopChan = nil
		}
	}

	a.isPlaying = false
	a.isPaused = false
	a.currentTime = 0
	runtime.EventsEmit(a.ctx, "playStateChanged", false)
	runtime.EventsEmit(a.ctx, "trackStopped", true)
	a.stopInhibitLocked()
	return nil
}

// SetVolume は音量を設定する（0.0〜1.0）
func (a *App) SetVolume(volume float64) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.volume = volume
	if a.volumeCtrl != nil {
		// 0.0-1.0を-5.0から0.0のデシベルに変換
		volumeDB := (volume * 5.0) - 5.0
		speaker.Lock()
		a.volumeCtrl.Volume = volumeDB
		a.volumeCtrl.Silent = volume == 0
		speaker.Unlock()
	}
	return nil
}

// SeekTo は指定した時間（秒）にシークする
func (a *App) SeekTo(time float64) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.streamer != nil {
		newPos := int(time * float64(a.format.SampleRate))
		if newPos < 0 {
			newPos = 0
		}
		if newPos > a.streamer.Len() {
			newPos = a.streamer.Len()
		}

		speaker.Lock()
		err := a.streamer.Seek(newPos)
		speaker.Unlock()

		if err != nil {
			return fmt.Errorf("failed to seek: %w", err)
		}
		a.currentTime = time
	}
	return nil
}

// GetPlayerState は現在の再生状態を返す
func (a *App) GetPlayerState() map[string]interface{} {
	return map[string]interface{}{
		"isPlaying":   a.isPlaying,
		"currentTime": a.currentTime,
		"duration":    a.duration,
		"volume":      a.volume,
		"track":       a.currentTrack,
	}
}
