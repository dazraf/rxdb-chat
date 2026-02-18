import { createDatabase } from './db.js';

const db = createDatabase();
const now = Date.now();

const posts = db.prepare('UPDATE posts SET _deleted = 1, updatedAt = ? WHERE _deleted = 0').run(now);
const comments = db.prepare('UPDATE comments SET _deleted = 1, updatedAt = ? WHERE _deleted = 0').run(now);

console.log(`Cleared ${posts.changes} posts and ${comments.changes} comments`);
