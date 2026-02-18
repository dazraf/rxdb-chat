import { useCallback } from 'react';
import { useRxCollection } from 'rxdb-hooks';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../auth/AuthContext';
import { serverOnline$ } from '../database/replication';
import { enqueue } from '../database/uploadQueue';
import type { AttachmentDoc } from 'shared/schemas';
import { MAX_FILE_SIZE } from 'shared/constants';

export function useAttachmentUpload() {
  const collection = useRxCollection<AttachmentDoc>('attachments');
  const { user, token } = useAuth();

  const uploadFile = useCallback(
    async (
      file: File | Blob,
      parentId: string,
      parentType: 'post' | 'comment',
      filename?: string,
    ): Promise<string | null> => {
      if (!collection || !user || !token) return null;

      const name = filename || (file instanceof File ? file.name : 'recording.webm');
      const size = file.size;

      if (size > MAX_FILE_SIZE) {
        throw new Error(`File too large (${(size / 1024 / 1024).toFixed(1)}MB). Max is 5MB.`);
      }

      const id = uuidv4();
      const isOnline = serverOnline$.getValue();

      let storageUrl = '';
      let uploadStatus: 'pending' | 'uploaded' = 'pending';

      if (isOnline) {
        try {
          const form = new FormData();
          form.append('file', file, name);
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          if (res.ok) {
            const data = await res.json();
            storageUrl = data.storageUrl;
            uploadStatus = 'uploaded';
          } else {
            throw new Error('Upload failed');
          }
        } catch {
          // Fall through to offline queue
        }
      }

      if (uploadStatus === 'pending') {
        await enqueue({
          id,
          blob: file instanceof Blob ? file : file,
          filename: name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: size,
        });
      }

      await collection.insert({
        id,
        parentId,
        parentType,
        filename: name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: size,
        storageUrl,
        uploadStatus,
        authorId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        _deleted: false,
      });

      return id;
    },
    [collection, user, token],
  );

  return { uploadFile };
}
