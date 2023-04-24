Pour récupérer les données de l'enquête, voici la procédure.

```
scalingo --app nosgestesclimat-pr9 run "node exportSimulations.js &> /dev/null && cat export/simulations-21-04-2023.csv" > simu.csv
```
