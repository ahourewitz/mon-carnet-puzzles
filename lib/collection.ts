import { env } from "cloudflare:workers";
import { eq,and,asc } from "drizzle-orm";
import { getDb } from "../db";
import { collections,puzzles } from "../db/schema";
import seed from "../db/seed.json";
import type { Puzzle } from "./puzzle";
export async function readCollection(ownerId:string):Promise<Puzzle[]>{
  const db=getDb();
  const initialized=await db.select().from(collections).where(eq(collections.ownerId,ownerId)).get();
  if(!initialized){
    const now=new Date().toISOString(),binding=env.DB!;
    await binding.batch([
      binding.prepare("INSERT OR IGNORE INTO collections (owner_id,initialized_at) VALUES (?,?)").bind(ownerId,now),
      ...seed.map(p=>binding.prepare("INSERT OR IGNORE INTO puzzles (id,owner_id,title,brand,author,pieces_label,pieces_total,status,completion_date,date_precision,purchased_at,image_url,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(p.id,ownerId,p.title,p.brand,p.author,p.piecesLabel,p.piecesTotal,p.status,p.completionDate,p.datePrecision,p.purchasedAt,p.imageUrl,p.notes,now,now)),
    ]);
  }
  const rows=await db.select().from(puzzles).where(eq(puzzles.ownerId,ownerId)).orderBy(asc(puzzles.createdAt),asc(puzzles.id));
  return rows.map(({ownerId:_owner,...p})=>p) as Puzzle[];
}
export const ownedPuzzle=(ownerId:string,id:string)=>and(eq(puzzles.ownerId,ownerId),eq(puzzles.id,id));
