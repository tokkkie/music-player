// tracks.go - トラック管理・検索
package app

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/dhowden/tag"
)

// タイトルから先頭の数字を取り除くための正規表現
var leadingDigitsRegex = regexp.MustCompile(`^\d+[\s\-_.]*`)

// MusicTrack は音楽トラックの情報を表す
type MusicTrack struct {
	Artist   string `json:"artist"`
	Album    string `json:"album"`
	Title    string `json:"title"`
	FilePath string `json:"filePath"`
	Year     string `json:"year"`
}

// AlbumInfo はアルバム情報を表す
type AlbumInfo struct {
	Artist string `json:"artist"`
	Album  string `json:"album"`
	Year   string `json:"year"`
}

// GetArtists は全アーティスト一覧を返す（ソート済み）
func (a *App) GetArtists() []string {
	artistMap := make(map[string]bool)
	for _, track := range a.tracks {
		if track.Artist != "" {
			artistMap[track.Artist] = true
		}
	}

	artists := make([]string, 0, len(artistMap))
	for artist := range artistMap {
		artists = append(artists, artist)
	}

	// "The " を除いてソート（元の名前は保持）
	sort.Slice(artists, func(i, j int) bool {
		return strings.ToLower(getSortKey(artists[i])) < strings.ToLower(getSortKey(artists[j]))
	})

	return artists
}

// getSortKey はソート用のキーを返す（"The " プレフィックスを除去）
func getSortKey(artist string) string {
	lower := strings.ToLower(artist)
	if strings.HasPrefix(lower, "the ") {
		return artist[4:]
	}
	return artist
}

// GetAlbumsByArtist は指定アーティストのアルバム一覧を返す（年順ソート）
func (a *App) GetAlbumsByArtist(artist string) []AlbumInfo {
	albumMap := make(map[string]bool)
	albumYearMap := make(map[string]string)

	for _, track := range a.tracks {
		if track.Artist == artist && track.Album != "" {
			albumMap[track.Album] = true
			// アルバム内で最も新しい年を使用
			if track.Year != "" && track.Year != "0" {
				existing := albumYearMap[track.Album]
				if existing == "" || existing == "0" || track.Year > existing {
					albumYearMap[track.Album] = track.Year
				}
			}
		}
	}

	albums := make([]AlbumInfo, 0, len(albumMap))
	for album := range albumMap {
		albums = append(albums, AlbumInfo{
			Artist: artist,
			Album:  album,
			Year:   albumYearMap[album],
		})
	}

	// 年でソート（古い順）、年がない場合はアルバム名でソート
	sort.Slice(albums, func(i, j int) bool {
		if albums[i].Year != "" && albums[j].Year != "" {
			if albums[i].Year != albums[j].Year {
				return albums[i].Year < albums[j].Year
			}
		} else if albums[i].Year != "" {
			return true
		} else if albums[j].Year != "" {
			return false
		}
		return albums[i].Album < albums[j].Album
	})

	return albums
}

// GetTracksByAlbum は指定アルバムのトラック一覧を返す（ファイルパス順）
func (a *App) GetTracksByAlbum(artist, album string) []MusicTrack {
	var tracks []MusicTrack
	for _, track := range a.tracks {
		if track.Artist == artist && track.Album == album {
			tracks = append(tracks, track)
		}
	}

	// ファイルパス順（トラック番号順）でソート
	sort.Slice(tracks, func(i, j int) bool {
		return tracks[i].FilePath < tracks[j].FilePath
	})

	return tracks
}

// loadTracksFromDirectory はディレクトリからMP3ファイルを走査してトラック情報を取得する
func loadTracksFromDirectory(basePath string) ([]MusicTrack, error) {
	var tracks []MusicTrack

	err := filepath.Walk(basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		// MP3ファイルのみ処理
		if strings.ToLower(filepath.Ext(path)) != ".mp3" {
			return nil
		}

		relPath, err := filepath.Rel(basePath, path)
		if err != nil {
			return err
		}

		parts := strings.Split(filepath.ToSlash(relPath), "/")
		track := MusicTrack{FilePath: path}

		// ディレクトリ構造からアーティスト/アルバム/タイトルを推定
		switch len(parts) {
		case 1:
			track.Title = strings.TrimSuffix(parts[0], filepath.Ext(parts[0]))
		case 2:
			track.Artist = parts[0]
			track.Title = strings.TrimSuffix(parts[1], filepath.Ext(parts[1]))
		default: // 3以上
			track.Artist = parts[0]
			track.Album = parts[1]
			track.Title = strings.TrimSuffix(parts[2], filepath.Ext(parts[2]))
		}

		// タイトルから先頭の数字を取り除く（例: "01曲名" → "曲名"）
		track.Title = leadingDigitsRegex.ReplaceAllString(track.Title, "")

		// MP3ファイルから年情報を取得
		if file, err := os.Open(path); err == nil {
			if metadata, err := tag.ReadFrom(file); err == nil {
				track.Year = fmt.Sprintf("%d", metadata.Year())
			}
			file.Close()
		}

		tracks = append(tracks, track)
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	return tracks, nil
}
