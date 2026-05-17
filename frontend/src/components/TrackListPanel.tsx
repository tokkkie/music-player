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
      if (window.go?.main?.App?.GetAlbumArt) {
        const art = await window.go.main.App.GetAlbumArt(artist, album)
        setAlbumArt(art || '')
      }
    } catch (error) {
      console.error('Failed to load album art:', error)
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
      if (window.go?.main?.App?.GetTracksByAlbum) {
        const trackList = await window.go.main.App.GetTracksByAlbum(artist, album)
        setTracks(trackList)
        
        // 親に全トラック情報を通知
        if (onTracksLoaded) {
          const tracksInfo = trackList.map(t => ({ artist: t.artist, title: cleanTitle(t.title) }))
          onTracksLoaded(tracksInfo)
        }
      } else {
        setTracks([
          { artist: artist, album: album, title: '大迷惑', filePath: '/path/to/track1.mp3' },
        ])
        if (onTracksLoaded) {
          onTracksLoaded([
            { artist: artist, title: '大迷惑' },
          ])
        }
      }
    } catch (error) {
      console.error('Failed to load tracks:', error)
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
              console.log('Playing:', track.filePath)
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
