import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
process.chdir(root);
const [major,minor]=process.versions.node.split(".").map(Number);
if(major<22||(major===22&&minor<13))throw new Error("Le carnet nécessite Node.js 22.13 ou plus récent. Utilisez le fichier lancer-site.command.");
function run(args,options={}){
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:"inherit",...options});
  if(result.error)throw result.error;
  if(result.signal==="SIGINT")process.exit(0);
  if(result.status!==0)process.exit(result.status||1);
}
if(!existsSync("node_modules/vinext/dist/cli.js")){
  console.log("Installation des composants du carnet (premier lancement)…");
  run(["scripts/install-ci.mjs"]);
}
if(!existsSync("dist/server/wrangler.json")){
  console.log("Préparation du carnet (premier lancement)…");
  run(["scripts/run-framework.mjs","build"]);
}
const built=JSON.parse(readFileSync("dist/server/wrangler.json","utf8"));
mkdirSync(".sites-runtime",{recursive:true});
const localConfig=resolve(".sites-runtime/local-database.json");
writeFileSync(localConfig,JSON.stringify({
  name:"mon-carnet-puzzles-local",compatibility_date:built.compatibility_date,
  d1_databases:built.d1_databases.map(db=>({...db,migrations_dir:resolve("drizzle")})),
},null,2));
console.log("Vérification de la sauvegarde locale…");
run(["--import","./scripts/sites-env.mjs","node_modules/wrangler/bin/wrangler.js","d1","migrations","apply","DB","--local","--config",localConfig,"--persist-to",".wrangler/state"],{stdio:["pipe","inherit","inherit"],input:"y\n",env:{...process.env,CI:"true"}});
const args=process.argv.slice(2);
const portIndex=args.indexOf("--port");
const port=portIndex>=0?Number(args[portIndex+1]):5173;
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error("Choisissez un port entre 1024 et 65535.");
console.log(`\nVotre carnet : http://127.0.0.1:${port}/\nGardez cette fenêtre ouverte. Pour arrêter : Ctrl+C.\n`);
run(["scripts/run-framework.mjs","dev","--hostname","127.0.0.1","--port",String(port)]);
