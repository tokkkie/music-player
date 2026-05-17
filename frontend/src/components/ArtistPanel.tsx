import { useEffect, useState, useRef } from 'react'
import './ArtistPanel.css'
import '../types/wails.ts'

interface ArtistPanelProps {
  selectedArtist: string
  dataReady: boolean
  onSelectArtist: (artist: string) => void
  fontScale: number
  onFontScaleChange: (scale: number) => void
}

function ArtistPanel({ selectedArtist, dataReady, onSelectArtist, fontScale, onFontScaleChange }: ArtistPanelProps) {
  const [artists, setArtists] = useState<string[]>([])
  const [searchBuffer, setSearchBuffer] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const searchTimeoutRef = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dataReady) {
      loadArtists()
    }
  }, [dataReady])

  const loadArtists = async () => {
    try {
      if (window.go?.app?.App?.GetArtists) {
        const artistList = await window.go.app.App.GetArtists()
        setArtists(artistList)
      } else {
        setArtists(['UNICORN', 'The Beatles', 'Queen', 'Led Zeppelin'])
      }
    } catch (error) {
      console.error('Failed to load artists:', error)
    }
  }

  const handleSelectDirectory = async () => {
    setShowSettings(false)
    try {
      if (window.go?.app?.App?.OpenDirectoryDialog) {
        const selectedPath = await window.go.app.App.OpenDirectoryDialog()
        if (selectedPath) {
          if (window.go?.app?.App?.SetMusicDirectory) {
            await window.go.app.App.SetMusicDirectory(selectedPath)
            loadArtists()
          }
        }
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 特殊キーは無視
    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
      return
    }

    // 検索バッファに追加
    const newBuffer = searchBuffer + e.key.toLowerCase()
    setSearchBuffer(newBuffer)

    // 検索バッファに一致するアーティストを探す
    const matchIndex = artists.findIndex(artist => 
      artist.toLowerCase().startsWith(newBuffer)
    )

    if (matchIndex !== -1 && listRef.current) {
      // 一致するアーティストまでスクロール
      const artistElements = listRef.current.querySelectorAll('.artist-item')
      if (artistElements[matchIndex]) {
        artistElements[matchIndex].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }
    }

    // タイムアウトをクリア
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 1秒後に検索バッファをクリア
    searchTimeoutRef.current = setTimeout(() => {
      setSearchBuffer('')
    }, 1000)
  }

  return (
    <div className="artist-panel" onKeyDown={handleKeyDown}>
      <div className="panel-header">
        <span>Artists</span>
        <div className="settings-wrapper" ref={settingsRef}>
          <button className="settings-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
            ⚙️
          </button>
          {showSettings && (
            <div className="settings-popup">
              {!showFontSize ? (
                <>
                  <button className="settings-item" onClick={handleSelectDirectory}>
                    Set Music Directory
                  </button>
                  <button className="settings-item" onClick={() => setShowFontSize(true)}>
                    Font Size
                  </button>
                </>
              ) : (
                <div className="font-size-panel">
                  <button className="settings-back" onClick={() => setShowFontSize(false)}>
                    ← Back
                  </button>
                  <label className="font-size-label">
                    Font Size: {Math.round(fontScale * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0.8}
                    max={1.5}
                    step={0.05}
                    value={fontScale}
                    onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
                    className="font-size-slider"
                    style={{ '--font-progress': `${((fontScale - 0.8) / 0.7) * 100}%` } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className="artist-list"
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {artists.map((artist) => (
          <div
            key={artist}
            className={`artist-item ${selectedArtist === artist ? 'selected' : ''}`}
            onClick={() => onSelectArtist(artist)}
          >
            {artist}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ArtistPanel
