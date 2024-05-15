import { faker } from '@faker-js/faker'

const DEFAULT_SIMULATION_OBJECT = {
  situation: {
    'transport . voiture . km': 2000,
    'transport . voiture . utilisateur régulier': 'non',
    'transport . voiture . voyageurs': 1,
    'transport . avion . usager': 'oui',
    'transport . avion . court courrier . heures de vol': 0,
    'transport . avion . moyen courrier . heures de vol': 0,
    'transport . avion . long courrier . heures de vol': 30,
    'transport . deux roues . usager': 'non',
    'transport . mobilité douce . vélo . présent': 'oui',
    'transport . mobilité douce . marche . présent': 'oui',
    'transport . mobilité douce . vae . présent': 'oui',
    'transport . mobilité douce . autres véhicules à moteur . présent': 'non',
    'transport . mobilité douce . notif marche ou vélo': 0,
    'transport . mobilité douce . vae . km': 250,
    'transport . bus . heures par semaine': 0,
    'transport . train . km': 25000,
    'transport . métro ou tram . heures par semaine': 0,
    'transport . vacances . caravane . propriétaire': 'non',
    'transport . vacances . camping car . propriétaire': 'non',
    'transport . vacances . van . propriétaire': 'non',
    'transport . ferry . usager': 'non',
    'alimentation . plats . végétalien . nombre': 3,
    'alimentation . plats . végétarien . nombre': 11,
    'alimentation . plats . viande blanche . nombre': 0,
    'alimentation . plats . viande rouge . nombre': 0,
    'alimentation . plats . poisson gras . nombre': 0,
    'alimentation . plats . poisson blanc . nombre': 0,
    'alimentation . petit déjeuner . type': "'continental'",
    'alimentation . local . consommation': "'souvent'",
    'alimentation . de saison . consommation': "'souvent'",
    'alimentation . boisson . chaude . café . nombre': 28,
    'alimentation . boisson . chaude . thé . nombre': 0,
    'alimentation . boisson . chaude . chocolat chaud . nombre': 0,
    'alimentation . boisson . chaude . chicorée . nombre': 0,
    'alimentation . boisson . sucrées . litres': 0,
    'alimentation . boisson . alcool . litres': 0,
    'alimentation . boisson . eau en bouteille . consommateur': 'non',
    'alimentation . déchets . quantité jetée': "'réduction'",
    'logement . surface': 47,
    'logement . habitants': 1,
    'logement . appartement': 'oui',
    'logement . âge': 45,
    'logement . électricité . consommation': 4095,
    'logement . chauffage . gaz . présent': 'oui',
    'logement . chauffage . PAC . présent': 'non',
    'logement . chauffage . électricité . présent': 'non',
    'logement . chauffage . réseau de chaleur . présent': 'non',
    'logement . chauffage . bouteille gaz . présent': 'non',
    'logement . chauffage . citerne propane . présent': 'non',
    'logement . chauffage . fioul . présent': 'non',
    'logement . chauffage . bois . présent': 'non',
    'logement . chauffage . gaz . consommation': 1578.8,
    'logement . chauffage . gaz . biogaz': 'oui',
    'logement . chauffage . gaz . avertissement biogaz': 0,
    'logement . chauffage . biogaz . part': 50,
    'logement . climatisation . présent': 'non',
    'logement . vacances . hotel . présent': 'oui',
    'logement . vacances . camping . présent': 'non',
    'logement . vacances . auberge de jeunesse . présent': 'non',
    'logement . vacances . locations . présent': 'oui',
    'logement . vacances . famille ou amis . présent': 'oui',
    'logement . vacances . échange . présent': 'non',
    'logement . vacances . résidence secondaire . présent': 'non',
    'logement . vacances . famille ou amis . notif': 0,
    'logement . vacances . hotel . nombre de nuitées': 7,
    'logement . vacances . locations . nombre de nuitées': 7,
    'divers . animaux domestiques . empreinte . chien moyen . nombre': 1,
    'divers . animaux domestiques . empreinte . petit chien . nombre': 0,
    'divers . animaux domestiques . empreinte . gros chien . nombre': 0,
    'divers . animaux domestiques . empreinte . chats . nombre': 0,
    'divers . textile . sweat . nombre': 1,
    'divers . textile . t-shirt . nombre': 1,
    'divers . textile . pantalon . nombre': 0,
    'divers . textile . short . nombre': 0,
    'divers . textile . robe . nombre': 0,
    'divers . textile . chemise . nombre': 0,
    'divers . textile . pull . nombre': 0,
    'divers . textile . chaussure . nombre': 0,
    'divers . textile . manteau . nombre': 0,
    'divers . textile . petit article . nombre': 3,
    'divers . textile . gros article . nombre': 1,
    'divers . textile . notif débarras surplus': 0,
    'divers . électroménager . appareils . lave-vaisselle . nombre': 1,
    'divers . électroménager . appareils . réfrigérateur . nombre': 1,
    'divers . électroménager . appareils . petit réfrigérateur . nombre': 0,
    'divers . électroménager . appareils . congélateur . nombre': 0,
    'divers . électroménager . appareils . lave-linge . nombre': 0,
    'divers . électroménager . appareils . sèche-linge . nombre': 0,
    'divers . électroménager . appareils . four . nombre': 0,
    'divers . électroménager . appareils . micro-onde . nombre': 0,
    'divers . électroménager . appareils . plaques . nombre': 0,
    'divers . électroménager . appareils . hotte . nombre': 0,
    'divers . électroménager . appareils . bouilloire . nombre': 0,
    'divers . électroménager . appareils . cafetière . nombre': 0,
    'divers . électroménager . appareils . aspirateur . nombre': 0,
    'divers . électroménager . appareils . robot cuisine . nombre': 0,
    'divers . électroménager . préservation': "'maximum'",
    'divers . ameublement . meubles . lit . nombre': 1,
    'divers . ameublement . meubles . armoire . nombre': 0,
    'divers . ameublement . meubles . canapé . nombre': 1,
    'divers . ameublement . meubles . matelas . nombre': 1,
    'divers . ameublement . meubles . table . nombre': 0,
    'divers . ameublement . meubles . chaise . nombre': 0,
    'divers . ameublement . meubles . petit meuble . nombre': 0,
    'divers . ameublement . meubles . grand meuble . nombre': 0,
    'divers . ameublement . préservation': "'maximum'",
    'divers . numérique . préservation': "'maximum'",
    'divers . numérique . appareils . ordinateur portable . nombre': 1,
    'divers . numérique . appareils . téléphone . nombre': 0,
    'divers . numérique . appareils . TV . nombre': 0,
    'divers . numérique . appareils . ordinateur fixe . nombre': 0,
    'divers . numérique . appareils . tablette . nombre': 0,
    'divers . numérique . appareils . vidéoprojecteur . nombre': 1,
    'divers . numérique . appareils . appareil photo . nombre': 0,
    'divers . numérique . appareils . home cinéma . nombre': 0,
    'divers . numérique . appareils . enceinte bluetooth . nombre': 0,
    'divers . numérique . appareils . enceinte vocale . nombre': 0,
    'divers . numérique . appareils . montre connectée . nombre': 0,
    'divers . numérique . appareils . console de salon . nombre': 1,
    'divers . numérique . appareils . console portable . nombre': 0,
    'divers . numérique . internet . durée journalière': 2,
    'divers . produits consommables . consommation': "'normale'",
    'divers . loisirs . culture . pratique de la musique . présent': 'oui',
    'divers . loisirs . culture . concerts et spectacles . présent': 'oui',
    'divers . loisirs . culture . musées et monuments . présent': 'oui',
    'divers . loisirs . culture . édition . présent': 'oui',
    'divers . loisirs . sports . individuel extérieur . présent': 'oui',
    'divers . loisirs . sports . balle ou ballon . présent': 'non',
    'divers . loisirs . sports . aquatique . présent': 'non',
    'divers . loisirs . sports . martial ou combat . présent': 'non',
    'divers . loisirs . sports . athlétisme . présent': 'non',
    'divers . loisirs . sports . salle de sport . présent': 'non',
    'divers . loisirs . sports . équitation . présent': 'non',
    'divers . loisirs . sports . golf . présent': 'non',
    'divers . loisirs . sports . nautique . présent': 'non',
    'divers . loisirs . sports . hiver montagne . présent': 'non',
    'divers . loisirs . sports . sports énergivores . présent': 'non',
    'divers . loisirs . sports . autres sports . présent': 'non',
    'divers . autres produits . niveau de dépenses': "'important'",
    'divers . tabac . consommation par semaine': 0,
    'services sociétaux . question rhétorique': "'ok'",
  },
  foldedSteps: [
    'transport . voiture . km',
    'transport . voiture . utilisateur régulier',
    'transport . voiture . voyageurs',
    'transport . avion . usager',
    'transport . avion . court courrier . heures de vol',
    'transport . avion . moyen courrier . heures de vol',
    'transport . avion . long courrier . heures de vol',
    'transport . deux roues . usager',
    'transport . mobilité douce',
    'transport . mobilité douce . vae . km',
    'transport . bus . heures par semaine',
    'transport . train . km',
    'transport . métro ou tram . heures par semaine',
    'transport . vacances',
    'transport . ferry . usager',
    'alimentation . plats',
    'alimentation . petit déjeuner . type',
    'alimentation . local . consommation',
    'alimentation . de saison . consommation',
    'alimentation . boisson . chaude',
    'alimentation . boisson . sucrées . litres',
    'alimentation . boisson . alcool . litres',
    'alimentation . boisson . eau en bouteille . consommateur',
    'alimentation . déchets . quantité jetée',
    'alimentation . déchets . gestes',
    'logement . surface',
    'logement . habitants',
    'logement . appartement',
    'logement . âge',
    'logement . électricité . consommation',
    'logement . chauffage',
    'logement . chauffage . gaz . consommation',
    'logement . chauffage . gaz . biogaz',
    'logement . chauffage . biogaz . part',
    'logement . climatisation . présent',
    'logement . vacances',
    'logement . vacances . hotel . nombre de nuitées',
    'logement . vacances . locations . nombre de nuitées',
    'divers . animaux domestiques . empreinte',
    'divers . textile',
    'divers . électroménager . appareils',
    'divers . électroménager . préservation',
    'divers . ameublement . meubles',
    'divers . ameublement . préservation',
    'divers . numérique . préservation',
    'divers . numérique . appareils',
    'divers . numérique . internet . durée journalière',
    'divers . produits consommables . consommation',
    'divers . loisirs . culture',
    'divers . loisirs . sports',
    'divers . autres produits . niveau de dépenses',
    'divers . tabac . consommation par semaine',
    'services sociétaux . question rhétorique',
  ],
  actionChoices: {},
  computedResults: {
    categories: {
      transport: 3827.243114009238,
      alimentation: 1168.51028432354,
      logement: 1001.1886999999999,
      divers: 908.5444771228115,
      'services sociétaux': 1450.9052263863641,
    },
    bilan: 8356.391801841954,
  },
  progression: 1,
}

