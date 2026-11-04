import seed from "../db/seed.json";
import { puzzleInput, type Puzzle } from "./puzzle";
import type { BrowserStorage } from "./storage-types";
import { SEED_REVISION,seedIdsAddedAfter } from "./seed-updates";

type ImageRecord = { id: string; blob: Blob };
type Backup = { format: "puzzlotheque"; version: 1; exportedAt: string; puzzles: Puzzle[]; images: { id: string; data: string }[] };
const IMAGE_PREFIX = "browser-image:";
const IMAGE_ID = /^[a-f0-9-]{36}$/;
const RECORD_ID = /^[a-zA-Z0-9_-]{1,120}$/;
const SEED_IMAGE = /^\/puzzles\/\d{2}\.webp$/;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const objectUrls = new Map<string,string>();
const imageIds = new Map<string,string>();
let database: Promise<IDBDatabase> | undefined;

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error);});
}
function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error("La sauvegarde a été interrompue."));tx.onerror=()=>reject(tx.error);});
}
function friendlyError(error: unknown): Error {
  if(error instanceof DOMException&&error.name==="QuotaExceededError")return new Error("Le stockage du navigateur est plein. Sauvegardez votre carnet et libérez de l’espace avant de réessayer.");
  if(error instanceof DOMException&&["SecurityError","InvalidStateError"].includes(error.name))return new Error("Le navigateur ne permet pas l’enregistrement des données. Autorisez le stockage du site puis réessayez.");
  return error instanceof Error?error:new Error("Impossible d’enregistrer le carnet dans ce navigateur.");
}

function openDatabase(): Promise<IDBDatabase> {
  if(database)return database;
  database=new Promise<IDBDatabase>((resolve,reject)=>{
    const open=indexedDB.open("puzzlotheque-personnelle",SEED_REVISION);
    open.onupgradeneeded=(event)=>{
      const db=open.result, isNew=event.oldVersion===0;
      const puzzles=isNew?db.createObjectStore("puzzles",{keyPath:"id"}):open.transaction!.objectStore("puzzles");
      if(isNew)db.createObjectStore("images",{keyPath:"id"});
      const now=new Date().toISOString();
      const initial=seed.map(item=>{
        const {sourcePage: _source,sourceDocument: _document,...puzzle}=item;
        return {...puzzle,collectionType:"owned",createdAt:now,updatedAt:now};
      });
      if(isNew){
        for(const puzzle of initial)puzzles.add(puzzle);
      }else if(event.oldVersion<SEED_REVISION){
        const updateIds=seedIdsAddedAfter(event.oldVersion);
        const existing=puzzles.getAll();
        existing.onsuccess=()=>{
          const rows=existing.result as Puzzle[];
          const normalized=(s:string)=>s.normalize("NFC").trim().toLocaleLowerCase("fr");
          const keys=new Set(rows.map(p=>`${normalized(p.title)}\u0000${normalized(p.brand)}`));
          const ids=new Set(rows.map(p=>p.id));
          for(const puzzle of initial){
            if(!updateIds.has(puzzle.id))continue;
            const key=`${normalized(puzzle.title)}\u0000${normalized(puzzle.brand)}`;
            for(const row of rows){
              if(row.collectionType==="wishlist"&&`${normalized(row.title)}\u0000${normalized(row.brand)}`===key){
                puzzles.put({...row,collectionType:"owned",updatedAt:now});
              }
            }
            if(!ids.has(puzzle.id)&&!keys.has(key)){puzzles.add(puzzle);keys.add(key);}
          }
        };
      }
    };
    open.onsuccess=()=>{const db=open.result;db.onversionchange=()=>db.close();resolve(db);};
    open.onerror=()=>reject(friendlyError(open.error));
    open.onblocked=()=>reject(new Error("Fermez les autres onglets de ce carnet, puis rechargez la page."));
  }).catch(error=>{database=undefined;throw friendlyError(error);});
  return database;
}

