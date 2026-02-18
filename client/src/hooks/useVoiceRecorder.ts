import { useState, useRef, useCallback } from 'react';

export type RecorderState = 'idle' | 'recording' | 'preview';

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const recordedBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBlob(recordedBlob);
        setAudioUrl(URL.createObjectURL(recordedBlob));
        setState('preview');
      };

      recorder.start(1000); // collect data every second
      setState('recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setBlob(null);
    setAudioUrl(null);
    setState('idle');
  }, [audioUrl]);

  const getFile = useCallback((): File | null => {
    if (!blob) return null;
    return new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
  }, [blob]);

  return { state, audioUrl, start, stop, discard, getFile };
}
