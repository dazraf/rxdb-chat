import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  src: string;
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}

export function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateDuration = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => setPlaying(false);

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', onEnded);
      cancelAnimationFrame(rafRef.current);
    };
  }, [src]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
    } else {
      audio.play();
      rafRef.current = requestAnimationFrame(tick);
    }
    setPlaying(!playing);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="custom-audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" className="audio-play-btn" onClick={togglePlay}>
        {playing ? '⏸' : '▶'}
      </button>
      <span className="audio-time">{formatTime(currentTime)}</span>
      <input
        type="range"
        className="audio-seek"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
      />
      <span className="audio-time">{formatTime(duration)}</span>
    </div>
  );
}
