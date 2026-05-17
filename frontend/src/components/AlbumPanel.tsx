import { useEffect, useState } from 'react'
import './AlbumPanel.css'
import type { AlbumInfo } from '../types/wails'

interface AlbumPanelProps {
  artist: string
  selectedAlbum: string
  onSelectAlbum: (album: string, year?: string) => void
}

function AlbumPanel({ artist, selectedAlbum, onSelectAlbum }: AlbumPanelProps) {
  const [albums, setAlbums] = useState<AlbumInfo[]>([])

  useEffect(() => {
    loadAlbums()
  }, [artist])

  const loadAlbums = async () => {
    if (!artist) {
      setAlbums([])
      return
    }

    try {
      if (window.go?.main?.App?.GetAlbumsByArtist) {
        const albumList = await window.go.main.App.GetAlbumsByArtist(artist)
        setAlbums(albumList)
      } else {
        setAlbums([
          { artist: artist, album: 'クロスロード', year: '1993' },
          { artist: artist, album: 'ケダモノの嵐', year: '1994' },
        ])
      }
    } catch (error) {
      console.error('Failed to load albums:', error)
    }
  }

  return (
    <div className="album-panel">
      <div className="panel-header">Albums</div>
      <div className="album-list">
        {albums.map((album) => (
          <div
            key={album.album}
            className={`album-item ${selectedAlbum === album.album ? 'selected' : ''}`}
            onClick={() => onSelectAlbum(album.album, album.year)}
          >
            <div className="album-name">{album.album}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AlbumPanel