// Create a function that generates a computedResults object
// with random values between 800 and 4000 for each category
function generateComputedResults() {
  const categories = [
    'transport',
    'alimentation',
    'logement',
    'divers',
    'services sociétaux',
  ]
  const computedResults = {
    categories: {},
    bilan: 0,
  }

  for (const category of categories) {
    computedResults.categories[category] = faker.number.int({
      min: 800,
      max: 4000,
    })
    computedResults.bilan += computedResults.categories[category]
  }

  return computedResults
}

export async function generateSignupData(requestParams, ctx, next) {
  ctx.vars.simulationId = faker.string.uuid()
  ctx.vars.date = faker.date.recent()
  ctx.vars.userId = faker.string.uuid()
  ctx.vars.orgaAdminUserId =
    process.env.NODE_END === 'production'
      ? '8778ad78-1d82-4e11-8d63-2cc781c1fbc8'
      : 'a57e829c-94ec-444f-8745-282ccb0262e8'
  ctx.vars.situation = DEFAULT_SIMULATION_OBJECT.situation
  ctx.vars.foldedSteps = DEFAULT_SIMULATION_OBJECT.foldedSteps
  ctx.vars.actionChoices = {}
  ctx.vars.computedResults = generateComputedResults()
  ctx.vars.polls =
    process.env.NODE_ENV === 'production' ? ['Hp5651'] : ['Hplkdz'] // Preprod : ['GnFtH-']
  ctx.vars.orgaSlug =
    process.env.NODE_ENV === 'production'
      ? 'entreprise-test'
      : 'la-vie-claire-paris-13-glaciere'
}
