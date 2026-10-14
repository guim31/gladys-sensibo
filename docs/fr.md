# Sensibo

Pilotez depuis Gladys les climatisations et pompes à chaleur air-air commandées
par un [Sensibo](https://sensibo.com) (Sky, Air, Air Pro), par l'API cloud
officielle de Sensibo : marche/arrêt, mode, température de consigne, vitesse de
ventilation et balayage, Climate React, ainsi que la température ambiante,
l'humidité et la qualité de l'air mesurées par le Sensibo. Le Sensibo Pure
(purificateur d'air) et l'Elements (capteur de qualité de l'air) sont aussi pris
en charge. Un widget de tableau de bord montre toutes les clims avec des boutons
Allumer et Éteindre, et des scènes réagissent quand un Sensibo passe hors ligne
ou qu'un filtre est à nettoyer.

> **Développée sans le matériel : vos retours sont les bienvenus.** Cette
> intégration a été construite et testée sur un cloud Sensibo simulé, alimenté
> par de vrais appareils des données de test de pysensibo et de Home Assistant,
> pas avec un vrai compte Sensibo. Si quelque chose ne marche pas comme décrit,
> dites-le sur le [forum Gladys](https://community.gladysassistant.com) ou dans
> les [issues](https://github.com/guim31/gladys-sensibo/issues).

## Ce qu'il vous faut

- Gladys Assistant 5.1.0 ou plus récent.
- Un **compte Sensibo**, avec vos appareils déjà installés dans l'application
  Sensibo (télécommande de la clim détectée).
- Une **clé d'API** Sensibo : connectez-vous sur
  [home.sensibo.com/me/api](https://home.sensibo.com/me/api) et créez-en une.
- Une connexion Internet : l'intégration passe par le cloud Sensibo.

## Mise en route

1. Installez l'intégration depuis le catalogue de Gladys.
2. Dans **Configuration**, collez la **Clé d'API**, puis enregistrez.
3. Cliquez sur **Tester la connexion** : le message sous le bouton liste les
   appareils du compte.
4. Ouvrez l'onglet **Découverte** : un appareil par Sensibo, nommé comme sa
   pièce dans l'application Sensibo. Cliquez sur **Ajouter**, choisissez une
   pièce, enregistrez.

Options :

- **Intervalle de rafraîchissement** : la fréquence de lecture du cloud
  Sensibo, de 1 à 10 minutes (2 minutes par défaut). Une seule requête lit tous
  les appareils. Un changement fait depuis Gladys s'affiche tout de suite ; un
  changement fait à la télécommande ou dans l'application Sensibo apparaît à la
  lecture suivante.
- **Langue des noms** : anglais, français, allemand ou espagnol (français par
  défaut), pour les noms de fonctionnalités (donnés à l'ajout d'un appareil) et
  les messages de l'intégration.

## L'appareil de chaque Sensibo

| Fonctionnalité          | Ce que c'est                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Marche/arrêt            | Allume et éteint la clim (ou le Pure)                                                                         |
| Mode                    | Auto, Refroidissement, Chauffage, Déshumidification, Ventilation : seulement ceux que propose la télécommande |
| Température de consigne | Bornée par les consignes de la télécommande, dans l'unité choisie dans l'application Sensibo                  |
| Vitesse de ventilation  | Auto, de faible à forte, silencieux, turbo : les vitesses que propose la télécommande dans le mode en cours   |
| Balayage vertical       | Arrêt, balayage, ou l'une de cinq positions fixes                                                             |
| Balayage horizontal     | Arrêt, balayage, ou l'une de cinq positions fixes                                                             |
| Climate React           | Allume ou éteint l'automatisme Climate React, réglé dans l'application Sensibo                                |
| Température ambiante    | Mesurée par le Sensibo, en lecture seule                                                                      |
| Humidité                | Mesurée par le Sensibo, en lecture seule                                                                      |
| CO2                     | Air Pro et Elements, en lecture seule                                                                         |
| COV totaux              | Composés organiques volatils, Air Pro et Elements, en lecture seule                                           |
| PM2.5                   | Particules fines, Elements, en lecture seule                                                                  |
| Durée de vie du filtre  | Part de l'intervalle de nettoyage restante : 0 % veut dire nettoyer le filtre                                 |

Une fonctionnalité n'apparaît que si l'appareil la propose : le Pure a
Marche/arrêt et la durée de vie du filtre, l'Elements seulement ses mesures. Le
badge de l'appareil indique **Cloud** tant que le Sensibo est connecté et
**Injoignable** quand il est hors ligne.

**Sécurité.** Une commande ne sort jamais de ce que la télécommande de votre
clim sait envoyer : un mode qu'elle n'a pas est refusé, une consigne est ramenée
dans ses valeurs (17 °C demandés sur une télécommande qui refroidit à partir de
18 °C donnent 18 °C), et une vitesse ou une position de balayage absente du mode
en cours est refusée avec un message. Ce sont les fonctionnalités de
climatisation que Gladys donne à ses autres clims.

## Tableau de bord

Ajoutez le widget **Clims Sensibo** à un tableau de bord. Par défaut, il liste
toutes les clims : Arrêt, ou le mode et la consigne quand elle tourne, puis la
température de la pièce. Choisissez-en une dans ses réglages pour ne montrer
qu'elle. Ses deux boutons agissent sur ce que le widget montre :

- **Allumer** : rallume avec le dernier mode et la dernière consigne, comme le
  bouton marche de la télécommande ;
- **Éteindre** : éteint.

Le bouton de l'état en cours porte une coche quand toutes les clims montrées y
sont. Mode, consigne et ventilation sont sur l'appareil.

## Scènes

### Déclencheurs

- **Sensibo hors ligne** : un Sensibo a perdu sa connexion au cloud Sensibo
  (Wi-Fi, coupure de courant). Filtre : l'appareil. Variables : nom et
  appareil.
- **Sensibo de nouveau en ligne** : le Sensibo est de nouveau connecté. Filtre :
  l'appareil.
- **Filtre à nettoyer** : Sensibo signale que le filtre est à nettoyer, d'après
  la durée de marche réglée dans l'application Sensibo. Filtre : l'appareil.

Pour une température ou une humidité hors plage, utilisez le déclencheur
d'appareil de Gladys sur la fonctionnalité _Température ambiante_ ou _Humidité_
(par exemple « au-dessus de 28 °C ») : il se déclenche déjà au franchissement.

### Actions

- **Allumer des clims Sensibo** : une clim, ou toutes si le champ est vide, dans
  un mode (Refroidissement, Chauffage, Auto, Déshumidification, Ventilation), à
  une température, en une seule commande. La température est ramenée dans les
  consignes de chaque télécommande pour ce mode ; vide, celle en cours est
  gardée. Sorties : le nombre de clims allumées et la température appliquée.
- **Éteindre des clims Sensibo** : une clim, ou toutes si le champ est vide.
  Celles hors ligne sont ignorées. Sortie : le nombre de clims éteintes.

Pour une seule fonctionnalité d'un appareil, l'action Gladys _Contrôler un
appareil_ fonctionne aussi.

### Idées de scènes

- **Départ de la maison** (alarme activée) : _Éteindre des clims Sensibo_,
  champ vide : toutes les clims éteintes.
- **Canicule** : quand la _Température ambiante_ de la chambre dépasse 27 °C,
  entre 14 h et 20 h : _Allumer des clims Sensibo_, chambre, Refroidissement, 25.
- **Rappel du filtre** : _Filtre à nettoyer_ → envoyer un message : « Nettoyer
  le filtre de {{triggerEvent.data.name}} ».

## Dépannage

- **« Sensibo refuse la clé d'API »** : vérifiez la clé sur
  [home.sensibo.com/me/api](https://home.sensibo.com/me/api), ou créez-en une
  nouvelle. Après cette erreur, l'intégration arrête de lire jusqu'à ce que vous
  enregistriez la configuration ou cliquiez sur **Tester la connexion**.
- **« Trop de requêtes »** : le cloud Sensibo limite les requêtes d'une clé ;
  l'intégration patiente dix minutes. Choisissez un intervalle plus long si
  cela revient.
- **Un mode ou une vitesse est refusé** : la télécommande de votre clim ne le
  propose pas dans ce mode. L'application Sensibo montre ce qu'elle propose.
- **La clim ne réagit pas** : un Sensibo envoie de l'infrarouge : vérifiez qu'il
  voit l'unité intérieure et que la télécommande réglée dans l'application
  Sensibo est la bonne.
- **Plus de détails** : les journaux de l'intégration (Paramètres → Intégrations
  → Sensibo). Ils ne contiennent jamais la clé d'API.

## Limites

- Cloud uniquement : sans Internet, ou quand le cloud Sensibo est en panne, rien
  ne se pilote depuis Gladys.
- Une lecture par minute au plus, pour respecter les limites de l'API Sensibo.
  Les changements faits à la télécommande sont vus à la lecture suivante.
- L'infrarouge n'a pas de retour : l'état affiché est le dernier envoyé par
  Sensibo, pas un état lu dans la clim.
- Climate React, programmations, minuteries, Pure Boost et détecteurs de
  mouvement Sensibo se règlent dans l'application Sensibo ; Gladys ne fait
  qu'allumer ou éteindre Climate React. La vitesse du Pure n'est pas exposée.
- Sur un tableau de bord, Gladys peut afficher l'interrupteur Climate React sous
  son nom générique, « Commutateur ».
- Développée sans le matériel : vos retours sont les bienvenus.
- Sans lien avec Sensibo.
