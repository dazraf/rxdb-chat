import { useState } from 'react';
import { useRxData } from 'rxdb-hooks';
import type { AttachmentDoc } from 'shared/schemas';
import { AudioPlayer } from './AudioPlayer';

export function AttachmentDisplay({ parentId }: { parentId: string }) {
  const { result } = useRxData<AttachmentDoc>('attachments', (collection) =>
    collection.find({
      selector: { parentId },
      sort: [{ createdAt: 'asc' }],
    }),
  );

  const attachments = result as unknown as AttachmentDoc[];
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="attachment-grid">
      {attachments.map((att) => {
        if (att.uploadStatus === 'pending' && !att.storageUrl) {
          return (
            <span key={att.id} className="pending-file">
              {att.filename} (uploading...)
            </span>
          );
        }

        if (att.mimeType.startsWith('image/')) {
          return <ImageAttachment key={att.id} src={att.storageUrl} alt={att.filename} />;
        }

        if (att.mimeType.startsWith('video/')) {
          return (
            <video key={att.id} src={att.storageUrl} controls preload="metadata">
              Your browser does not support video playback.
            </video>
          );
        }

        if (att.mimeType.startsWith('audio/')) {
          return (
            <div key={att.id} className="audio-attachment">
              <span className="audio-label">{att.filename}</span>
              <AudioPlayer src={att.storageUrl} />
            </div>
          );
        }

        return (
          <a key={att.id} href={att.storageUrl} target="_blank" rel="noopener noreferrer">
            {att.filename}
          </a>
        );
      })}
    </div>
  );
}

function ImageAttachment({ src, alt }: { src: string; alt: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className="attachment-thumb"
        onClick={() => setExpanded(true)}
        title="Click to enlarge"
      />
      {expanded && (
        <div className="attachment-lightbox" onClick={() => setExpanded(false)}>
          <img src={src} alt={alt} />
        </div>
      )}
    </>
  );
}
