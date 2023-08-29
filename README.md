# nosgestesclimat-server

Une application NodeJs-Express-MongoDB-Websocket qui gère la fonctionnalité
sondage de
[nosgestesclimat-site](https://github.com/datagir/nosgestesclimat-site).

## Dev

Pour l'utiliser en local, cloner nosgestesclimat-site et créer un fichier .env contenant

```
SERVER_URL=localhost:3000
```

Ensuite,

```
sudo service mongod start # Sur ubuntu

yarn dev
```

Pour se connecter à la base de données, on peut utiliser la commande utilisant
le CLI `scalingo`. 
Pour une interface graphique, on peut utiliser MongoDB Compass en suivant [ce
guide](https://doc.scalingo.com/databases/mongodb/compass#connection-via-the-db-tunnel-of-our-cli)
(la connexion est compliquée sans ce guide). 

## Contextualisation des sondages

Une fonctionnalité a été implémentée afin de permettre aux organisateurs de
sondages de recueillir des informations supplémentaires sur les sondés via un
questionnaire de quelques questions en début de simulation (questions qui ne
sont pas liées au test Nos Gestes Climat : par exemple leur âge, leur métier,
etc.). Un [guide
dédié](https://nosgestesclimat.fr/groupe/documentation-contexte) explique de
manière détaillée le principe de cette feature !

Les fichiers permettant
de[/contextes-sondage](https://github.com/incubateur-ademe/nosgestesclimat-server/tree/master/contextes-sondage)

### Commment lier un fichier de contexte à un sondage

1. Créer un nouveau fichier `/contexte-sondage/<nom-fichier>.yaml` sur la base
   de ce [template](https://github.com/incubateur-ademe/nosgestesclimat-server/blob/master/contextes-sondage/template%20de%20contexte.yaml).
2. Ouvrir une console mongodb:
```
scalingo -a nosgestesclimat mongo-console
```
3. Trouver le sondage que l'on souhaite contextualiser:
```
db.surveys.find({name: "<nom-sondage"}).pretty()
```
4. Une fois que l'on s'est assuré que c'est le bon sondage, il suffit d'ajouter
   le champ `contextFile`:
```
db.surveys.updateOne({name: "<nom-sondage>"}, {$set: {contextFile: "<nom-fichier>"}})
```
