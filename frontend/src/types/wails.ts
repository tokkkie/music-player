export interface MusicTrack {
  artist: string
  album: string
  title: string
  filePath: string
}

export interface AlbumInfo {
  artist: string
  album: string
  year: string
}

declare global {
  interface Window {
    go: {
      main: {
        App: {
          GetArtists(): Promise<string[]>
          SetMusicDirectory(path: string): Promise<void>
          OpenDirectoryDialog(): Promise<string>
          GetAlbumsByArtist(artist: string): Promise<AlbumInfo[]>
          GetTracksByAlbum(artist: string, album: string): Promise<MusicTrack[]>
          PlayTrack(filePath: string): Promise<void>
          PauseTrack(): Promise<void>
          ResumeTrack(): Promise<void>
          StopTrack(): Promise<void>
          SetVolume(volume: number): Promise<void>
          SeekTo(time: number): Promise<void>
          GetPlayerState(): Promise<{
            isPlaying: boolean
            currentTime: number
            duration: number
            volume: number
            track: string
          }>
          SaveLastSelection(artist: string, album: string): Promise<void>
          GetLastSelection(): Promise<{
            artist: string
            album: string
            year: string
          }>
          GetAlbumArt(artist: string, album: string): Promise<string>
          GetLyrics(artist: string, title: string, album: string): Promise<string>
        }
      }
    }
    runtime: {
      EventsOn(eventName: string, callback: (...args: any[]) => void): void
      EventsOff(eventName: string): void
    }
  }
}

export {}
