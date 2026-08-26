# Script de soutenance — Smart-HR

Script complet, slide par slide (18 slides), rédigé pour être lu/répété à voix haute.

---

## Slide 1 — Page de garde *(déjà validé)*

Monsieur le Président du jury,
Messieurs les membres du jury,
Honorables invités,

Permettez-moi tout d'abord de me présenter. Je m'appelle Zoubeir Ibrahima Amed, étudiant en Licence Professionnelle Informatique Appliquée à la Gestion des Entreprises à l'Institut Supérieur d'Informatique.

C'est avec un grand plaisir que je vous présente aujourd'hui mon rapport de fin de cycle, réalisé sous la direction de Monsieur Abdoulaye Gaye, qui porte sur le sujet suivant : Conception et réalisation d'une plateforme de gestion des ressources humaines basée sur l'intelligence artificielle.

Avant d'entrer dans le sujet, je vous propose de suivre le plan de cette présentation.

---

## Slide 2 — Sommaire

Comme vous pouvez le voir, ma présentation s'articule autour de huit points : je commencerai par présenter le **contexte** qui a motivé ce projet, puis le **sujet** à proprement parler. J'exposerai ensuite les **objectifs** visés, la **modélisation** du système, l'**architecture** technique retenue, ainsi que les **outils et technologies** utilisées. Je terminerai par les **réalisations** concrètes, avant de conclure par un **bilan** et les perspectives d'évolution du projet.

---

## Slide 3 — Contexte

Commençons par le contexte. Aujourd'hui encore, dans de nombreuses PME, la gestion des ressources humaines repose sur des outils passifs : fichiers Excel, documents papier, échanges par email.

Cette approche pose plusieurs problèmes. D'abord, un **manque de traçabilité** : il est difficile de retrouver l'historique des décisions, des congés ou des évaluations. Ensuite, ces **outils RH restent passifs** : ils se contentent de stocker la donnée, sans jamais l'exploiter pour anticiper quoi que ce soit. Enfin, du côté des employés, cela se traduit concrètement par des délais : une demande de congé, une question RH, restent souvent **en attente d'une réponse manuelle**, parfois pendant plusieurs jours.

C'est ce constat qui est à l'origine de mon projet.

---

## Slide 4 — Sujet

Face à ce constat, le sujet que j'ai choisi de traiter est le suivant : **la conception et la réalisation d'une plateforme de gestion des ressources humaines basée sur l'intelligence artificielle**, que j'ai appelée Smart-HR.

L'idée centrale est simple : transformer un SIRH classique, qui se contente de stocker la donnée, en un outil **proactif**, capable d'analyser cette donnée pour anticiper les besoins RH plutôt que de simplement les enregistrer.

---

## Slide 5 — Objectifs

Pour concrétiser ce sujet, je me suis fixé un objectif général : **proposer une solution innovante pour moderniser la gestion RH en PME**. Cet objectif se décline en cinq objectifs spécifiques.

Premièrement, mettre en place un **socle RH centralisé**, qui regroupe la gestion des employés, des congés, des présences et des paies.

Deuxièmement, développer un **agent prédictif de churn**, c'est-à-dire un modèle capable d'anticiper les risques de départ des employés.

Troisièmement, intégrer un module de **recrutement intelligent basé sur le NLP**, pour analyser automatiquement les CVs des candidats.

Quatrièmement, proposer un **chatbot RH** capable de répondre aux questions des utilisateurs.

Et cinquièmement, assurer un **déploiement en production réel**, avec Docker, une chaîne CI/CD, Nginx et le protocole SSL.

---

## Slide 6 — Modélisation (introduction)

Avant de vous présenter l'architecture et les technologies, je vais d'abord m'arrêter sur la modélisation du système. Pour cela, j'ai utilisé le langage **UML**, *Unified Modeling Language*, qui est un langage visuel standardisé permettant de spécifier, visualiser, construire et documenter les éléments d'un système logiciel.

Je vais vous présenter deux types de diagrammes : les **diagrammes de cas d'utilisation**, qui décrivent les interactions entre les acteurs et le système, puis le **diagramme de classes**, qui décrit la structure interne des données.

---

## Slide 7 — Diagramme de cas d'utilisation général

