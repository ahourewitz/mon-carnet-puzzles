import { env } from "cloudflare:workers";
import { authorize } from "../../../../lib/api";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {user,error}=await authorize(req);if(error)return error;const {id}=await params;
  if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});
  const object=await env.BUCKET!.get(`images/${user!.userId}/${id}`);if(!object)return new Response(null,{status:404});
  const headers=new Headers({"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"});object.writeHttpMetadata(headers);headers.set("ETag",object.httpEtag);
  return new Response(object.body,{headers});
}
