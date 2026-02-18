import type { RxJsonSchema } from 'rxdb';
import type { PostDoc, CommentDoc, AttachmentDoc } from 'shared/schemas';

export const postSchema: RxJsonSchema<PostDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    title: { type: 'string' },
    body: { type: 'string' },
    authorId: { type: 'string', maxLength: 36 },
    authorName: { type: 'string' },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: {
      type: 'number',
      minimum: 0,
      maximum: 1e15,
      multipleOf: 1,
    },
    _deleted: { type: 'boolean' },
  },
  required: ['id', 'title', 'body', 'authorId', 'authorName', 'createdAt', 'updatedAt', '_deleted'],
  indexes: ['updatedAt', ['authorId', 'updatedAt']],
};

export const commentSchema: RxJsonSchema<CommentDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    postId: { type: 'string', maxLength: 36 },
    body: { type: 'string' },
    authorId: { type: 'string', maxLength: 36 },
    authorName: { type: 'string' },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: {
      type: 'number',
      minimum: 0,
      maximum: 1e15,
      multipleOf: 1,
    },
    _deleted: { type: 'boolean' },
  },
  required: ['id', 'postId', 'body', 'authorId', 'authorName', 'createdAt', 'updatedAt', '_deleted'],
  indexes: ['updatedAt', ['postId', 'updatedAt']],
};

export const attachmentSchema: RxJsonSchema<AttachmentDoc> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    parentId: { type: 'string', maxLength: 36 },
    parentType: { type: 'string', maxLength: 10 },
    filename: { type: 'string' },
    mimeType: { type: 'string', maxLength: 100 },
    sizeBytes: {
      type: 'number',
      minimum: 0,
      maximum: 1e10,
      multipleOf: 1,
    },
    storageUrl: { type: 'string' },
    uploadStatus: { type: 'string', maxLength: 10 },
    authorId: { type: 'string', maxLength: 36 },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: {
      type: 'number',
      minimum: 0,
      maximum: 1e15,
      multipleOf: 1,
    },
    _deleted: { type: 'boolean' },
  },
  required: [
    'id', 'parentId', 'parentType', 'filename', 'mimeType', 'sizeBytes',
    'storageUrl', 'uploadStatus', 'authorId', 'createdAt', 'updatedAt', '_deleted',
  ],
  indexes: ['updatedAt', ['parentId', 'updatedAt']],
};