async function allStored(): Promise<{puzzles:Puzzle[];images:ImageRecord[]}> {
  const db=await openDatabase(),tx=db.transaction(["puzzles","images"],"readonly"),done=finished(tx);
  const rows=request(tx.objectStore("puzzles").getAll()) as Promise<Puzzle[]>;
  const imgs=request(tx.objectStore("images").getAll()) as Promise<ImageRecord[]>;
  const [puzzles,images]=await Promise.all([rows,imgs,done]);
  return {puzzles,images};
}
function displayUrl(image:ImageRecord):string {
  let url=objectUrls.get(image.id);
  if(!url){url=URL.createObjectURL(image.blob);objectUrls.set(image.id,url);imageIds.set(url,image.id);}
  return url;
}
function hydrate(puzzles:Puzzle[],images:ImageRecord[]):Puzzle[] {
  const photos=new Map(images.map(image=>[image.id,image]));
  return puzzles.map(p=>{
    if(!p.imageUrl?.startsWith(IMAGE_PREFIX))return p;
    const photo=photos.get(p.imageUrl.slice(IMAGE_PREFIX.length));
    return {...p,imageUrl:photo?displayUrl(photo):null};
  });
}
function storedImageUrl(value:string|null):string|null {
  if(!value)return null;
  if(SEED_IMAGE.test(value))return value;
  const id=imageIds.get(value);
  if(id)return IMAGE_PREFIX+id;
  throw new Error("La photo sélectionnée n’est plus disponible. Choisissez-la à nouveau.");
}
function validatePuzzle(p:Puzzle,imageUrl:string|null):Puzzle {
  const result=puzzleInput.safeParse({...p,imageUrl:null});
  if(!result.success)throw new Error(result.error.issues[0]?.message||"La fiche du puzzle est invalide.");
  if(!RECORD_ID.test(p.id))throw new Error("La fiche du puzzle est invalide.");
  return {...result.data,id:p.id,imageUrl,createdAt:p.createdAt,updatedAt:p.updatedAt};
}
async function readImage(file:File):Promise<Blob>{
  if(file.size===0||file.size>MAX_IMAGE_SIZE||!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error("Choisissez une photo JPG, PNG ou WebP de moins de 8 Mo.");
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const valid=file.type==="image/jpeg"?bytes[0]===255&&bytes[1]===216:file.type==="image/png"?Array.from(bytes.slice(0,4)).join(",")==="137,80,78,71":String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  if(!valid)throw new Error("Cette photo n’est pas dans un format reconnu.");
  return file;
}
function dataUrl(blob:Blob):Promise<string>{
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Impossible de lire une photo pour la sauvegarde."));reader.readAsDataURL(blob);});
}
function imageFromData(item:{id:string;data:string}):ImageRecord {
  if(!item||!IMAGE_ID.test(item.id)||typeof item.data!=="string")throw new Error("Une photo de la sauvegarde est invalide.");
  const match=/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(item.data);
  if(!match||match[2].length>Math.ceil(MAX_IMAGE_SIZE*4/3)+4)throw new Error("Une photo de la sauvegarde est trop volumineuse ou invalide.");
  let binary:string;try{binary=atob(match[2]);}catch{throw new Error("Une photo de la sauvegarde est invalide.");}
  if(!binary.length||binary.length>MAX_IMAGE_SIZE)throw new Error("Une photo de la sauvegarde est trop volumineuse ou invalide.");
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const valid=match[1]==="image/jpeg"?bytes[0]===255&&bytes[1]===216:match[1]==="image/png"?Array.from(bytes.slice(0,4)).join(",")==="137,80,78,71":String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  if(!valid)throw new Error("Une photo de la sauvegarde n’est pas dans un format reconnu.");
  return {id:item.id,blob:new Blob([bytes],{type:match[1]})};
}

export class LocalPuzzleStorage implements BrowserStorage {
  async list():Promise<Puzzle[]>{try{const data=await allStored();return hydrate(data.puzzles,data.images);}catch(error){throw friendlyError(error);}}

  async save(p:Puzzle,isNew:boolean):Promise<Puzzle>{
    try{
      const now=new Date().toISOString(),id=isNew?crypto.randomUUID():p.id;
      const input={...p,id,createdAt:isNew?now:p.createdAt,updatedAt:now};
      const stored=validatePuzzle(input,storedImageUrl(input.imageUrl));
      const db=await openDatabase(),tx=db.transaction("puzzles","readwrite"),done=finished(tx),store=tx.objectStore("puzzles");
      let missing=false;
      if(isNew)store.add(stored);
      else {const current=store.get(id);current.onsuccess=()=>{if(!current.result){missing=true;tx.abort();}else store.put(stored);};}
      try{await done;}catch(error){if(missing)throw new Error("Ce puzzle n’existe plus dans votre collection.");throw error;}
      return {...stored,imageUrl:input.imageUrl};
    }catch(error){throw friendlyError(error);}
  }

  async remove(id:string):Promise<void>{
    try{const db=await openDatabase(),tx=db.transaction("puzzles","readwrite"),done=finished(tx);tx.objectStore("puzzles").delete(id);await done;}
    catch(error){throw friendlyError(error);}
  }

  async upload(file:File):Promise<string>{
    try{
      const image={id:crypto.randomUUID(),blob:await readImage(file)};
      const db=await openDatabase(),tx=db.transaction("images","readwrite"),done=finished(tx);tx.objectStore("images").add(image);await done;
      return displayUrl(image);
    }catch(error){throw friendlyError(error);}
  }

  async backup():Promise<Blob>{
    try{
      const {puzzles,images}=await allStored(),byId=new Map(images.map(image=>[image.id,image]));
      const used=new Set(puzzles.flatMap(p=>p.imageUrl?.startsWith(IMAGE_PREFIX)?[p.imageUrl.slice(IMAGE_PREFIX.length)]:[]));
      const exportedImages=await Promise.all([...used].map(async id=>{const image=byId.get(id);if(!image)throw new Error("Une photo manque dans le navigateur. Vérifiez vos fiches avant de sauvegarder.");return {id,data:await dataUrl(image.blob)};}));
      const backup:Backup={format:"puzzlotheque",version:1,exportedAt:new Date().toISOString(),puzzles,images:exportedImages};
      return new Blob([JSON.stringify(backup,null,2)],{type:"application/json;charset=utf-8"});
    }catch(error){throw friendlyError(error);}
  }

  async restore(file:File):Promise<Puzzle[]>{
    try{
      if(file.size>120*1024*1024)throw new Error("Cette sauvegarde dépasse 120 Mo.");
      let raw:Backup;try{raw=JSON.parse(await file.text());}catch{throw new Error("Ce fichier n’est pas une sauvegarde de puzzles valide.");}
      if(!raw||raw.format!=="puzzlotheque"||raw.version!==1||!Array.isArray(raw.puzzles)||!Array.isArray(raw.images)||raw.puzzles.length>5000||raw.images.length>5000)throw new Error("Ce fichier n’est pas une sauvegarde de puzzles valide.");
      const images=raw.images.map(imageFromData),imageSet=new Set(images.map(p=>p.id));
      if(imageSet.size!==images.length)throw new Error("La sauvegarde contient des photos en double.");
      const ids=new Set<string>();
      const puzzles=raw.puzzles.map(p=>{
        if(!p||typeof p.id!=="string"||!RECORD_ID.test(p.id)||ids.has(p.id))throw new Error("La sauvegarde contient des fiches invalides ou en double.");
        ids.add(p.id);
        const image=p.imageUrl;
        if(image!==null&&!(typeof image==="string"&&(SEED_IMAGE.test(image)||(image.startsWith(IMAGE_PREFIX)&&imageSet.has(image.slice(IMAGE_PREFIX.length))))))throw new Error("Il manque une photo dans la sauvegarde.");
        return validatePuzzle(p,image);
      });
      const db=await openDatabase(),tx=db.transaction(["puzzles","images"],"readwrite"),done=finished(tx);
      const pStore=tx.objectStore("puzzles"),iStore=tx.objectStore("images");
      pStore.clear();iStore.clear();for(const puzzle of puzzles)pStore.put(puzzle);for(const image of images)iStore.put(image);await done;
      for(const url of objectUrls.values())URL.revokeObjectURL(url);objectUrls.clear();imageIds.clear();
      return hydrate(puzzles,images);
    }catch(error){throw friendlyError(error);}
  }
}
