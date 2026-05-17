# Music Player

A simple MP3 player built with Wails + React + TypeScript.

Most MP3 players have features I don't need or lack the ones I want. This software simply displays your local directory structure, shows album art and lyrics, and plays music. Nothing more.

## Features

- **Artist Panel**: Lists artists sorted A-Z (ignoring "The" prefix)
- **Album Panel**: Shows albums by selected artist, sorted by year
- **Track List Panel**: Displays track list and album art for selected album
- **Lyrics Panel**: Fetches lyrics from ID3 tags or LRCLIB API
- **Player Panel**: Play/pause/stop, seek bar, volume control, repeat (track/album)
- **Settings**: Music directory selection, font size adjustment (80%-150%)
- **State Persistence**: Panel widths, last selected artist/album, and font size saved to localStorage

## Installation

### Pre-built Binaries

Download from [Releases](https://github.com/tokkkie/music-player/releases).

### Build from Source

Requires [Wails](https://wails.io/) to be installed.

```bash
wails build
```

## Usage

1. After launching, click the ⚙️ icon in the artist panel to select your music directory
2. Double-click Artist → Album → Track to play
3. Panel widths can be adjusted by dragging (settings are auto-saved)

## Music File Structure

Organize your music files as follows:

```text
/path/to/music/
├── Artist Name/
│   ├── Album Name/
│   │   ├── 01 Track Title.mp3
│   │   ├── 02 Track Title.mp3
│   │   └── ...
│   └── ...
└── ...
```

## Development

See [docs/development.md](docs/development.md) for development setup instructions.
