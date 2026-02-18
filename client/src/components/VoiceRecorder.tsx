import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface Props {
  onRecorded: (file: File) => void;
}

export function VoiceRecorder({ onRecorded }: Props) {
  const { state, audioUrl, start, stop, discard, getFile } = useVoiceRecorder();

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
        <button type="button" className="voice-recorder-btn" onClick={start}>
          Mic
        </button>
      )}

      {state === 'recording' && (
        <button type="button" className="voice-recorder-btn recording" onClick={stop}>
          Stop
        </button>
      )}

      {state === 'preview' && audioUrl && (
        <div className="voice-preview">
          <audio src={audioUrl} controls />
          <button type="button" className="voice-attach" onClick={handleAttach}>
            Attach
          </button>
          <button type="button" className="voice-discard" onClick={discard}>
            Discard
          </button>
        </div>
      )}
    </>
  );
}
