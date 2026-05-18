import { useEffect, useState } from 'react'
import './LyricsPanel.css'

interface LyricsPanelProps {
  artist: string
  title: string
  album: string
}

function LyricsPanel({ artist, title, album }: LyricsPanelProps) {
  const [lyrics, setLyrics] = useState<string>('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let cancelled = false

    const loadLyrics = async () => {
      if (!artist || !title) {
        if (!cancelled) setLyrics('')
        return
      }

      if (!cancelled) setLoading(true)
      try {
        if (window.go?.app?.App?.GetLyrics) {
          const result = await window.go.app.App.GetLyrics(artist, title, album)
          if (!cancelled) {
            setLyrics(result || '')
          }
        }
      } catch (error) {
        if (!cancelled) setLyrics('')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLyrics()

    return () => {
      cancelled = true
    }
  }, [artist, title])

  return (
    <div className="lyrics-panel">
      <div className="panel-header">Lyrics</div>
      <div className="lyrics-content">
        {loading && <p className="lyrics-placeholder">読み込み中...</p>}
        {!loading && !lyrics && <p className="lyrics-placeholder">歌詞はここに表示されます</p>}
        {!loading && lyrics && (
          <pre className="lyrics-text">{lyrics.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]\s*/g, '')}</pre>
        )}
      </div>
    </div>
  )
}

export default LyricsPanel
