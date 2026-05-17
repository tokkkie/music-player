// usePanelResize.ts - パネルリサイズ処理
import { useState, useEffect, useRef, useCallback } from 'react'

const MIN_PANEL_WIDTH = 120
const DEFAULT_ARTIST_WIDTH = 200
const DEFAULT_ALBUM_WIDTH = 250
const DEFAULT_LYRICS_WIDTH = 300

type PanelType = 'artist' | 'album' | 'lyrics'

interface PanelWidths {
  artistWidth: number
  albumWidth: number
  lyricsWidth: number
}

interface UsePanelResizeReturn extends PanelWidths {
  handleResizerMouseDown: (type: PanelType, e: React.MouseEvent) => void
}

export function usePanelResize(): UsePanelResizeReturn {
  // パネル幅（localStorage永続化）
  const [artistWidth, setArtistWidth] = useState(() => {
    const saved = localStorage.getItem('panel:artistWidth')
    return saved ? parseInt(saved, 10) : DEFAULT_ARTIST_WIDTH
  })
  const [albumWidth, setAlbumWidth] = useState(() => {
    const saved = localStorage.getItem('panel:albumWidth')
    return saved ? parseInt(saved, 10) : DEFAULT_ALBUM_WIDTH
  })
  const [lyricsWidth, setLyricsWidth] = useState(() => {
    const saved = localStorage.getItem('panel:lyricsWidth')
    return saved ? parseInt(saved, 10) : DEFAULT_LYRICS_WIDTH
  })

  // ドラッグ状態
  const dragRef = useRef<{ type: PanelType; startX: number; startWidth: number } | null>(null)

  // localStorage保存
  useEffect(() => {
    localStorage.setItem('panel:artistWidth', String(artistWidth))
  }, [artistWidth])
  useEffect(() => {
    localStorage.setItem('panel:albumWidth', String(albumWidth))
  }, [albumWidth])
  useEffect(() => {
    localStorage.setItem('panel:lyricsWidth', String(lyricsWidth))
  }, [lyricsWidth])

  // リサイザーのマウスダウンハンドラ
  const handleResizerMouseDown = useCallback((type: PanelType, e: React.MouseEvent) => {
    e.preventDefault()
    const startWidth = type === 'artist' ? artistWidth : type === 'album' ? albumWidth : lyricsWidth
    dragRef.current = { type, startX: e.clientX, startWidth }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return
      const { type: t, startX, startWidth } = dragRef.current
      const delta = moveEvent.clientX - startX
      // Lyricsパネルは右ドラッグでTrackListPanelが広がるので反転
      const signedDelta = t === 'lyrics' ? -delta : delta
      const newWidth = Math.max(MIN_PANEL_WIDTH, startWidth + signedDelta)
      if (t === 'artist') setArtistWidth(newWidth)
      else if (t === 'album') setAlbumWidth(newWidth)
      else setLyricsWidth(newWidth)
    }

    const handleMouseUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [artistWidth, albumWidth, lyricsWidth])

  return {
    artistWidth,
    albumWidth,
    lyricsWidth,
    handleResizerMouseDown,
  }
}
