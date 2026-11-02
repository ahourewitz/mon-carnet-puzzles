import { getChatGPTUser } from "../app/chatgpt-auth";
export const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
export async function authorize(request:Request,write=false){
  const user=await getChatGPTUser();
  if(!user)return {error:json({error:"Connectez-vous pour accéder à votre collection."},401),user:null};
  if(write){const origin=request.headers.get("Origin");if((origin&&origin!==new URL(request.url).origin)||request.headers.get("Sec-Fetch-Site")==="cross-site")return {error:json({error:"Cette action doit être effectuée depuis votre carnet."},403),user:null};}
  return {error:null,user};
}
