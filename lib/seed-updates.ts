// Keep these revisions aligned with the browser database version. They let an
// older collection receive only new additions, without restoring deleted items.
export const SEED_REVISION = 3;

const additions = [
  { revision: 2, first: 22, last: 26 },
  { revision: 3, first: 27, last: 42 },
];

export function seedIdsAddedAfter(revision: number): Set<string> {
  const ids = new Set<string>();
  for (const group of additions) {
    if (group.revision <= revision) continue;
    for (let n = group.first; n <= group.last; n++) {
      ids.add(`pdf-${String(n).padStart(2,"0")}`);
    }
  }
  return ids;
}
