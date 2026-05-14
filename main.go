package main

import (
	"os"
	"time"

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
