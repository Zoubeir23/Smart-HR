# Feature 244 — Messagerie interne entre acteurs

## Objectif

Permettre aux quatre acteurs (Admin, RH, Employé, Candidat) d'échanger des messages
directs. Cas d'usage principal : l'Admin ou le RH informe un candidat que sa
candidature est retenue, ou échange avec un employé/RH.

L'app `communication` existante est un canal **descendant** (notes de service,
circulaires diffusées à une audience). Elle ne couvre pas la conversation
bidirectionnelle nom à nom. On crée donc une app dédiée `messaging`.

## Logique métier

### Matrice « qui peut écrire à qui » (initiation d'une conversation)

| Initiateur ↓ / Destinataire → | Admin | RH | Employé | Candidat |
| --- | --- | --- | --- | --- |
| **Admin**    | ✅ | ✅ | ✅ | ✅ |
| **RH**       | ✅ | ✅ | ✅ | ✅ |
| **Employé**  | ✅ | ✅ | ✅ | ❌ |
| **Candidat** | ✅ | ✅ | ❌ | ❌ |

Règles complémentaires :
- Un utilisateur ne peut pas s'écrire à lui-même.
- Les comptes désactivés (`is_active=False`) ne sont jamais contactables.
- Le candidat est cloisonné : il ne voit jamais l'annuaire des employés, seulement
  les interlocuteurs RH/Admin. Cohérent avec la matrice RBAC du cahier des charges.
- Une fois la conversation créée, **tout participant peut répondre**, y compris un
  candidat dans une conversation ouverte par le RH.
- Une conversation directe est **unique** par paire d'utilisateurs : réouvrir une
  discussion réutilise la conversation existante (pas de doublon).

### Notifications
Chaque message crée une `core.Notification` (type `message_received`) pour les
destinataires, avec `target_url` pointant sur la conversation. La cloche existante
l'affiche sans modification.

### Temps réel
`channels`/WebSocket n'est pas installé sur le projet. On reste en **polling**
React Query (5 s sur la conversation ouverte, 20 s sur la liste/badge). Simple,
sans nouvelle dépendance d'infra, suffisant pour l'usage RH.

## Découpage

### Backend — `smart_hr/messaging/`
- [x] `apps.py`, `__init__.py`, `migrations/__init__.py`
- [x] `models.py` : `Conversation`, `ConversationParticipant`, `Message`
- [x] `contact_rules.py` : matrice des rôles + `allowed_contacts_queryset`
- [x] `services.py` : `get_or_create_direct_conversation`, `post_message`
- [x] `serializers.py`
- [x] `views/contact.py`, `views/conversation.py`
- [x] `urls.py` + branchement dans `config/urls.py`
- [x] `admin.py`
- [x] migration initiale
- [x] `core.Notification` : ajout du choix `message_received` + migration
- [x] throttle `messaging_send` dans `REST_FRAMEWORK`
- [x] tests : règles de contact, unicité conversation, permissions, non-lus

### Frontend — `Frontend/src/`
- [x] `services/messagingService.ts`
- [x] `pages/messaging/MessagingPage.tsx` (liste conversations + fil + composeur)
- [x] `components/messaging/` (ConversationList, MessageThread, NewConversationDialog)
- [x] route `/messages` dans `App.tsx` (4 rôles)
- [x] entrée sidebar + badge non-lus
- [x] tests service + composants

## Vérification
- [x] `pytest smart_hr/messaging`
- [x] `npm test` (Frontend)
- [x] `pre-commit run --all-files` avant push
