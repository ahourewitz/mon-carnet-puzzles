/// <reference types="vite/client" />
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Collection from "../app/collection";
import { LocalPuzzleStorage } from "../lib/browser-storage";
import type { Puzzle } from "../lib/puzzle";
import "../app/globals.css";

const storage=new LocalPuzzleStorage();
function App(){
  const [items,setItems]=useState<Puzzle[]|null>(null),[error,setError]=useState("");
  useEffect(()=>{let active=true;storage.list().then(p=>{if(active)setItems(p);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Impossible d’ouvrir votre carnet.");});return()=>{active=false;};},[]);
  if(error)return <main className="startup"><h1>Impossible d’ouvrir le carnet</h1><p>{error}</p><p>Autorisez le stockage de ce site dans votre navigateur, puis rechargez la page.</p></main>;
  if(!items)return <main className="startup" aria-live="polite"><h1>Pièce après pièce</h1><p>Ouverture de votre carnet…</p></main>;
  return <Collection initialPuzzles={items} storage={storage} assetBase={import.meta.env.BASE_URL}/>;
}

createRoot(document.getElementById("root")!).render(<App/>);
