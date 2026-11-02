import type { Puzzle } from "./puzzle";

/** Storage supplied by the standalone, browser-only edition. */
export interface BrowserStorage {
  save(puzzle: Puzzle, isNew: boolean): Promise<Puzzle>;
  remove(id: string): Promise<void>;
  upload(file: File): Promise<string>;
  backup(): Promise<Blob>;
  restore(file: File): Promise<Puzzle[]>;
}
