import { authorize,json } from "../../../lib/api";
import { readCollection } from "../../../lib/collection";
import { puzzleInput } from "../../../lib/puzzle";
import { getDb } from "../../../db";
import { puzzles } from "../../../db/schema";
export const dynamic="force-dynamic";
export async function GET(req:Request){const {user,error}=await authorize(req);if(error)return error;return json(await readCollection(user!.userId));}
export async function POST(req:Request){
  const {user,error}=await authorize(req,true);if(error)return error;
  let data;try{data=puzzleInput.safeParse(await req.json());}catch{return json({error:"Le formulaire est invalide."},400);}
  if(!data.success)return json({error:data.error.issues[0].message},400);
  await readCollection(user!.userId);
  const now=new Date().toISOString(),row={...data.data,id:crypto.randomUUID(),ownerId:user!.userId,createdAt:now,updatedAt:now};
  await getDb().insert(puzzles).values(row);
  const {ownerId:_owner,...saved}=row;return json(saved,201);
}
