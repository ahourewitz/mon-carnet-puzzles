// Keep these revisions aligned with the browser database version. They let an
// older collection receive only new additions, without restoring deleted items.
export const SEED_REVISION = 5;

const additions = [
  { revision: 2, first: 22, last: 26 },
  { revision: 3, first: 27, last: 42 },
  { revision: 5, first: 43, last: 61 },
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

// Status changes are separate from additions so removed puzzles stay removed.
const completionUpdates = [
  { revision: 4, ids: ["pdf-22", "pdf-23", "pdf-24", "pdf-26", "pdf-41"] },
];

export function seedCompletionIdsUpdatedAfter(revision: number): Set<string> {
  return new Set(completionUpdates.filter(update => update.revision > revision).flatMap(update => update.ids));
}

// The owner explicitly removed these titles from the collection in revision 5.
const removals = [
  { revision: 5, id: "pdf-12", title: "Lady and Trump", brand: "Schmidt" },
  { revision: 5, id: "pdf-15", title: "The Little Mermaid", brand: "Schmidt" },
  { revision: 5, id: "pdf-16", title: "Peter pan’s Never Land", brand: "Schmidt" },
  { revision: 5, id: "pdf-17", title: "Beauty and the Beast Dancing in the moonlight", brand: "Schmidt" },
  { revision: 5, id: "pdf-18", title: "Mickey and Minnie Sweetheart Cove", brand: "Schmidt" },
  { revision: 5, id: "pdf-20", title: "101 Dalmatians", brand: "Schmidt" },
];

export function seedRemovalsAfter(revision: number) {
  return removals.filter(item => item.revision > revision);
}
