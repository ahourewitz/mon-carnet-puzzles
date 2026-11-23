/** Compare the same brand even when spacing, case or accents differ. */
export function brandKey(value:string):string {
  const key=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").trim().replace(/\s*&\s*/g,"&").replace(/\s+/g," ");
  if(key==="pieces&piece")return "pieces&peace";
  if(key==="reverie")return "reverie puzzle";
  return key;
}

export function displayBrand(value:string):string {
  const names:Record<string,string>={"pieces&peace":"Pieces & Peace","reverie puzzle":"Reverie Puzzle","the magic puzzle":"The Magic Puzzle"};
  return names[brandKey(value)]||value.trim().replace(/\s+/g," ");
}