Ce premier diagramme présente la vision globale de la plateforme Smart-HR. On y retrouve les quatre acteurs principaux du système.

**L'employé**, qui consulte son profil, pose des demandes de congés et suit ses tâches. **Le responsable RH**, qui gère l'ensemble du personnel, valide les congés et pilote le recrutement. **L'administrateur système**, qui supervise les utilisateurs, la sécurité et la configuration globale de la plateforme. Et enfin **le candidat**, un acteur externe qui consulte les offres d'emploi et postule en ligne.

Toutes les actions, quel que soit l'acteur, nécessitent une authentification préalable afin de sécuriser l'accès au système.

---

## Slide 8 — Cas d'utilisation : Gestion des utilisateurs

Ce deuxième diagramme détaille le module de gestion des utilisateurs et de l'authentification.

On y voit le processus d'**inscription**, notamment pour les candidats externes, ainsi que la **connexion** via identifiants classiques ou via Google, grâce à l'authentification OAuth2. Une fois connecté, chaque utilisateur peut consulter et modifier ses informations personnelles.

L'administrateur, quant à lui, dispose de droits supplémentaires : il peut lister l'ensemble des utilisateurs, en créer de nouveaux, et gérer les rôles et permissions selon le modèle **RBAC**, le contrôle d'accès basé sur les rôles.

---

## Slide 9 — Cas d'utilisation : Gestion du personnel

Ce diagramme illustre le module de gestion du personnel, qui constitue le cœur du système.

Le **responsable RH** peut consulter l'annuaire complet des employés, avec recherche et filtres avancés, accéder aux profils détaillés incluant contrats et salaires, et ajouter de nouveaux employés. Il gère également les demandes de congés — validation ou refus — ainsi que le suivi des tâches et des présences.

De son côté, **l'employé** peut consulter son propre profil, poser ses demandes de congés et suivre l'état de ses tâches, mais n'a pas accès aux informations des autres employés, conformément à la matrice de permissions RBAC.

---

## Slide 10 — Cas d'utilisation : Module IA

Ce diagramme représente le module d'intelligence artificielle, qui constitue l'un des apports majeurs de ce projet.

Le responsable RH peut déclencher une **prédiction de churn** pour un employé donné : le système renvoie un score de risque de départ, ainsi que la raison principale identifiée, comme par exemple un salaire jugé bas. Il peut également interagir avec **l'assistant conversationnel**, qui répond aux questions RH en s'appuyant sur les données de l'entreprise.

Ces fonctionnalités sont réservées au RH et à l'administrateur ; l'employé n'y a pas accès.

---

## Slide 11 — Cas d'utilisation : Module Recrutement

Ce dernier diagramme de cas d'utilisation concerne le module de recrutement.

Le **responsable RH** publie des offres d'emploi, consulte les candidatures reçues et déclenche l'**analyse automatique des CVs** par l'agent IA, qui extrait les compétences et calcule un score de matching entre le profil du candidat et le poste.

Côté **candidat**, l'acteur externe consulte les offres publiées, postule en ligne et téléverse son CV au format PDF, puis peut suivre l'état de sa candidature.

---

## Slide 12 — Diagramme de classes

Après les cas d'utilisation, voici le diagramme de classes, qui représente la structure interne du système et les relations entre les entités.

Au centre, on retrouve la classe **Utilisateur**, dont héritent les quatre rôles : Admin, RH, Employé et Candidat. Autour de cette classe centrale s'articulent les entités métier : Employé, Département, Poste, Congé, Tâche, Présence, Paiement, Document — ainsi que les entités liées au recrutement, comme Offre d'emploi et Candidature, et celles liées à l'intelligence artificielle, comme le journal des prédictions.

Ce diagramme permet de comprendre comment les données sont organisées et reliées entre elles dans la base PostgreSQL.

---

## Slide 13 — Architecture

Passons maintenant à l'architecture technique du projet. J'ai opté pour une **architecture micro-services découplée** : d'un côté un frontend React qui constitue l'interface utilisateur unifiée, de l'autre un backend Django qui joue le rôle d'API Gateway, avec authentification JWT et routage des requêtes vers les différents modules — le cœur RH, l'agent de recrutement, l'agent vocal et l'assistant IA.

