// App.tsx - メインアプリケーションコンポーネント
import { useState, useEffect, useRef } from 'react'
import './App.css'
import ArtistPanel from './components/ArtistPanel'
import AlbumPanel from './components/AlbumPanel'
import TrackListPanel from './components/TrackListPanel'
import LyricsPanel from './components/LyricsPanel'
import PlayerPanel from './components/PlayerPanel'
import { usePanelResize } from './hooks/usePanelResize'
import './types/wails.ts'

function App() {
  // 選択状態
  const [selectedArtist, setSelectedArtist] = useState('')
  const [selectedAlbum, setSelectedAlbum] = useState('')
  // TrackListPanel表示用（アーティスト変更しても保持）
  const [displayArtist, setDisplayArtist] = useState('')
  const [displayAlbum, setDisplayAlbum] = useState('')
  const [displayAlbumYear, setDisplayAlbumYear] = useState('')
  // 再生状態
  const [currentTrack, setCurrentTrack] = useState('')
  const [currentTrackList, setCurrentTrackList] = useState<string[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [currentTrackInfo, setCurrentTrackInfo] = useState({ artist: '', title: '' })
  const [allTracksInfo, setAllTracksInfo] = useState<Array<{artist: string, title: string}>>([])
  // データ準備状態
  const [dataReady, setDataReady] = useState(false)
  const isInitialLoadRef = useRef(true)

  // パネルリサイズ
  const { artistWidth, albumWidth, lyricsWidth, handleResizerMouseDown } = usePanelResize()

  // フォントサイズ（localStorage永続化、80%〜150%）
  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem('ui:fontScale')
    return saved ? parseFloat(saved) : 1
  })

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--base-font-size', `${16 * fontScale}px`)
    localStorage.setItem('ui:fontScale', String(fontScale))
  }, [fontScale])

  const handlePlayTrack = (trackPath: string, trackList: string[], index: number, artist: string, title: string) => {
    setCurrentTrack(trackPath)
    setCurrentTrackList(trackList)
    setCurrentTrackIndex(index)
    setCurrentTrackInfo({ artist, title })
  }

  const handleSetTrackIndex = (index: number) => {
    setCurrentTrackIndex(index)
    if (allTracksInfo[index]) {
      setCurrentTrackInfo(allTracksInfo[index])
    }
  }

  // dataReadyイベントを待ってから選択を復元
  useEffect(() => {
    const handleDataReady = async () => {
      setDataReady(true)

      if (window.go?.app?.App?.GetLastSelection) {
        try {
          const selection = await window.go.app.App.GetLastSelection()
          
          if (selection.artist) {
            setSelectedArtist(selection.artist)
            setDisplayArtist(selection.artist)
          }
          if (selection.album) {
            setSelectedAlbum(selection.album)
            setDisplayAlbum(selection.album)
          }
          if (selection.year) {
            setDisplayAlbumYear(selection.year)
          }
        } catch (error) {
          // エラーは無視
        }
      }
      
      // 状態更新が完了してから初回読み込みフラグを解除
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 200)
    }

    if (window.runtime?.EventsOn) {
      window.runtime.EventsOn('dataReady', handleDataReady)
    } else {
      // fallback: Wailsランタイムがまだ準備できていない場合
      handleDataReady()
    }

    return () => {
      if (window.runtime?.EventsOff) {
        window.runtime.EventsOff('dataReady')
      }
    }
  }, [])

  // 選択が変更されたら保存（初回読み込み時は除く）
  useEffect(() => {
    if (!isInitialLoadRef.current && (selectedArtist || selectedAlbum)) {
      const saveSelection = async () => {
        if (window.go?.app?.App?.SaveLastSelection) {
          try {
            await window.go.app.App.SaveLastSelection(selectedArtist, selectedAlbum)
          } catch (error) {
            // エラーは無視
          }
        }
      }
      saveSelection()
    }
  }, [selectedArtist, selectedAlbum])

  const handleNextTrack = async () => {
    if (currentTrackIndex >= 0 && currentTrackIndex < currentTrackList.length - 1) {
      const nextIndex = currentTrackIndex + 1
      setCurrentTrack(currentTrackList[nextIndex])
      setCurrentTrackIndex(nextIndex)
      
      // 次の曲の情報を取得
      if (window.go?.app?.App?.GetTracksByAlbum && currentTrackInfo.artist && selectedAlbum) {
        try {
          const tracks = await window.go.app.App.GetTracksByAlbum(currentTrackInfo.artist, selectedAlbum)
          if (tracks[nextIndex]) {
            setCurrentTrackInfo({ artist: tracks[nextIndex].artist, title: tracks[nextIndex].title })
          }
        } catch (error) {
          // エラーは無視
        }
      }
    }
  }

  return (
    <div className="app">
      <div className="main-content">
        <div className="panel-wrapper" style={{ width: artistWidth }}>
          <ArtistPanel
            selectedArtist={selectedArtist}
            dataReady={dataReady}
            onSelectArtist={(artist: string) => {
              setSelectedArtist(artist)
              setSelectedAlbum('')
            }}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
          />
        </div>
        <div className="resizer" onMouseDown={(e) => handleResizerMouseDown('artist', e)} />
        <div className="panel-wrapper" style={{ width: albumWidth }}>
          <AlbumPanel 
            artist={selectedArtist}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={(album: string, year?: string) => {
              setSelectedAlbum(album)
              setDisplayArtist(selectedArtist)
              setDisplayAlbum(album)
              setDisplayAlbumYear(year || '')
            }}
          />
        </div>
        <div className="resizer" onMouseDown={(e) => handleResizerMouseDown('album', e)} />
        <TrackListPanel 
          artist={displayArtist}
          album={displayAlbum}
          albumYear={displayAlbumYear}
          onPlayTrack={handlePlayTrack}
          onTracksLoaded={setAllTracksInfo}
        />
        <div className="resizer" onMouseDown={(e) => handleResizerMouseDown('lyrics', e)} />
        <div className="panel-wrapper" style={{ width: lyricsWidth }}>
          <LyricsPanel 
            artist={currentTrackInfo.artist}
            title={currentTrackInfo.title}
            album={selectedAlbum}
          />
        </div>
      </div>
      <PlayerPanel 
        currentTrack={currentTrack}
        trackList={currentTrackList}
        trackIndex={currentTrackIndex}
        onNextTrack={handleNextTrack}
        trackInfo={currentTrackInfo}
        onSetTrackIndex={handleSetTrackIndex}
      />
    </div>
  )
}

export default App
