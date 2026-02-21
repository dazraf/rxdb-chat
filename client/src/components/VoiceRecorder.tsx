import { useEffect } from 'react';
import { useVoiceRecorder, type RecorderState } from '../hooks/useVoiceRecorder';
import { AudioPlayer } from './AudioPlayer';
import { MicrophoneIcon } from './MicrophoneIcon';

interface Props {
  onRecorded: (file: File) => void;
  onStateChange?: (state: RecorderState) => void;
}

export function VoiceRecorder({ onRecorded, onStateChange }: Props) {
  const { state, audioUrl, start, stop, discard, getFile } = useVoiceRecorder();

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  function handleAttach() {
    const file = getFile();
    if (file) {
      onRecorded(file);
      discard();
    }
  }

  return (
    <>
      {state === 'idle' && (
        <button type="button" className="voice-recorder-btn" onClick={start} title="Record voice note">
          <MicrophoneIcon size={20} />
        </button>
      )}

      {state === 'recording' && (
        <button type="button" className="voice-recorder-btn recording" onClick={stop}>
          Stop recording
        </button>
      )}

      {state === 'preview' && audioUrl && (
        <div className="voice-preview">
          <AudioPlayer src={audioUrl} />
          <div className="voice-preview-actions">
            <button type="button" className="voice-attach" onClick={handleAttach}>
              Attach
            </button>
            <button type="button" className="voice-discard" onClick={discard}>
              Discard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
