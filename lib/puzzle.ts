import { z } from "zod";
export type Puzzle = {
  id: string; title: string; brand: string; author: string | null;
  piecesLabel: string; piecesTotal: number; status: "todo" | "done"; collectionType:"owned"|"wishlist";
  completionDate: string | null; datePrecision: "day" | "month" | "unknown";
  purchasedAt: string | null; imageUrl: string | null; notes: string;
  createdAt?: string; updatedAt?: string;
};
export function validDate(value: string, precision: string) {
  if (precision === "month") return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value;
}
export function countPieces(label: string): number | null {
  const clean=label.replace(/\s/g,"").replace(/XXL/gi,"");
  if(!/^\d+(?:[x×]\d+)?$/i.test(clean)) return null;
  const n=clean.split(/[x×]/i).map(Number).reduce((a,b)=>a*b,1);
  return Number.isSafeInteger(n)&&n>0&&n<=100000?n:null;
}
export const puzzleInput=z.object({
  title:z.string().trim().min(1,"Ajoutez un nom au puzzle.").max(180),
  brand:z.string().trim().min(1,"Indiquez la marque.").max(80),
  author:z.string().trim().max(120).nullable(),
  piecesLabel:z.string().trim().min(1).max(40),piecesTotal:z.number().int().min(1).max(100000),
  status:z.enum(["todo","done"]),completionDate:z.string().nullable(),
  collectionType:z.enum(["owned","wishlist"]).default("owned"),
  datePrecision:z.enum(["day","month","unknown"]),purchasedAt:z.string().nullable(),
  imageUrl:z.string().max(200).regex(/^\/(?:puzzles\/\d{2}\.webp|api\/images\/[a-f0-9-]{36})$/).nullable(),
  notes:z.string().trim().max(2000),
}).superRefine((p,ctx)=>{
  if(countPieces(p.piecesLabel)!==p.piecesTotal)ctx.addIssue({code:"custom",message:"Indiquez un nombre de pièces valide, par exemple 500 ou 2 × 100."});
  if(p.collectionType==="wishlist"&&(p.status!=="todo"||p.completionDate||p.purchasedAt))ctx.addIssue({code:"custom",message:"Un puzzle de la liste de souhaits ne peut pas être acheté ou réalisé."});
  if(p.status==="done"&&p.datePrecision!=="unknown"&&(!p.completionDate||!validDate(p.completionDate,p.datePrecision)))ctx.addIssue({code:"custom",message:"Indiquez une date de réalisation valide."});
  if(p.status==="todo"&&p.completionDate!==null)ctx.addIssue({code:"custom",message:"Un puzzle à faire ne peut pas avoir de date de réalisation."});
  if(p.datePrecision==="unknown"&&p.completionDate!==null)ctx.addIssue({code:"custom",message:"Choisissez une précision de date."});
  if(p.purchasedAt&&!validDate(p.purchasedAt,"day"))ctx.addIssue({code:"custom",message:"La date d’achat est invalide."});
});
export function formatDate(value:string|null,precision="day") {
  if(!value)return "Date non renseignée";
  return new Intl.DateTimeFormat("fr-BE",precision==="month"?{month:"long",year:"numeric"}:{day:"numeric",month:"long",year:"numeric"}).format(new Date(value+(precision==="month"?"-15":"")+"T12:00:00Z"));
}
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
