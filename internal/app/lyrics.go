// lyrics.go - 歌詞取得
package app

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/dhowden/tag"
)

var lyricsClient = &http.Client{Timeout: 30 * time.Second}

// LRCLIB API response
type lrclibResponse struct {
	SyncedLyrics string `json:"syncedLyrics"`
	PlainLyrics  string `json:"plainLyrics"`
}

func getLyricsCacheDir() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(cacheDir, "music-player", "lyrics")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

func lyricsCacheKey(artist, title, album string) string {
	h := sha256.Sum256([]byte(artist + "\x00" + title + "\x00" + album))
	return fmt.Sprintf("%x", h[:16])
}

func getCachedLyrics(artist, title, album string) (string, bool) {
	dir, err := getLyricsCacheDir()
	if err != nil {
		return "", false
	}
	key := lyricsCacheKey(artist, title, album)
	p := filepath.Join(dir, key+".txt")
	data, err := os.ReadFile(p)
	if err == nil && len(data) > 0 {
		return string(data), true
	}
	return "", false
}

func saveCachedLyrics(artist, title, album, lyrics string) error {
	dir, err := getLyricsCacheDir()
	if err != nil {
		return err
	}
	key := lyricsCacheKey(artist, title, album)
	p := filepath.Join(dir, key+".txt")
	return os.WriteFile(p, []byte(lyrics), 0644)
}

// getLyricsFromID3 はMP3のID3タグから歌詞を取得
func (a *App) getLyricsFromID3(artist, title, album string) (string, error) {
	for _, track := range a.tracks {
		if track.Artist == artist && track.Title == title && track.Album == album {
			f, err := os.Open(track.FilePath)
			if err != nil {
				continue
			}
			m, err := tag.ReadFrom(f)
			f.Close()
			if err != nil {
				continue
			}
			if lyrics := m.Lyrics(); lyrics != "" {
				return lyrics, nil
			}
		}
	}
	return "", fmt.Errorf("no embedded lyrics found")
}

// getLyricsFromLRCLIB はLRCLIB APIから歌詞を取得
func getLyricsFromLRCLIB(artist, title, album string) (string, error) {
	// LRCLIB API: GET /api/get?artist_name=...&track_name=...&album_name=...
	baseURL := "https://lrclib.net/api/get"
	params := url.Values{}
	params.Add("artist_name", artist)
	params.Add("track_name", title)
	if album != "" {
		params.Add("album_name", album)
	}

	reqURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "MusicPlayer/1.0 (https://github.com/tokkkie/music-player)")

	resp, err := lyricsClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("LRCLIB request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return "", fmt.Errorf("lyrics not found on LRCLIB")
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("LRCLIB returned status %d", resp.StatusCode)
	}

	var result lrclibResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	// タイムスタンプ付き歌詞を優先、なければプレーン歌詞
	if result.SyncedLyrics != "" {
		return result.SyncedLyrics, nil
	}
	if result.PlainLyrics != "" {
		return result.PlainLyrics, nil
	}

	return "", fmt.Errorf("no lyrics in LRCLIB response")
}

// GetLyrics はフロントエンドから呼ばれるAPIメソッド
func (a *App) GetLyrics(artist, title, album string) string {
	if artist == "" || title == "" {
		return ""
	}

	// 1. キャッシュチェック
	if cached, ok := getCachedLyrics(artist, title, album); ok {
		fmt.Printf("Lyrics cache hit: %s - %s\n", artist, title)
		return cached
	}

	// 2. ID3タグから取得
	if lyrics, err := a.getLyricsFromID3(artist, title, album); err == nil {
		fmt.Printf("Lyrics from ID3: %s - %s\n", artist, title)
		saveCachedLyrics(artist, title, album, lyrics)
		return lyrics
	}

	// 3. LRCLIBから取得
	if lyrics, err := getLyricsFromLRCLIB(artist, title, album); err == nil {
		fmt.Printf("Lyrics from LRCLIB: %s - %s\n", artist, title)
		saveCachedLyrics(artist, title, album, lyrics)
		return lyrics
	} else {
		fmt.Printf("Lyrics not found: %s - %s (%v)\n", artist, title, err)
	}

	return ""
}
