export interface PostDoc {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: number;
  _deleted: boolean;
}

export interface CommentDoc {
  id: string;
  postId: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: number;
  _deleted: boolean;
}

export interface AttachmentDoc {
  id: string;
  parentId: string;
  parentType: 'post' | 'comment';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  uploadStatus: 'pending' | 'uploaded';
  authorId: string;
  createdAt: string;
  updatedAt: number;
  _deleted: boolean;
}

export interface ReplicationCheckpoint {
  id: string;
  updatedAt: number;
}
