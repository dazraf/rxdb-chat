import { type ComponentType } from 'react';
import { DefaultAvatar } from './avatars/DefaultAvatar';
import { CatAvatar } from './avatars/CatAvatar';
import { DogAvatar } from './avatars/DogAvatar';
import { FoxAvatar } from './avatars/FoxAvatar';
import { OwlAvatar } from './avatars/OwlAvatar';
import { BearAvatar } from './avatars/BearAvatar';
import { RabbitAvatar } from './avatars/RabbitAvatar';
import { PandaAvatar } from './avatars/PandaAvatar';

interface AvatarOption {
  id: string;
  label: string;
  Component: ComponentType<{ size?: number }>;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'default', label: 'Default', Component: DefaultAvatar },
  { id: 'cat', label: 'Cat', Component: CatAvatar },
  { id: 'dog', label: 'Dog', Component: DogAvatar },
  { id: 'fox', label: 'Fox', Component: FoxAvatar },
  { id: 'owl', label: 'Owl', Component: OwlAvatar },
  { id: 'bear', label: 'Bear', Component: BearAvatar },
  { id: 'rabbit', label: 'Rabbit', Component: RabbitAvatar },
  { id: 'panda', label: 'Panda', Component: PandaAvatar },
];

const AVATAR_MAP = new Map(AVATAR_OPTIONS.map((o) => [o.id, o.Component]));

export function AvatarIcon({ avatarId, size = 20 }: { avatarId: string; size?: number }) {
  const Component = AVATAR_MAP.get(avatarId) ?? DefaultAvatar;
  return <Component size={size} />;
}
