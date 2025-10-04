import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './music-player.component.html',
  styles: []
})
export class MusicPlayerComponent {
  @Input() tracks: MusicTrack[] = [
    { id: 'lofi', name: 'Lo-fi Beats', url: '', icon: '🎵' },
    { id: 'rain', name: 'Sonidos de Lluvia', url: '', icon: '🌧️' },
    { id: 'nature', name: 'Naturaleza', url: '', icon: '🌿' },
    { id: 'cafe', name: 'Café Ambiente', url: '', icon: '☕' }
  ];
  @Input() selectedTrackId: string | null = null;
  @Input() isPlaying: boolean = false;
  @Input() volume: number = 50;

  @Output() trackSelected = new EventEmitter<string>();
  @Output() playbackToggled = new EventEmitter<boolean>();
  @Output() volumeChanged = new EventEmitter<number>();

  get currentTrack(): MusicTrack | undefined {
    return this.tracks.find(track => track.id === this.selectedTrackId);
  }

  selectTrack(trackId: string): void {
    this.selectedTrackId = trackId;
    this.trackSelected.emit(trackId);
  }

  togglePlayback(): void {
    this.isPlaying = !this.isPlaying;
    this.playbackToggled.emit(this.isPlaying);
  }

  onVolumeChange(): void {
    this.volumeChanged.emit(this.volume);
  }

  onTrackEnded(): void {
    this.isPlaying = false;
    this.playbackToggled.emit(false);
  }
}
