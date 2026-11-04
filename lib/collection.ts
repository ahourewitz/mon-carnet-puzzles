import { env } from "cloudflare:workers";
import { eq,and,asc } from "drizzle-orm";
import { getDb } from "../db";
import { collections,puzzles } from "../db/schema";
import seed from "../db/seed.json";
import type { Puzzle } from "./puzzle";
import { SEED_REVISION,seedIdsAddedAfter } from "./seed-updates";
export async function readCollection(ownerId:string):Promise<Puzzle[]>{
  const db=getDb();
  const initialized=await db.select().from(collections).where(eq(collections.ownerId,ownerId)).get();
  if(!initialized||initialized.seedRevision<SEED_REVISION){
    const now=new Date().toISOString(),binding=env.DB!;
    const updateIds=initialized?seedIdsAddedAfter(initialized.seedRevision):null;
    const additions=updateIds?seed.filter(p=>updateIds.has(p.id)):seed;
    const statements=[];
    if(!initialized)statements.push(binding.prepare("INSERT OR IGNORE INTO collections (owner_id,initialized_at) VALUES (?,?)").bind(ownerId,now));
    for(const p of additions){
      // A matching wish has now been purchased; retain its other details.
      statements.push(binding.prepare("UPDATE puzzles SET collection_type='owned',updated_at=? WHERE owner_id=? AND collection_type='wishlist' AND lower(trim(title))=lower(trim(?)) AND lower(trim(brand))=lower(trim(?)) AND EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<?)").bind(now,ownerId,p.title,p.brand,ownerId,SEED_REVISION));
      // Only add a missing title once. Existing user edits and deletions are not replaced.
      statements.push(binding.prepare("INSERT OR IGNORE INTO puzzles (id,owner_id,title,brand,author,pieces_label,pieces_total,status,completion_date,date_precision,purchased_at,image_url,notes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<?) AND NOT EXISTS (SELECT 1 FROM puzzles WHERE owner_id=? AND lower(trim(title))=lower(trim(?)) AND lower(trim(brand))=lower(trim(?)))").bind(p.id,ownerId,p.title,p.brand,p.author,p.piecesLabel,p.piecesTotal,p.status,p.completionDate,p.datePrecision,p.purchasedAt,p.imageUrl,p.notes,now,now,ownerId,SEED_REVISION,ownerId,p.title,p.brand));
    }
    statements.push(binding.prepare("UPDATE collections SET seed_revision=? WHERE owner_id=? AND seed_revision<?").bind(SEED_REVISION,ownerId,SEED_REVISION));
    await binding.batch(statements);
  }
  const rows=await db.select().from(puzzles).where(eq(puzzles.ownerId,ownerId)).orderBy(asc(puzzles.createdAt),asc(puzzles.id));
  return rows.map(({ownerId:_owner,...p})=>p) as Puzzle[];
}
export const ownedPuzzle=(ownerId:string,id:string)=>and(eq(puzzles.ownerId,ownerId),eq(puzzles.id,id));
