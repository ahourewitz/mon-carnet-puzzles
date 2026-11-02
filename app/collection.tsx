"use client";

import { useState, useMemo, useRef, useEffect, type FormEvent } from "react";
import { Puzzle as PuzzleIcon, Plus, Search, Check, Pencil, X, Download, Upload, LayoutGrid, List, CalendarDays, Palette, ArrowRight, Camera, LoaderCircle, LockKeyhole, Trash2, CheckCheck, Layers3, Sparkles, Heart, ShoppingBag } from "lucide-react";
import { type Puzzle, countPieces, formatDate, today } from "../lib/puzzle";
import type { BrowserStorage } from "../lib/storage-types";

type Filter="all"|"todo"|"done";
type Modal={kind:"edit"|"status"|"purchase";puzzle?:Puzzle;collectionType?:"owned"|"wishlist"};
const number=(n:number)=>new Intl.NumberFormat("fr-BE").format(n);
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

async function request<T=Puzzle>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,init);
  let data;try{data=await response.json();}catch{throw new Error("Impossible d’enregistrer pour le moment. Réessayez dans un instant.");}
  if(!response.ok)throw new Error((data as {error?:string}).error||"Impossible d’enregistrer pour le moment.");
  return data as T;
}

export default function Collection({initialPuzzles,storage,assetBase=""}:{initialPuzzles:Puzzle[];storage?:BrowserStorage;assetBase?:string}){
  const [records,setPuzzles]=useState(initialPuzzles),[filter,setFilter]=useState<Filter>("all");
  const [section,setSection]=useState<"collection"|"wishlist">("collection");
  const puzzles=records.filter(p=>p.collectionType!=="wishlist"), wishes=records.filter(p=>p.collectionType==="wishlist");
  const scoped=section==="wishlist"?wishes:puzzles;
  const [search,setSearch]=useState(""),[brand,setBrand]=useState(""),[pieces,setPieces]=useState(""),[sort,setSort]=useState("original");
  const [view,setView]=useState<"grid"|"list">("grid"),[modal,setModal]=useState<Modal|null>(null),[notice,setNotice]=useState("");
  const [backupError,setBackupError]=useState(""),[restoreFile,setRestoreFile]=useState<File|null>(null),[restoring,setRestoring]=useState(false);
  const restoreInput=useRef<HTMLInputElement>(null),restoreDialog=useRef<HTMLDialogElement>(null);
  const assetSrc=(url:string)=>assetBase&&url.startsWith("/puzzles/")?`${assetBase}${url.slice(1)}`:url;
  const done=puzzles.filter(p=>p.status==="done").length;
  const brands=useMemo(()=>[...new Set(scoped.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,"fr")),[records,section]);
  const formats=useMemo(()=>[...new Set(scoped.map(p=>p.piecesLabel))].sort((a,b)=>(countPieces(a)||0)-(countPieces(b)||0)),[records,section]);
  const visible=useMemo(()=>{
    const list=scoped.filter(p=>(section==="wishlist"||filter==="all"||p.status===filter)&&(!brand||p.brand===brand)&&(!pieces||p.piecesLabel===pieces)&&(!search||normalize([p.title,p.brand,p.author||"",p.piecesLabel].join(" ")).includes(normalize(search))));
    if(sort==="name")list.sort((a,b)=>a.title.localeCompare(b.title,"fr"));
    if(sort==="pieces")list.sort((a,b)=>b.piecesTotal-a.piecesTotal);
    if(sort==="completed")list.sort((a,b)=>(b.completionDate||"").localeCompare(a.completionDate||""));
    if(sort==="newest")list.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
    return list;
  },[records,section,filter,brand,pieces,search,sort]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(""),5000);return()=>clearTimeout(t);},[notice]);
  function save(p:Puzzle,isNew:boolean,kind:string){
    setPuzzles(items=>isNew?[p,...items]:items.map(old=>old.id===p.id?p:old));
    setModal(null);setNotice(isNew?p.collectionType==="wishlist"?"Votre nouvelle envie a été enregistrée.":"Le puzzle a rejoint votre collection.":kind==="purchase"?"Ce puzzle a rejoint votre collection.":kind==="status"?"Le statut et la date ont été enregistrés.":"Les modifications ont été enregistrées.");
  }
  function reset(){setSearch("");setBrand("");setPieces("");setFilter("all");}
  function exportCollection(){
    const fields=["Liste","Nom","Marque","Auteur","Pièces","Statut","Date de réalisation","Précision de la date","Date d’achat","Notes"];
    const escape=(s:unknown)=>{let v=String(s??"");if(/^[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
    const lines=[fields,...records.map(p=>[p.collectionType==="wishlist"?"Liste de souhaits":"Ma collection",p.title,p.brand,p.author,p.piecesLabel,p.status==="done"?"Fait":"À faire",p.completionDate,p.datePrecision==="month"?"Mois":p.datePrecision==="day"?"Jour":"Non renseignée",p.purchasedAt,p.notes])];
    const url=URL.createObjectURL(new Blob(["\ufeff"+lines.map(row=>row.map(escape).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="ma-collection-de-puzzles.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice("Votre collection a été exportée.");
  }
  async function saveBackup(){
    if(!storage)return;
    setBackupError("");
    try{const url=URL.createObjectURL(await storage.backup()),a=document.createElement("a");a.href=url;a.download=`sauvegarde-puzzles-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice("Votre sauvegarde a été téléchargée.");}
    catch(e){setBackupError(e instanceof Error?e.message:"Impossible de préparer la sauvegarde.");}
  }
  async function restoreBackup(){
    if(!storage||!restoreFile)return;
    setRestoring(true);setBackupError("");
    try{setPuzzles(await storage.restore(restoreFile));reset();setSection("collection");restoreDialog.current?.close();setRestoreFile(null);setNotice("Votre sauvegarde a été restaurée.");}
    catch(e){setBackupError(e instanceof Error?e.message:"Impossible de lire cette sauvegarde.");}
    finally{setRestoring(false);}
  }
  return <>
    <a href="#collection" className="skip-link">Aller à ma collection</a>
    <header className="site-header"><div className="header-inner">
      <a className="wordmark" href={assetBase||"/"} aria-label="Pièce après pièce, accueil"><span className="brand-icon"><PuzzleIcon size={25} strokeWidth={1.5}/></span><span>pièce après pièce<small>MON CARNET DE PUZZLES</small></span></a>
      <nav aria-label="Navigation principale"><button className={section==="collection"&&filter==="all"?"nav-active":""} onClick={()=>{setSection("collection");reset();document.getElementById("collection")?.scrollIntoView({behavior:"smooth"});}}>Ma collection</button><button className={section==="collection"&&filter==="todo"?"nav-active":""} onClick={()=>{setSection("collection");setFilter("todo");document.getElementById("collection")?.scrollIntoView({behavior:"smooth"});}}>À faire</button><button className={section==="collection"&&filter==="done"?"nav-active":""} onClick={()=>{setSection("collection");setFilter("done");document.getElementById("collection")?.scrollIntoView({behavior:"smooth"});}}>Mes réalisations</button><button className={section==="wishlist"?"nav-active":""} onClick={()=>{setSection("wishlist");reset();document.getElementById("collection")?.scrollIntoView({behavior:"smooth"});}}>Liste de souhaits</button></nav>
      <button className="button primary header-add" aria-label={section==="wishlist"?"Ajouter une envie":"Ajouter un puzzle"} onClick={()=>setModal({kind:"edit",collectionType:section==="wishlist"?"wishlist":"owned"})}><Plus size={18}/><span>{section==="wishlist"?"Ajouter une envie":"Ajouter un puzzle"}</span></button>
    </div></header>
    <main className="main-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><span/> DES PETITES PIÈCES, DE BELLES HISTOIRES</p><h1 id="hero-title">{section==="wishlist"?<>Mes prochaines<br/><em>envies.</em></>:<>Ma petite<br/><em>puzzlothèque.</em></>}</h1><p className="hero-description">{section==="wishlist"?<>Les jolies boîtes qui me font rêver,<br className="desktop-break"/> à garder ici pour les retrouver plus tard.</>:<>Les belles trouvailles, les dernières pièces posées<br className="desktop-break"/> et toutes les histoires qu’il reste à assembler.</>}</p><span className="personal-note"><LockKeyhole size={13}/>{storage?"Données enregistrées dans ce navigateur":"Mon carnet personnel"}</span></div>
        <div className="hero-art" aria-hidden="true"><div className="paper-card paper-back"><img src={assetSrc("/puzzles/21.webp")} alt=""/></div><div className="paper-card paper-front"><img src={assetSrc("/puzzles/04.webp")} alt=""/><span>un peu de magie, pièce après pièce</span></div><div className="round-stamp"><Sparkles size={18}/><strong>{section==="wishlist"?wishes.length:`${puzzles.length?Math.round(done/puzzles.length*100):0}%`}</strong><span>{section==="wishlist"?<>puzzles à<br/>adopter</>:<>de belles histoires<br/>terminées</>}</span></div><span className="art-spark spark-one">✧</span><span className="art-spark spark-two">✧</span></div>
      </section>
      <section className="stats" aria-label="Ma collection en chiffres">
        <div><span className="stat-icon"><Layers3 size={20}/></span><strong>{puzzles.length}</strong><span>puzzles dans ma collection</span></div>
        <div><span className="stat-icon"><CheckCheck size={20}/></span><strong>{done}</strong><span>puzzles terminés</span></div>
        <div><span className="stat-icon"><PuzzleIcon size={20}/></span><strong>{puzzles.length-done}</strong><span>puzzles à découvrir</span></div>
        <div><span className="stat-icon"><Sparkles size={20}/></span><strong>{number(puzzles.reduce((sum,p)=>sum+p.piecesTotal,0))}</strong><span>pièces à assembler au total</span></div>
      </section>
      <section id="collection" className="collection-section" aria-labelledby="collection-title">
        <div className="carnet-tabs" aria-label="Les listes de mon carnet"><button className={section==="collection"?"active":""} aria-pressed={section==="collection"} onClick={()=>{setSection("collection");reset();}}><PuzzleIcon size={17}/>Ma collection<span>{puzzles.length}</span></button><button className={section==="wishlist"?"active":""} aria-pressed={section==="wishlist"} onClick={()=>{setSection("wishlist");reset();}}><Heart size={17}/>Liste de souhaits<span>{wishes.length}</span></button></div>
        <div className="section-heading"><div><p className="eyebrow">{section==="wishlist"?"LES PROCHAINES BELLES TROUVAILLES":"LES BOÎTES DE MON CARNET"}</p><h2 id="collection-title">{section==="wishlist"?"Ma liste de souhaits":"Ma collection"} <span>{scoped.length}</span></h2></div><div className="section-actions"><button className="text-button export-button" aria-label="Exporter la collection en CSV" title="Exporter la collection en CSV" onClick={exportCollection}><Download size={16}/>Exporter en CSV</button>{storage&&<><button className="text-button export-button" aria-label="Sauvegarder mes données" title="Sauvegarder mes données, photos comprises" onClick={saveBackup}><Download size={16}/>Sauvegarder</button><button className="text-button export-button" aria-label="Restaurer une sauvegarde" title="Restaurer une sauvegarde" onClick={()=>restoreInput.current?.click()}><Upload size={16}/>Restaurer</button><input ref={restoreInput} className="sr-only" type="file" accept="application/json,.json" aria-label="Choisir une sauvegarde" onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file){setBackupError("");setRestoreFile(file);restoreDialog.current?.showModal();}}}/></>}</div></div>
        {storage&&<p className="storage-note">Les ajouts restent dans ce navigateur. Utilisez « Sauvegarder » pour conserver une copie de vos fiches et photos.</p>}
        {backupError&&!restoreFile&&<p className="form-error" role="alert">{backupError}</p>}
        <div className="collection-controls">
          {section==="wishlist"?<div className="wishlist-description"><Heart size={15}/>Des envies à garder pour plus tard</div>:<div className="filter-tabs" aria-label="Filtrer par statut">{([["all","Tous",puzzles.length],["todo","À faire",puzzles.length-done],["done","Terminés",done]] as const).map(([value,label,count])=><button key={value} aria-pressed={filter===value} className={filter===value?"active":""} onClick={()=>setFilter(value)}>{label}<span>{count}</span></button>)}</div>}
          <label className="search-box"><Search size={18}/><span className="sr-only">Rechercher un puzzle, une marque ou un auteur</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Un puzzle, une marque, un auteur…"/></label>
        </div>
        <div className="secondary-controls"><div className="select-filters"><label><span className="sr-only">Filtrer par marque</span><select value={brand} onChange={e=>setBrand(e.target.value)}><option value="">Toutes les marques</option>{brands.map(b=><option key={b}>{b}</option>)}</select></label><label><span className="sr-only">Filtrer par nombre de pièces</span><select value={pieces} onChange={e=>setPieces(e.target.value)}><option value="">Tous les formats</option>{formats.map(p=><option key={p} value={p}>{p} pièces</option>)}</select></label>{(brand||pieces||search)&&<button className="reset-button" onClick={reset}>Effacer les filtres<X size={12}/></button>}</div><div className="sort-controls"><label><span className="sr-only">Trier la collection</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="original">Ordre du carnet</option><option value="newest">Derniers ajouts</option><option value="name">Nom · A à Z</option><option value="pieces">Plus de pièces</option><option value="completed">Réalisations récentes</option></select></label><div className="view-switch" aria-label="Affichage"><button aria-label="Afficher en grille" aria-pressed={view==="grid"} className={view==="grid"?"selected":""} onClick={()=>setView("grid")}><LayoutGrid size={17}/></button><button aria-label="Afficher en liste" aria-pressed={view==="list"} className={view==="list"?"selected":""} onClick={()=>setView("list")}><List size={18}/></button></div></div></div>
        <p className="result-count" aria-live="polite">{visible.length} puzzle{visible.length>1?"s":""}{section==="wishlist"?" dans ma liste de souhaits":filter!=="all"?filter==="done"?" terminé"+(visible.length>1?"s":""):" à faire":" dans cette sélection"}</p>
        {visible.length?<div className={`puzzle-grid ${view==="list"?"list-view":""}`}>{visible.map(p=><article className="puzzle-card" key={p.id}>
          <div className="card-picture">{p.imageUrl?<img src={assetSrc(p.imageUrl)} alt={`Visuel du puzzle ${p.title}`} loading="lazy"/>:<div className="image-placeholder"><PuzzleIcon size={52} strokeWidth={1}/><span>Une nouvelle histoire à assembler</span></div>}<button className={`status-pill ${p.status}`} onClick={()=>setModal({kind:section==="wishlist"?"edit":"status",puzzle:p})} aria-label={section==="wishlist"?`Modifier l’envie ${p.title}`:`Modifier le statut de ${p.title} : ${p.status==="done"?"terminé":"à faire"}`}>{section==="wishlist"?<Heart size={12}/>:p.status==="done"?<Check size={13}/>:<span className="small-dot"/>}{section==="wishlist"?"Envie":p.status==="done"?"Terminé":"À faire"}</button><button className="edit-button" onClick={()=>setModal({kind:"edit",puzzle:p})} aria-label={`Modifier ${p.title}`} title="Modifier le puzzle"><Pencil size={15}/></button></div>
          <div className="card-body"><div className="card-meta"><span>{p.brand}</span><span className="pieces-tag"><PuzzleIcon size={12}/>{p.piecesLabel} pièces</span></div><h3>{p.title}</h3><p className="card-author"><Palette size={13}/>{p.author||"Artiste non renseigné"}</p>{p.purchasedAt&&<p className="purchase-note">Acheté le {formatDate(p.purchasedAt)}</p>}<button className={`card-status-action ${p.status}`} onClick={()=>setModal({kind:section==="wishlist"?"purchase":"status",puzzle:p})}>{section==="wishlist"?<><ShoppingBag size={15}/><span>Je l’ai acheté</span><ArrowRight size={16}/></>:p.status==="done"?<><CalendarDays size={15}/><span>{p.completionDate?`Fait ${p.datePrecision==="month"?"en":"le"} ${formatDate(p.completionDate,p.datePrecision)}`:"Terminé · date à préciser"}</span><Pencil size={12}/></>:<><span>Marquer comme fait</span><ArrowRight size={16}/></>}</button></div>
        </article>)}</div>:<div className="empty-state"><PuzzleIcon size={42} strokeWidth={1}/><h3>{section==="wishlist"&&!wishes.length?"Une première envie à garder ?":scoped.length?"Aucun puzzle ne se cache ici…":"Une première boîte à ajouter ?"}</h3><p>{scoped.length?"Essayez un autre mot ou changez vos filtres.":section==="wishlist"?"Notez les puzzles qui vous font rêver. Ils vous attendront ici.":"Ajoutez un puzzle pour commencer votre collection."}</p><button className="button secondary" onClick={()=>scoped.length?reset():setModal({kind:"edit",collectionType:section==="wishlist"?"wishlist":"owned"})}>{scoped.length?"Effacer les filtres":section==="wishlist"?"Ajouter une envie":"Ajouter un puzzle"}</button></div>}
      </section>
      <footer className="site-footer"><span><PuzzleIcon size={17}/>pièce après pièce</span><p>De petites pièces. De grands moments.</p><small><Check size={12}/>{storage?"Sauvegardée dans ce navigateur.":"Votre collection est sauvegardée."}</small></footer>
    </main>
    {notice&&<div className="toast" role="status"><span><Check size={17}/></span>{notice}<button onClick={()=>setNotice("")} aria-label="Fermer la notification"><X size={15}/></button></div>}
    {storage&&<dialog ref={restoreDialog} className="puzzle-dialog restore-dialog" aria-labelledby="restore-title" onCancel={e=>{if(restoring)e.preventDefault();else setRestoreFile(null);}} onClose={()=>{if(!restoring)setRestoreFile(null);}}><div className="dialog-heading"><div><p className="eyebrow">SAUVEGARDE DU CARNET</p><h2 id="restore-title">Restaurer la sauvegarde ?</h2><p>Les fiches et photos de ce navigateur seront remplacées par celles du fichier choisi. Pour garder une copie de la version actuelle, utilisez d’abord « Sauvegarder ».</p></div></div><div className="restore-content"><p><strong>Fichier :</strong> {restoreFile?.name}</p>{backupError&&<p className="form-error" role="alert">{backupError}</p>}<div className="restore-actions"><button className="button secondary" type="button" disabled={restoring} onClick={()=>{restoreDialog.current?.close();setRestoreFile(null);}}>Annuler</button><button className="button primary" type="button" disabled={restoring} onClick={restoreBackup}>{restoring?"Restauration…":"Restaurer cette sauvegarde"}</button></div></div></dialog>}
    {modal&&<PuzzleDialog storage={storage} assetSrc={assetSrc} key={`${modal.kind}-${modal.puzzle?.id||"new"}`} modal={modal} brands={brands} onClose={()=>setModal(null)} onSave={save} onDelete={id=>{setPuzzles(ps=>ps.filter(p=>p.id!==id));setModal(null);setNotice("Le puzzle a été retiré de votre collection.");}}/>}
  </>;
}

function PuzzleDialog({modal,brands,onClose,onSave,onDelete,storage,assetSrc}:{modal:Modal;brands:string[];onClose:()=>void;onSave:(p:Puzzle,isNew:boolean,kind:string)=>void;onDelete:(id:string)=>void;storage?:BrowserStorage;assetSrc:(url:string)=>string}){
  const existing=modal.puzzle,isNew=!existing,statusOnly=modal.kind==="status";
  const [draft,setDraft]=useState<Puzzle>(()=>existing?{...existing,...(modal.kind==="purchase"?{collectionType:"owned" as const,purchasedAt:today()}:{}),...(statusOnly&&existing.status==="todo"?{status:"done" as const,completionDate:today(),datePrecision:"day" as const}:{})}:{id:"",collectionType:modal.collectionType||"owned",title:"",brand:"",author:"",piecesLabel:"",piecesTotal:0,status:"todo",completionDate:null,datePrecision:"day",purchasedAt:null,imageUrl:null,notes:""});
  const [saving,setSaving]=useState(false),[error,setError]=useState(""),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(draft.imageUrl),[confirmDelete,setConfirmDelete]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();const el=dialog.current;return()=>el?.close();},[]);
  useEffect(()=>{if(!file){setPreview(draft.imageUrl);return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file,draft.imageUrl]);
  const set=<K extends keyof Puzzle>(key:K,value:Puzzle[K])=>setDraft(d=>({...d,[key]:value}));
  function changeStatus(value:"todo"|"done") {setDraft(d=>({...d,status:value,completionDate:value==="todo"||d.datePrecision==="unknown"?null:d.completionDate||(d.datePrecision==="month"?today().slice(0,7):today())}));}
  function precision(value:Puzzle["datePrecision"]){setDraft(d=>({...d,datePrecision:value,completionDate:value==="unknown"?null:value==="month"?(d.completionDate||today()).slice(0,7):d.completionDate?.length===10?d.completionDate:""}));}
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");
    const formValues=new FormData(e.currentTarget);
    const completionValue=formValues.has("completionDate")?String(formValues.get("completionDate")||""):draft.completionDate;
    const purchaseValue=formValues.has("purchaseDate")?String(formValues.get("purchaseDate")||""):draft.purchasedAt;
    const total=countPieces(draft.piecesLabel);if(!total){setError("Indiquez le nombre de pièces, par exemple 500, 100 XXL ou 2 × 100.");return;}
    setSaving(true);
    try{
      let imageUrl=draft.imageUrl;
      if(file){if(file.size>8*1024*1024)throw new Error("La photo doit faire moins de 8 Mo.");if(storage)imageUrl=await storage.upload(file);else{const form=new FormData();form.append("image",file);imageUrl=(await request<{imageUrl:string}>("/api/images",{method:"POST",body:form})).imageUrl;}}
      const body={...draft,author:draft.author?.trim()||null,piecesTotal:total,imageUrl,completionDate:draft.status==="done"&&draft.datePrecision!=="unknown"?completionValue:null,purchasedAt:purchaseValue||null};
      const result=storage?await storage.save(body,isNew):await request(isNew?"/api/puzzles":`/api/puzzles/${encodeURIComponent(draft.id)}`,{method:isNew?"POST":"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      onSave(result,isNew,modal.kind);
    }catch(e){setError(e instanceof Error?e.message:"L’enregistrement a échoué. Réessayez.");}finally{setSaving(false);}
  }
  async function remove(){setSaving(true);setError("");try{if(storage)await storage.remove(draft.id);else await request(`/api/puzzles/${encodeURIComponent(draft.id)}`,{method:"DELETE"});onDelete(draft.id);}catch(e){setError(e instanceof Error?e.message:"Impossible de retirer le puzzle.");}finally{setSaving(false);}}
  return <dialog ref={dialog} className={`puzzle-dialog ${statusOnly?"status-dialog":""}`} aria-labelledby="dialog-title" onCancel={e=>{if(saving)e.preventDefault();else onClose();}} onClick={e=>{if(e.target===e.currentTarget&&!saving)onClose();}}>
    <div className="dialog-heading"><div><p className="eyebrow">MON CARNET DE PUZZLES</p><h2 id="dialog-title">{statusOnly?"Mettre à jour le statut":modal.kind==="purchase"?"Une nouvelle boîte chez vous !":isNew?draft.collectionType==="wishlist"?"Une nouvelle envie ?":"Une nouvelle trouvaille ?":"Modifier le puzzle"}</h2><p>{statusOnly?draft.title:isNew?draft.collectionType==="wishlist"?"Un puzzle à garder dans votre liste pour un prochain achat.":"Une nouvelle boîte, une nouvelle histoire à assembler.":"Les petits détails qui font votre collection."}</p></div><button className="icon-button" type="button" disabled={saving} onClick={onClose} aria-label="Fermer le formulaire"><X size={21}/></button></div>
    <form onSubmit={submit}>
      {!statusOnly&&<><div className="photo-field"><label className="photo-upload"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Ajouter ou changer la photo du puzzle" onChange={e=>{const f=e.target.files?.[0];if(f)setFile(f);}}/>{preview?<img src={assetSrc(preview)} alt="Aperçu du puzzle"/>:<Camera size={25} strokeWidth={1.5}/>}<span>{preview?"Changer la photo":"Ajouter une photo"}<small>JPG, PNG ou WebP · 8 Mo maximum</small></span></label>{preview&&<button type="button" className="text-button" onClick={()=>{setFile(null);set("imageUrl",null);}}>Retirer la photo</button>}</div>
      <label className="field">Dans mon carnet<select name="collectionType" value={draft.collectionType} onChange={e=>setDraft(d=>({...d,collectionType:e.target.value as Puzzle["collectionType"],...(e.target.value==="wishlist"?{status:"todo" as const,completionDate:null,purchasedAt:null}:{})}))}><option value="owned">Ma collection · je possède ce puzzle</option><option value="wishlist">Liste de souhaits · un futur achat</option></select></label>
      <label className="field">Nom du puzzle <span aria-hidden="true">*</span><input autoFocus name="title" required maxLength={180} placeholder="Le nom de ma nouvelle trouvaille" value={draft.title} onChange={e=>set("title",e.target.value)}/></label>
      <div className="form-grid"><label className="field">Marque <span aria-hidden="true">*</span><input name="brand" list="puzzle-brands" required maxLength={80} placeholder="Ex. Ravensburger" value={draft.brand} onChange={e=>set("brand",e.target.value)}/><datalist id="puzzle-brands">{brands.map(b=><option key={b} value={b}/>)}</datalist></label><label className="field">Nombre de pièces <span aria-hidden="true">*</span><input name="pieces" required maxLength={40} placeholder="Ex. 500 ou 2 × 100" value={draft.piecesLabel} onChange={e=>set("piecesLabel",e.target.value)}/></label></div>
      <div className="form-grid"><label className="field">Auteur / artiste <small>Facultatif</small><input name="author" maxLength={120} placeholder="Nom de l’illustrateur" value={draft.author||""} onChange={e=>set("author",e.target.value)}/></label>{draft.collectionType==="owned"&&<label className="field">Date d’achat <small>Facultatif</small><input name="purchaseDate" type="date" value={draft.purchasedAt||""} onChange={e=>set("purchasedAt",e.target.value||null)}/></label>}</div></>}
      {draft.collectionType==="owned"&&<fieldset className="status-field"><legend>{statusOnly?"Où en est ce puzzle ?":"Statut du puzzle"}</legend><div className="status-choices"><label className={draft.status==="todo"?"chosen":""}><input type="radio" name="status" value="todo" checked={draft.status==="todo"} onChange={()=>changeStatus("todo")}/><PuzzleIcon size={20}/><span>À faire<small>Une histoire à découvrir</small></span></label><label className={draft.status==="done"?"chosen":""}><input type="radio" name="status" value="done" checked={draft.status==="done"} onChange={()=>changeStatus("done")}/><CheckCheck size={20}/><span>Terminé<small>La dernière pièce est posée !</small></span></label></div></fieldset>}
      {draft.collectionType==="owned"&&draft.status==="done"&&<div className="completion-box"><div className="form-grid"><label className="field">Précision de la date<select name="datePrecision" value={draft.datePrecision} onChange={e=>precision(e.target.value as Puzzle["datePrecision"])}><option value="day">Date précise</option><option value="month">Mois et année</option><option value="unknown">Je ne sais plus</option></select></label>{draft.datePrecision!=="unknown"&&<label className="field">Date de réalisation<input name="completionDate" type={draft.datePrecision==="month"?"month":"date"} required value={draft.completionDate||""} onChange={e=>set("completionDate",e.target.value)}/></label>}</div><p><CalendarDays size={13}/>{draft.datePrecision==="unknown"?"Vous pourrez ajouter la date plus tard.":draft.datePrecision==="month"?"Le mois suffit : inutile d’inventer un jour précis.":"Le souvenir du jour où vous l’avez terminé."}</p></div>}
      {!statusOnly&&<label className="field notes-field">Une petite note <small>Facultatif</small><textarea name="notes" rows={2} maxLength={2000} placeholder="Un cadeau, un souvenir, les pièces les plus difficiles…" value={draft.notes} onChange={e=>set("notes",e.target.value)}/></label>}
      {error&&<p className="form-error" role="alert">{error}</p>}
      {confirmDelete&&<div className="delete-confirm"><strong>Retirer « {draft.title} » de la collection ?</strong><p>Ses informations et sa date de réalisation seront supprimées.</p><button type="button" className="text-button" disabled={saving} onClick={()=>setConfirmDelete(false)}>Le garder</button><button type="button" className="button danger" disabled={saving} onClick={remove}>Retirer ce puzzle</button></div>}
      <div className="dialog-footer">{!isNew&&!statusOnly&&!confirmDelete&&<button type="button" className="delete-button" disabled={saving} onClick={()=>setConfirmDelete(true)} aria-label="Retirer ce puzzle de la collection"><Trash2 size={16}/></button>}<button type="button" className="button secondary" disabled={saving} onClick={onClose}>Annuler</button><button className="button primary" type="submit" disabled={saving}>{saving?<LoaderCircle size={17} className="spin"/>:<Check size={17}/>}<span>{saving?"Enregistrement…":modal.kind==="purchase"?"Ajouter à ma collection":isNew?draft.collectionType==="wishlist"?"Ajouter à ma liste":"Ajouter à ma collection":statusOnly?"Enregistrer le statut":"Enregistrer"}</span></button></div>
    </form>
  </dialog>;
}
