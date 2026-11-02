import { authorize,json } from "../../../../lib/api";
import { ownedPuzzle } from "../../../../lib/collection";
import { puzzleInput } from "../../../../lib/puzzle";
import { getDb } from "../../../../db";
import { puzzles } from "../../../../db/schema";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function PUT(req:Request,context:Context){
  const {user,error}=await authorize(req,true);if(error)return error;const {id}=await context.params;
  let data;try{data=puzzleInput.safeParse(await req.json());}catch{return json({error:"Le formulaire est invalide."},400);}
  if(!data.success)return json({error:data.error.issues[0].message},400);
  const saved=await getDb().update(puzzles).set({...data.data,updatedAt:new Date().toISOString()}).where(ownedPuzzle(user!.userId,id)).returning().get();
  if(!saved)return json({error:"Ce puzzle n’existe plus dans votre collection."},404);
  const {ownerId:_owner,...p}=saved;return json(p);
}
export async function DELETE(req:Request,context:Context){
  const {user,error}=await authorize(req,true);if(error)return error;const {id}=await context.params;
  const deleted=await getDb().delete(puzzles).where(ownedPuzzle(user!.userId,id)).returning({id:puzzles.id}).get();
  return deleted?json({ok:true}):json({error:"Ce puzzle n’existe plus."},404);
}