Cette approche modulaire présente plusieurs avantages : chaque module fonctionne de manière indépendante, ce qui facilite le déploiement incrémental, le débogage et la maintenance, tout en s'appuyant sur une base solide et éprouvée, celle du framework Django.

---

## Slide 14 — Outils et technologies utilisées

Voici à présent les principales technologies utilisées pour la réalisation de ce projet.

Côté **frontend** : React 18 avec Vite comme outil de build, Tailwind CSS pour le style, Axios pour les appels API, et Recharts pour la data visualisation.

Côté **backend** : Python avec Django 5 et Django REST Framework pour exposer l'API.

Pour la **base de données** : PostgreSQL, aussi bien en local qu'en production.

Pour l'**intelligence artificielle** : Scikit-Learn, Pandas et Numpy pour le module de prédiction de churn, ainsi que l'API Google Gemini pour l'assistant conversationnel.

Et enfin, pour le **déploiement** : Docker, Docker Compose et GitHub Actions pour automatiser l'intégration et la livraison continues.

---

## Slide 15 — Réalisations

J'en arrive maintenant aux réalisations. Je vais vous présenter une courte démonstration de la plateforme Smart-HR en fonctionnement, illustrant les principaux parcours utilisateurs : la connexion selon les quatre rôles, le tableau de bord RH avec ses indicateurs et sa jauge de risque de churn, la gestion des congés et des tâches, ainsi que le module de recrutement avec l'analyse automatique des CVs.

*(Lancer la vidéo de démonstration)*

> ⚠️ **À vérifier avant la soutenance** : cette slide contient une capture d'écran (`image27.png`) qui montre une page GitHub (Pull Request #3142), sans rapport avec Smart-HR — probablement une capture accidentelle prise pendant l'enregistrement de la vidéo. À retirer de la slide.

---

## Slide 16 — Bilan

Je peux donc dresser un bilan de ce projet. Les cinq objectifs fixés en introduction ont été atteints.

Le **socle RH centralisé** est opérationnel, avec la gestion des employés, congés, présences et paies. L'**agent prédictif de churn**, basé sur le Machine Learning, est fonctionnel et intégré au tableau de bord. Le **module de recrutement intelligent**, s'appuyant sur le traitement du langage naturel, permet d'analyser les CVs et de calculer un score de matching. Le **chatbot RH** répond aux questions des utilisateurs de manière contextuelle. Et enfin, la solution a été effectivement **déployée**, avec une chaîne CI/CD fonctionnelle.

---

## Slide 17 — Conclusion et perspectives

En conclusion, ce projet a permis de concevoir et de déployer une solution numérique moderne pour la gestion des ressources humaines des PME. Il contribuera, je l'espère, à transformer la fonction RH d'un rôle purement administratif à un rôle décisionnel et proactif, grâce à l'intelligence artificielle.

Bien entendu, ce travail ouvre également des perspectives d'évolution. Je pense notamment au développement d'une **application mobile**, pour donner un accès simplifié aux employés en mobilité ; au passage à une **architecture multi-tenant**, pour permettre à plusieurs entreprises d'utiliser la même instance de manière isolée et sécurisée ; et enfin à l'intégration d'un **module de paiement en ligne**, pour automatiser la gestion des abonnements dans une logique SaaS.

---

## Slide 18 — Remerciements

Je vous remercie pour votre aimable attention, et je reste à votre disposition pour répondre à vos questions.

---

## Notes techniques (pour toi, pas pour l'oral)

- Les **speaker notes déjà présentes dans le .pptx** (slides 7 à 12) sont des restes d'une **autre soutenance** (un système de rendez-vous médicaux : patient/médecin/secrétaire) et n'ont **aucun rapport** avec Smart-HR. Le script ci-dessus les remplace entièrement — pense à mettre à jour les notes dans PowerPoint/Keynote avant le jour J si tu veux les avoir sous les yeux.
- Slide 15 contient une vidéo (`media1.mov`, ~160 Mo) — c'est elle qui explique la taille du fichier (172 Mo). Vérifie qu'elle se lance bien en plein écran le jour J (police du poste de la salle, codec `.mov` supporté).
- Slide 14 affiche des logos de technologies (React, Django, PostgreSQL, Docker, etc.) — aucune action requise, juste les nommer au fil du script ci-dessus.
