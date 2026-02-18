import { Subject } from 'rxjs';

export interface SseEvent {
  collection: string;
  documents: unknown[];
}

export const sseSubject = new Subject<SseEvent>();
