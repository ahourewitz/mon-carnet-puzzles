import seed from "../db/seed.json";
import { brandKey } from "./brands";

export const SUGGESTED_THEMES = ["Automne", "Chandeleur", "Halloween", "Hiver", "Noël", "Pâques", "Printemps", "Été", "Toute l’année"];
export const themeKey = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("fr");

// Stable IDs are preferred; the title and brand also identify older imported copies.
export function seedThemesFor(puzzle:{id:string; title:string; brand:string}):string[] {
  const direct=seed.find(item=>item.id===puzzle.id);
  if(direct)return [...direct.themes];
  const matches=seed.filter(item=>themeKey(item.title)===themeKey(puzzle.title)&&brandKey(item.brand)===brandKey(puzzle.brand));
  return matches.length===1?[...matches[0].themes]:[];
}
