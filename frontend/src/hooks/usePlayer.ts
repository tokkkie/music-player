// usePlayer.ts - プレイヤー状態管理とイベント処理
import { useState, useEffect, useCallback } from 'react'
import '../types/wails.ts'

export type RepeatMode = 'none' | 'one' | 'album'

interface UsePlayerOptions {
  currentTrack: string
  trackList: string[]
  trackIndex: number
  onNextTrack: () => void
  onSetTrackIndex?: (index: number) => void
}

interface PlayerState {
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  isMuted: boolean
  repeatMode: RepeatMode
}

interface PlayerActions {
  handlePlayPause: () => Promise<void>
  handleStop: () => Promise<void>
  handleVolumeChange: (newVolume: number) => Promise<void>
  handleMuteToggle: () => Promise<void>
  handleSeek: (time: number) => Promise<void>
  setRepeatMode: (mode: RepeatMode) => void
}

export function usePlayer(options: UsePlayerOptions): [PlayerState, PlayerActions] {
  const { currentTrack, trackList, trackIndex, onNextTrack, onSetTrackIndex } = options

  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(50)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')

  // トラック変更時に再生開始
  useEffect(() => {
    const loadTrack = async () => {
      if (currentTrack && window.go?.main?.App?.PlayTrack) {
        await window.go.main.App.PlayTrack(currentTrack)
        setIsPlaying(true)
        if (window.go?.main?.App?.GetPlayerState) {
          const state = await window.go.main.App.GetPlayerState()
          setDuration(state.duration)
        }
      }
    }
    loadTrack()
  }, [currentTrack])

  // トラック終了時の処理
  const handleTrackEnded = useCallback(async () => {
    if (repeatMode === 'one') {
      // 1曲リピート
      if (currentTrack && window.go?.main?.App?.PlayTrack) {
        await window.go.main.App.PlayTrack(currentTrack)
        setIsPlaying(true)
        setCurrentTime(0)
        if (window.go?.main?.App?.GetPlayerState) {
          const state = await window.go.main.App.GetPlayerState()
          setDuration(state.duration)
        }
      }
    } else if (repeatMode === 'album') {
      // アルバムリピート
      if (trackIndex < trackList.length - 1) {
        onNextTrack()
      } else if (trackList.length > 0) {
        // アルバムの最後なので最初に戻る
        if (window.go?.main?.App?.PlayTrack) {
          await window.go.main.App.PlayTrack(trackList[0])
          setIsPlaying(true)
          setCurrentTime(0)
          if (onSetTrackIndex) onSetTrackIndex(0)
          if (window.go?.main?.App?.GetPlayerState) {
            const state = await window.go.main.App.GetPlayerState()
            setDuration(state.duration)
          }
        }
      }
    } else {
      // リピートなし
      if (trackIndex < trackList.length - 1) {
        onNextTrack()
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }
  }, [repeatMode, currentTrack, trackList, trackIndex, onNextTrack, onSetTrackIndex])

  // Wailsイベントリスナー
  useEffect(() => {
    if (window.runtime?.EventsOn) {
      window.runtime.EventsOn('playStateChanged', (playing: boolean) => {
        setIsPlaying(playing)
      })
      window.runtime.EventsOn('trackStopped', () => {
        setCurrentTime(0)
      })
      window.runtime.EventsOn('progressUpdate', (time: number) => {
        setCurrentTime(time)
      })
      window.runtime.EventsOn('trackEnded', () => {
        handleTrackEnded()
      })
      window.runtime.EventsOn('trackChanged', async () => {
        if (window.go?.main?.App?.GetPlayerState) {
          const state = await window.go.main.App.GetPlayerState()
          setDuration(state.duration)
        }
      })
    }

    return () => {
      if (window.runtime?.EventsOff) {
        window.runtime.EventsOff('playStateChanged')
        window.runtime.EventsOff('trackStopped')
        window.runtime.EventsOff('progressUpdate')
        window.runtime.EventsOff('trackEnded')
        window.runtime.EventsOff('trackChanged')
      }
    }
  }, [handleTrackEnded])

  // 再生/一時停止
  const handlePlayPause = useCallback(async () => {
    try {
      if (isPlaying) {
        if (window.go?.main?.App?.PauseTrack) {
          await window.go.main.App.PauseTrack()
          setIsPlaying(false)
        }
      } else {
        if (window.go?.main?.App?.ResumeTrack) {
          await window.go.main.App.ResumeTrack()
          setIsPlaying(true)
        }
      }
    } catch (error) {
      console.error('Play/Pause error:', error)
    }
  }, [isPlaying])

  // 停止
  const handleStop = useCallback(async () => {
    try {
      if (window.go?.main?.App?.StopTrack) {
        await window.go.main.App.StopTrack()
        setIsPlaying(false)
        setCurrentTime(0)
      }
    } catch (error) {
      console.error('Stop error:', error)
    }
  }, [])

  // 音量変更
  const handleVolumeChange = useCallback(async (newVolume: number) => {
    setVolume(newVolume)
    if (newVolume > 0) {
      setIsMuted(false)
      setPreviousVolume(newVolume)
    } else {
      setIsMuted(true)
    }
    try {
      if (window.go?.main?.App?.SetVolume) {
        await window.go.main.App.SetVolume(newVolume / 100)
      }
    } catch (error) {
      console.error('Volume change error:', error)
    }
  }, [])

  // ミュート切り替え
  const handleMuteToggle = useCallback(async () => {
    if (isMuted) {
      const restoreVolume = previousVolume > 0 ? previousVolume : 50
      setVolume(restoreVolume)
      setIsMuted(false)
      try {
        if (window.go?.main?.App?.SetVolume) {
          await window.go.main.App.SetVolume(restoreVolume / 100)
        }
      } catch (error) {
        console.error('Unmute error:', error)
      }
    } else {
      setPreviousVolume(volume)
      setVolume(0)
      setIsMuted(true)
      try {
        if (window.go?.main?.App?.SetVolume) {
          await window.go.main.App.SetVolume(0)
        }
      } catch (error) {
        console.error('Mute error:', error)
      }
    }
  }, [isMuted, previousVolume, volume])

  // シーク
  const handleSeek = useCallback(async (time: number) => {
    setCurrentTime(time)
    try {
      if (window.go?.main?.App?.SeekTo) {
        await window.go.main.App.SeekTo(time)
      }
    } catch (error) {
      console.error('Seek error:', error)
    }
  }, [])

  const state: PlayerState = {
    isPlaying,
    volume,
    currentTime,
    duration,
    isMuted,
    repeatMode,
  }

  const actions: PlayerActions = {
    handlePlayPause,
    handleStop,
    handleVolumeChange,
    handleMuteToggle,
    handleSeek,
    setRepeatMode,
  }

  return [state, actions]
}
