import { env } from "cloudflare:workers";
import { authorize,json } from "../../../lib/api";
export async function POST(req:Request){
  const {user,error}=await authorize(req,true);if(error)return error;
  let form;try{form=await req.formData();}catch{return json({error:"Impossible de lire la photo."},400);}
  const file=form.get("image");
  if(!(file instanceof File)||file.size>8*1024*1024||!/^image\/(jpeg|png|webp)$/.test(file.type))return json({error:"Choisissez une photo JPG, PNG ou WebP de moins de 8 Mo."},400);
  const bytes=new Uint8Array(await file.arrayBuffer()),signature=Array.from(bytes.slice(0,12));
  const valid=file.type==="image/jpeg"?signature[0]===255&&signature[1]===216:file.type==="image/png"?signature.slice(0,4).join(",")==="137,80,78,71":String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  if(!valid)return json({error:"Cette photo n’est pas dans un format reconnu."},400);
  const id=crypto.randomUUID();await env.BUCKET!.put(`images/${user!.userId}/${id}`,bytes,{httpMetadata:{contentType:file.type}});
  return json({imageUrl:`/api/images/${id}`},201);
}
