import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRxData, useRxCollection } from 'rxdb-hooks';
import { useAuth } from '../auth/AuthContext';
import { AvatarIcon, AVATAR_OPTIONS } from '../components/AvatarIcon';
import { MarkdownToolbar } from '../components/MarkdownToolbar';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import type { ProfileDoc } from 'shared/schemas';

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const collection = useRxCollection<ProfileDoc>('profiles');

  const targetId = userId ?? user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const { result: profiles, isFetching } = useRxData<ProfileDoc>('profiles', (collection) =>
    collection.findOne(targetId),
  );
  const profile = profiles[0] as unknown as ProfileDoc | undefined;

  const [editing, setEditing] = useState(false);
  const [avatarId, setAvatarId] = useState('default');
  const [about, setAbout] = useState('');
  const [preview, setPreview] = useState(false);
  const { textareaRef, insertMarkdown } = useMarkdownEditor(setAbout);

  const startEdit = useCallback(() => {
    setAvatarId(profile?.avatarId ?? 'default');
    setAbout(profile?.about ?? '');
    setPreview(false);
    setEditing(true);
  }, [profile]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const saveProfile = useCallback(async () => {
    if (!user || !collection) return;
    await collection.upsert({
      id: user.id,
      username: user.username,
      avatarId,
      about,
      themeMode: profile?.themeMode ?? 'system',
      updatedAt: Date.now(),
      _deleted: false,
    });
    setEditing(false);
  }, [user, collection, avatarId, about]);

  if (isFetching && !profile) return <p>Loading...</p>;

  if (!profile && !isOwnProfile) {
    return (
      <div className="profile-page">
        <Link to="/" className="back-link">&larr; Back to posts</Link>
        <p>Profile not found.</p>
      </div>
    );
  }

  const displayName = profile?.username ?? user?.username ?? 'Unknown';
  const displayAvatar = profile?.avatarId ?? 'default';
  const displayAbout = profile?.about ?? '';

  if (editing) {
    return (
      <div className="profile-page">
        <Link to="/" className="back-link">&larr; Back to posts</Link>
        <h1>Edit Profile</h1>
        <div className="profile-header">
          <div className="profile-avatar-large">
            <AvatarIcon avatarId={avatarId} size={80} />
          </div>
          <h2>{displayName}</h2>
        </div>

        <div className="avatar-picker">
          <h3>Choose Avatar</h3>
          <div className="avatar-grid">
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`avatar-option${avatarId === opt.id ? ' selected' : ''}`}
                onClick={() => setAvatarId(opt.id)}
                title={opt.label}
              >
                <opt.Component size={32} />
              </button>
            ))}
          </div>
        </div>

        <div className="profile-about-edit">
          <h3>About</h3>
          <MarkdownToolbar
            onAction={insertMarkdown}
            preview={preview}
            onTogglePreview={() => setPreview((p) => !p)}
          />
          {preview ? (
            <div className="md-preview">
              <MarkdownRenderer content={about} />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={5}
              placeholder="Tell others about yourself..."
            />
          )}
        </div>

        <div className="profile-actions">
          <button className="btn" onClick={saveProfile}>Save</button>
          <button className="btn-link" onClick={cancelEdit}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Link to="/" className="back-link">&larr; Back to posts</Link>
      <div className="profile-header">
        <div className="profile-avatar-large">
          <AvatarIcon avatarId={displayAvatar} size={80} />
        </div>
        <h2>{displayName}</h2>
      </div>

      {displayAbout && (
        <div className="profile-about">
          <h3>About</h3>
          <MarkdownRenderer content={displayAbout} />
        </div>
      )}

      {isOwnProfile && (
        <button className="btn" onClick={startEdit}>Edit Profile</button>
      )}
    </div>
  );
}
