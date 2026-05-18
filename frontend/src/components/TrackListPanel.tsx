import { useEffect, useState } from 'react'
import './TrackListPanel.css'
import type { MusicTrack } from '../types/wails'
import { cleanTitle } from '../utils/format'

interface TrackListPanelProps {
  artist: string
  album: string
  albumYear?: string
  onPlayTrack: (track: string, trackList: string[], index: number, artist: string, title: string) => void
  onTracksLoaded?: (tracks: Array<{artist: string, title: string}>) => void
}

function TrackListPanel({ artist, album, albumYear, onPlayTrack, onTracksLoaded }: TrackListPanelProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null)
  const [albumArt, setAlbumArt] = useState<string>('')

  useEffect(() => {
    loadTracks()
    loadAlbumArt()
    setSelectedTrack(null)
  }, [artist, album])

  const loadAlbumArt = async () => {
    if (!artist || !album) {
      setAlbumArt('')
      return
    }
    try {
      if (window.go?.app?.App?.GetAlbumArt) {
        const art = await window.go.app.App.GetAlbumArt(artist, album)
        setAlbumArt(art || '')
      }
    } catch (error) {
      setAlbumArt('')
    }
  }

  const loadTracks = async () => {
    if (!artist || !album) {
      setTracks([])
      if (onTracksLoaded) {
        onTracksLoaded([])
      }
      return
    }

    try {
      if (window.go?.app?.App?.GetTracksByAlbum) {
        const trackList = await window.go.app.App.GetTracksByAlbum(artist, album)
        setTracks(trackList)
        
        if (onTracksLoaded) {
          const tracksInfo = trackList.map(t => ({ artist: t.artist, title: cleanTitle(t.title) }))
          onTracksLoaded(tracksInfo)
        }
      }
    } catch (error) {
      setTracks([])
      if (onTracksLoaded) {
        onTracksLoaded([])
      }
    }
  }

  return (
    <div className="track-list-panel">
      <div className="panel-header">
        <div className="album-header">
          {albumArt && (
            <img
              className="album-art"
              src={albumArt}
              alt={`${album} cover`}
            />
          )}
          <div className="album-info">
            {album && (
              <>
                <h2>{album}</h2>
                {albumYear && <p className="album-year-info">{albumYear}</p>}
                <p>{artist}</p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="track-list">
        {tracks.map((track, index) => (
          <div
            key={index}
            className={`track-item ${selectedTrack === index ? 'selected' : ''}`}
            onClick={() => setSelectedTrack(index)}
            onDoubleClick={() => {
              const trackPaths = tracks.map(t => t.filePath)
              onPlayTrack(track.filePath, trackPaths, index, track.artist, cleanTitle(track.title))
            }}
          >
            <div className="track-number">{index + 1}</div>
            <div className="track-title">{cleanTitle(track.title)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TrackListPanel
