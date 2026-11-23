import { env } from "cloudflare:workers";
import { eq,and,asc } from "drizzle-orm";
import { getDb } from "../db";
import { collections,puzzles } from "../db/schema";
import seed from "../db/seed.json";
import type { Puzzle } from "./puzzle";
import { SEED_REVISION,seedIdsAddedAfter,seedCompletionIdsUpdatedAfter,seedRemovalsAfter } from "./seed-updates";
import { brandKey } from "./brands";
// The PDF uses a few abbreviated or misspelled brand names for the same publisher.
const sqlBrand=(value:string)=>{
  const key=`replace(replace(replace(replace(lower(trim(${value})),' ',''),'é','e'),'è','e'),'ê','e')`;
  return `(CASE ${key} WHEN 'pieces&piece' THEN 'pieces&peace' WHEN 'reverie' THEN 'reveriepuzzle' ELSE ${key} END)`;
};
const matchingBrand=`${sqlBrand("brand")}=?`;
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
      const comparableBrand=brandKey(p.brand).replace(/\s+/g,"");
      // A matching wish has now been purchased; retain its other details.
      statements.push(binding.prepare(`UPDATE puzzles SET collection_type='owned',updated_at=? WHERE owner_id=? AND collection_type='wishlist' AND lower(trim(title))=lower(trim(?)) AND ${matchingBrand} AND EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<?)`).bind(now,ownerId,p.title,comparableBrand,ownerId,SEED_REVISION));
      for(const theme of p.themes){
        // Preserve personal categories while adding the theme specified in the new PDF.
        statements.push(binding.prepare(`UPDATE puzzles SET themes=json_insert(themes,'$[#]',?) WHERE owner_id=? AND (id=? OR (lower(trim(title))=lower(trim(?)) AND ${matchingBrand})) AND json_array_length(themes)<12 AND NOT EXISTS (SELECT 1 FROM json_each(themes) WHERE lower(value)=lower(?)) AND EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<?)`).bind(theme,ownerId,p.id,p.title,comparableBrand,theme,ownerId,SEED_REVISION));
      }
      // Only add a missing title once. Existing user edits and deletions are not replaced.
      statements.push(binding.prepare(`INSERT OR IGNORE INTO puzzles (id,owner_id,title,brand,author,themes,pieces_label,pieces_total,status,completion_date,date_precision,purchased_at,image_url,notes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<?) AND NOT EXISTS (SELECT 1 FROM puzzles WHERE owner_id=? AND lower(trim(title))=lower(trim(?)) AND ${matchingBrand})`).bind(p.id,ownerId,p.title,p.brand,p.author,JSON.stringify(p.themes),p.piecesLabel,p.piecesTotal,p.status,p.completionDate,p.datePrecision,p.purchasedAt,p.imageUrl,p.notes,now,now,ownerId,SEED_REVISION,ownerId,p.title,comparableBrand));
    }
    if(initialized){
      if(initialized.seedRevision<7){
        for(const p of seed.filter(item=>item.themes.length)){
          // Fill only previously empty themes; do not replace personal categorisation.
          statements.push(binding.prepare("UPDATE puzzles SET themes=? WHERE owner_id=? AND themes='[]' AND EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<7) AND (id=? OR (NOT EXISTS (SELECT 1 FROM puzzles WHERE owner_id=? AND id=?) AND lower(trim(title))=lower(trim(?)) AND lower(trim(brand))=lower(trim(?)) AND 1=(SELECT count(*) FROM puzzles WHERE owner_id=? AND lower(trim(title))=lower(trim(?)) AND lower(trim(brand))=lower(trim(?)))))").bind(JSON.stringify(p.themes),ownerId,ownerId,p.id,ownerId,p.id,p.title,p.brand,ownerId,p.title,p.brand));
        }
      }
      const completionIds=seedCompletionIdsUpdatedAfter(initialized.seedRevision);
      for(const p of seed.filter(item=>completionIds.has(item.id))){
        // Update the status and an unspecified date; preserve an owner's recorded date.
        statements.push(binding.prepare("UPDATE puzzles SET status='done',completion_date=?,date_precision=?,updated_at=? WHERE owner_id=? AND collection_type='owned' AND EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<?) AND (id=? OR (NOT EXISTS (SELECT 1 FROM puzzles WHERE owner_id=? AND id=? AND collection_type='owned') AND lower(trim(title))=lower(trim(?)) AND lower(trim(brand))=lower(trim(?)) AND 1=(SELECT count(*) FROM puzzles WHERE owner_id=? AND collection_type='owned' AND lower(trim(title))=lower(trim(?)) AND lower(trim(brand))=lower(trim(?))))) AND NOT (status='done' AND date_precision IN ('day','month') AND completion_date IS NOT NULL)").bind(p.completionDate,p.datePrecision,now,ownerId,ownerId,SEED_REVISION,p.id,ownerId,p.id,p.title,p.brand,ownerId,p.title,p.brand));
      }
      const removals=seedRemovalsAfter(initialized.seedRevision);
      if(removals.length){
        const predicate=removals.map(()=>"(id=? OR (collection_type='owned' AND lower(trim(title))=lower(trim(?)) AND lower(trim(brand))=lower(trim(?))))").join(" OR ");
        const matchValues=removals.flatMap(item=>[item.id,item.title,item.brand]);
        const where=`owner_id=? AND (${predicate}) AND EXISTS (SELECT 1 FROM collections WHERE owner_id=? AND seed_revision<?)`;
        // Save the complete record before removing it from the visible collection.
        statements.push(binding.prepare("CREATE TABLE IF NOT EXISTS puzzle_removed_archive (owner_id TEXT NOT NULL,puzzle_id TEXT NOT NULL,removed_in_revision INTEGER NOT NULL,archived_at TEXT NOT NULL,data_json TEXT NOT NULL,PRIMARY KEY(owner_id,puzzle_id,removed_in_revision))"));
        statements.push(binding.prepare(`INSERT OR IGNORE INTO puzzle_removed_archive (owner_id,puzzle_id,removed_in_revision,archived_at,data_json) SELECT owner_id,id,?,?,json_object('id',id,'title',title,'brand',brand,'author',author,'piecesLabel',pieces_label,'piecesTotal',pieces_total,'status',status,'completionDate',completion_date,'collectionType',collection_type,'datePrecision',date_precision,'purchasedAt',purchased_at,'imageUrl',image_url,'notes',notes,'createdAt',created_at,'updatedAt',updated_at) FROM puzzles WHERE ${where}`).bind(SEED_REVISION,now,ownerId,...matchValues,ownerId,SEED_REVISION));
        statements.push(binding.prepare(`DELETE FROM puzzles WHERE ${where}`).bind(ownerId,...matchValues,ownerId,SEED_REVISION));
      }
    }
    statements.push(binding.prepare("UPDATE collections SET seed_revision=? WHERE owner_id=? AND seed_revision<?").bind(SEED_REVISION,ownerId,SEED_REVISION));
    await binding.batch(statements);
  }
  const rows=await db.select().from(puzzles).where(eq(puzzles.ownerId,ownerId)).orderBy(asc(puzzles.createdAt),asc(puzzles.id));
  return rows.map(({ownerId:_owner,...p})=>p) as Puzzle[];
}
export const ownedPuzzle=(ownerId:string,id:string)=>and(eq(puzzles.ownerId,ownerId),eq(puzzles.id,id));
