package main

import (
	"fmt"
	"os"
	"time"

	"github.com/dhowden/tag"
	"github.com/gopxl/beep/v2"
	"github.com/gopxl/beep/v2/effects"
	"github.com/gopxl/beep/v2/mp3"
	"github.com/gopxl/beep/v2/speaker"
)

func main() {
	// 指定したmp3ファイルをオープンする
	file, err := os.Open("test.mp3")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	info, err := getMusicFileInfomation(file)
	if err != nil {
		panic(err)
	}
	println(info)

	// mp3.Decodeでストリーマーを作る
	streamer, format, err := mp3.Decode(file)
	if err != nil {
		panic(err)
	}
	defer streamer.Close()

	// speaker.Initでスピーカーを初期化する
	err = speaker.Init(format.SampleRate, format.SampleRate.N(time.Second/10))
	if err != nil {
		panic(err)
	}

	// 音量調節 (Base=2, Volume: -3.0 で小さめ, 0 で等倍, 正で大きく)
	volume := &effects.Volume{
		Streamer: streamer,
		Base:     2,
		Volume:   -5,
		Silent:   false,
	}

	// speaker.Playで再生する
	done := make(chan bool)
	speaker.Play(beep.Seq(volume, beep.Callback(func() {
		done <- true
	})))

	// プレイヤーが終わるまで待機
	<-done
}

// アーティスト名、曲名、アルバム名、トラック番号、再生時間、ファイルサイズ、ファイルパスを返す
func getMusicFileInfomation(file *os.File) (string, error) {
	metadata, err := tag.ReadFrom(file)
	if err != nil {
		return "", fmt.Errorf("failed to read tag: %w", err)
	}

	// ファイル情報を取得
	fi, err := file.Stat()
	if err != nil {
		return "", fmt.Errorf("failed to stat file: %w", err)
	}

	// タグ情報を取得
	artist := metadata.Artist()
	title := metadata.Title()
	album := metadata.Album()
	track, _ := metadata.Track()

	// ファイルの先頭に戻す（後続のmp3.Decodeのため）
	if _, err := file.Seek(0, 0); err != nil {
		return "", fmt.Errorf("failed to seek file: %w", err)
	}

	info := fmt.Sprintf(
		"Artist: %s\nTitle: %s\nAlbum: %s\nTrack: %d\nFileSize: %d bytes\nFilePath: %s",
		artist, title, album, track, fi.Size(), file.Name(),
	)
	return info, nil
}
