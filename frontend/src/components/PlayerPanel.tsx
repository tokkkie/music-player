// PlayerPanel.tsx - プレイヤーコントロールUI
import './PlayerPanel.css'
import { usePlayer } from '../hooks/usePlayer'
import { cleanTitle } from '../utils/format'

interface PlayerPanelProps {
  currentTrack: string
  trackList: string[]
  trackIndex: number
  onNextTrack: () => void
  trackInfo: { artist: string; title: string }
  onSetTrackIndex?: (index: number) => void
}

// 時間を mm:ss 形式にフォーマット
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function PlayerPanel({ currentTrack, trackList, trackIndex, onNextTrack, trackInfo, onSetTrackIndex }: PlayerPanelProps) {
  const [state, actions] = usePlayer({
    currentTrack,
    trackList,
    trackIndex,
    onNextTrack,
    onSetTrackIndex,
  })

  const { isPlaying, volume, currentTime, duration, isMuted, repeatMode } = state
  const { handlePlayPause, handleStop, handleVolumeChange, handleMuteToggle, handleSeek, setRepeatMode } = actions

  return (
    <div className="player-panel">
      <div className="player-controls">
        <button className="control-btn" onClick={handlePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="control-btn" onClick={handleStop}>
          ⏹
        </button>
      </div>
      
      <div className="player-info-section">
        <div className="track-info">
          <div className="track-display">
            {trackInfo.title ? `${trackInfo.artist} / ${cleanTitle(trackInfo.title)}` : '\u00A0'}
          </div>
        </div>
        <div className="player-progress">
          <span className="time">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <div
            className="progress-bar-wrapper"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              const ratio = (e.clientX - rect.left) / rect.width
              const newTime = Math.max(0, Math.min(duration, ratio * duration))
              handleSeek(newTime)
            }}
          >
            <input
              type="range"
              className="progress-bar"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              style={{ '--progress': `${duration > 0 ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      <div className="repeat-controls">
        <button
          className={`repeat-btn ${repeatMode === 'one' ? 'active' : ''}`}
          onClick={() => setRepeatMode(repeatMode === 'one' ? 'none' : 'one')}
          title="1曲リピート"
          aria-label="1曲リピート"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m17 2 4 4-4 4"/>
            <path d="M3 14v1a4 4 0 0 0 4 4h10"/>
            <path d="m21 22-4-4 4-4"/>
            <path d="M21 10V9a4 4 0 0 0-4-4H7"/>
            <text x="12" y="15" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontWeight="bold">1</text>
          </svg>
        </button>
        <button
          className={`repeat-btn ${repeatMode === 'album' ? 'active' : ''}`}
          onClick={() => setRepeatMode(repeatMode === 'album' ? 'none' : 'album')}
          title="アルバムリピート"
          aria-label="アルバムリピート"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m17 2 4 4-4 4"/>
            <path d="M3 14v1a4 4 0 0 0 4 4h10"/>
            <path d="m21 22-4-4 4-4"/>
            <path d="M21 10V9a4 4 0 0 0-4-4H7"/>
          </svg>
        </button>
      </div>

      <div className="volume-control">
        <button 
          className={`volume-icon ${isMuted ? 'muted' : ''}`} 
          onClick={handleMuteToggle} 
          title={isMuted ? 'ミュート解除' : 'ミュート'}
        >
          {isMuted ? '🔇' : volume > 50 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
        </button>
        <div
          className="volume-slider-wrapper"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const newVolume = Math.max(0, Math.min(100, Math.round(ratio * 100)))
            handleVolumeChange(newVolume)
          }}
        >
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            style={{ '--volume': `${volume}%` } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  )
}

export default PlayerPanel
