# Pièce après pièce

Le carnet personnel de puzzles d’Amandine : 21 puzzles importés de son PDF, leurs images, marques, auteurs, nombres de pièces et dates de réalisation.

## Version GitHub Pages

La version statique peut être publiée depuis le dossier `docs/` de la branche `main`. Elle reprend les fiches du PDF et conserve les ajouts, les changements de statut et les photos **dans le navigateur utilisé**. Elle ne nécessite pas de serveur ni de connexion à un compte pour fonctionner.

Un site GitHub Pages est **accessible publiquement** : les 21 fiches et images initiales publiées dans le dépôt peuvent être consultées par toute personne qui accède au site. Les ajouts effectués ensuite restent dans le navigateur et ne sont pas envoyés sur GitHub.

Dans le site, le bouton **Sauvegarder** télécharge un fichier contenant les fiches, les souhaits et les photos ajoutées. Le bouton **Restaurer** permet de récupérer ce fichier, y compris sur un autre navigateur. Conservez régulièrement cette sauvegarde : les données du navigateur peuvent être effacées, et elles ne sont pas synchronisées automatiquement entre appareils ni avec les autres versions du carnet.

Après modification du code, exécutez `npm run build:pages`, puis committez et poussez les fichiers actualisés, y compris `docs/` : GitHub Pages publiera la nouvelle version.

## Lancer le site

Dans le Terminal :

```sh
cd ~/Workspace/mon-carnet-puzzles
./lancer-site.command
```

Ouvrez ensuite **http://127.0.0.1:5173/**. Gardez le Terminal ouvert pendant l’utilisation du carnet. Pour arrêter le site, appuyez sur **Ctrl+C** dans cette fenêtre. Vous pouvez aussi double-cliquer sur `lancer-site.command` dans le Finder.

Le lanceur repère une version récente de Node.js sur ce Mac, prépare les composants au besoin et applique seulement les nouvelles mises à jour de la base locale. Aucun compte supplémentaire ni clé d’API n’est nécessaire. Sur un autre ordinateur, installez Node.js 22.13 ou plus récent puis exécutez `npm ci` et `npm run local`.

Si le port est occupé, utilisez `./lancer-site.command --port 5174`, puis ouvrez `http://127.0.0.1:5174/`.

## Utiliser le carnet

- **Ma collection** contient les puzzles que vous possédez. Ajoutez une boîte avec le bouton « Ajouter un puzzle ».
- **Marquer comme fait** permet de choisir une date précise ou seulement un mois et une année. Vous pouvez revenir au statut « À faire ».
- **Liste de souhaits** contient les futurs achats. « Je l’ai acheté » transfère le puzzle dans la collection en conservant ses informations.
- Le crayon ouvre la modification d’une fiche. Une photo et une note sont facultatives.
- La recherche, les filtres et le tri permettent de retrouver une boîte. « Exporter la collection » exporte tout le carnet, souhaits compris, au format CSV.

## Où sont enregistrées les données ?

**La version locale conserve ses données sur ce Mac**, dans le dossier masqué `.wrangler/state/` du projet, y compris les photos ajoutées. Ne supprimez pas ce dossier pour conserver vos ajouts. Pour une sauvegarde complète, copiez ce dossier lorsque le site est arrêté. Les fichiers exportés en CSV sont une copie lisible de vos fiches ; ils ne contiennent pas les photos.

La version privée en ligne est disponible à l’adresse https://la-puzzlotheque-d-amandine.movingtune1.chatgpt.site. Elle conserve ses données et ses photos en ligne. **Les carnets local et en ligne sont indépendants** : une modification dans l’un ne se répercute pas automatiquement dans l’autre.

Les 21 fiches de départ proviennent du PDF. Les mois indiqués dans celui-ci sont conservés sans inventer de jour précis. Les dates d’achat et l’auteur manquant sont laissés non renseignés. Les images de départ sont extraites du document fourni.

## Développement

Sources React et TypeScript dans `app/`, accès aux données dans `lib/`, images dans `public/puzzles/`, schéma dans `db/schema.ts` et migrations dans `drizzle/`.

```sh
npm run local        # préparation et lancement local
npm run build       # construction de la version de production
npx tsc --noEmit     # vérification TypeScript
npm run db:generate # génération d’une migration après modification du schéma
```

Les fichiers de configuration locale, les données, les dépendances et les constructions sont exclus du dépôt Git. La configuration d’hébergement `.openai/hosting.json` conserve l’identité du site privé existant.
