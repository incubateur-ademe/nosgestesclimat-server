# nosgestesclimat-server

Une application NodeJs-Express-MongoDB-Websocket qui gère la fonctionnalité sondage de [nosgestesclimat-site](https://github.com/datagir/nosgestesclimat-site).

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

## Contextualisation des sondages

Une fonctionnalité a été implémentée afin de permettre aux organisateurs de sondages de recueillir des informations supplémentaires sur les sondés via un questionnaire de quelques questions en début de simulation (questions qui ne sont pas liées au test Nos Gestes Climat : par exemple leur âge, leur métier, etc.). Un [guide dédié](https://nosgestesclimat.fr/groupe/documentation-contexte) explique de manière détaillée le principe de cette feature !

Les fichiers permettant de[/contextes-sondage](https://github.com/datagir/nosgestesclimat-server/tree/master/contextes-sondage)
