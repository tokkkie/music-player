// albumart.go - アルバムアート取得
package app

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dhowden/tag"
)

var coverFileNames = []string{
	"cover.jpg", "cover.jpeg", "cover.png",
	"folder.jpg", "folder.jpeg", "folder.png",
	"front.jpg", "front.jpeg", "front.png",
	"album.jpg", "album.jpeg", "album.png",
	"Cover.jpg", "Cover.jpeg", "Cover.png",
	"Folder.jpg", "Folder.jpeg", "Folder.png",
}

func getCacheDir() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(cacheDir, "music-player", "covers")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

func cacheKey(artist, album string) string {
	h := sha256.Sum256([]byte(artist + "\x00" + album))
	return fmt.Sprintf("%x", h[:16])
}

func getCachedArt(artist, album string) ([]byte, string, bool) {
	dir, err := getCacheDir()
	if err != nil {
		return nil, "", false
	}
	key := cacheKey(artist, album)
	for _, ext := range []string{".jpg", ".png"} {
		p := filepath.Join(dir, key+ext)
		data, err := os.ReadFile(p)
		if err == nil && len(data) > 0 {
			mime := "image/jpeg"
			if ext == ".png" {
				mime = "image/png"
			}
			return data, mime, true
		}
	}
	return nil, "", false
}

func saveCachedArt(artist, album string, data []byte, mimeType string) error {
	dir, err := getCacheDir()
	if err != nil {
		return err
	}
	ext := ".jpg"
	if strings.Contains(mimeType, "png") {
		ext = ".png"
	}
	key := cacheKey(artist, album)
	p := filepath.Join(dir, key+ext)
	return os.WriteFile(p, data, 0644)
}

func toDataURI(data []byte, mime string) string {
	return fmt.Sprintf("data:%s;base64,%s", mime, base64.StdEncoding.EncodeToString(data))
}

// getArtFromID3 はアルバム内の最初のMP3からID3タグの埋め込み画像を取得
func (a *App) getArtFromID3(artist, album string) ([]byte, string, error) {
	for _, track := range a.tracks {
		if track.Artist == artist && track.Album == album {
			f, err := os.Open(track.FilePath)
			if err != nil {
				continue
			}
			m, err := tag.ReadFrom(f)
			f.Close()
			if err != nil {
				continue
			}
			if pic := m.Picture(); pic != nil && len(pic.Data) > 0 {
				return pic.Data, pic.MIMEType, nil
			}
		}
	}
	return nil, "", fmt.Errorf("no embedded art found")
}

// getArtFromFolder はアルバムフォルダ内のカバー画像ファイルを探す
func (a *App) getArtFromFolder(artist, album string) ([]byte, string, error) {
	for _, track := range a.tracks {
		if track.Artist == artist && track.Album == album {
			dir := filepath.Dir(track.FilePath)
			for _, name := range coverFileNames {
				p := filepath.Join(dir, name)
				data, err := os.ReadFile(p)
				if err == nil && len(data) > 0 {
					mime := "image/jpeg"
					if strings.HasSuffix(strings.ToLower(name), ".png") {
						mime = "image/png"
					}
					return data, mime, nil
				}
			}
			break
		}
	}
	return nil, "", fmt.Errorf("no folder art found")
}

// MusicBrainz API レスポンス
type mbSearchResponse struct {
	Releases []struct {
		ID string `json:"id"`
	} `json:"releases"`
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

// getArtFromMusicBrainz はMusicBrainz + Cover Art Archiveから画像を取得
func getArtFromMusicBrainz(artist, album string) ([]byte, string, error) {
	// 1. MusicBrainzでrelease検索
	query := fmt.Sprintf(`release:"%s" AND artist:"%s"`, album, artist)
	searchURL := fmt.Sprintf("https://musicbrainz.org/ws/2/release/?query=%s&limit=1&fmt=json",
		url.QueryEscape(query))

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "MusicPlayer/1.0 (https://github.com/tokkkie/music-player)")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("MusicBrainz search failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, "", fmt.Errorf("MusicBrainz returned status %d", resp.StatusCode)
	}

	var result mbSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, "", err
	}

	if len(result.Releases) == 0 {
		return nil, "", fmt.Errorf("no release found on MusicBrainz")
	}

	mbid := result.Releases[0].ID

	// 2. Cover Art Archiveから画像取得
	caaURL := fmt.Sprintf("https://coverartarchive.org/release/%s/front", mbid)
	req2, err := http.NewRequest("GET", caaURL, nil)
	if err != nil {
		return nil, "", err
	}
	req2.Header.Set("User-Agent", "MusicPlayer/1.0 (https://github.com/tokkkie/music-player)")

	resp2, err := httpClient.Do(req2)
	if err != nil {
		return nil, "", fmt.Errorf("CAA request failed: %w", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != 200 {
		return nil, "", fmt.Errorf("CAA returned status %d", resp2.StatusCode)
	}

	data, err := io.ReadAll(resp2.Body)
	if err != nil {
		return nil, "", err
	}

	contentType := resp2.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	return data, contentType, nil
}

// GetAlbumArt はフロントエンドから呼ばれるAPIメソッド
// base64エンコードされたdata URIを返す
func (a *App) GetAlbumArt(artist, album string) string {
	if artist == "" || album == "" {
		return ""
	}

	// 1. キャッシュチェック
	if data, mime, ok := getCachedArt(artist, album); ok {
		return toDataURI(data, mime)
	}

	// 2. ID3タグから取得
	if data, mime, err := a.getArtFromID3(artist, album); err == nil {
		saveCachedArt(artist, album, data, mime)
		return toDataURI(data, mime)
	}

	// 3. フォルダ内画像から取得
	if data, mime, err := a.getArtFromFolder(artist, album); err == nil {
		saveCachedArt(artist, album, data, mime)
		return toDataURI(data, mime)
	}

	// 4. MusicBrainz/CAAから取得
	if data, mime, err := getArtFromMusicBrainz(artist, album); err == nil {
		saveCachedArt(artist, album, data, mime)
		return toDataURI(data, mime)
	}

	return ""
}
