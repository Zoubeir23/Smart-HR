const SITE_NAME = 'Smart-HR';
const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://smart-hr.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export interface PageSEOConfig {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

const d = (cfg: PageSEOConfig): PageSEOConfig => cfg;

export const SEO_PAGES: Record<string, PageSEOConfig> = {
  // ─── Public ────────────────────────────────────────────────────────────────
  '/': d({
    title: `${SITE_NAME} | SIRH Intelligent — IA pour les RH`,
    description:
      'Smart-HR, le SIRH nouvelle génération qui anticipe les démissions, automatise le recrutement et centralise la gestion RH. Essayez gratuitement.',
    ogTitle: 'Smart-HR — Votre SIRH Intelligent',
    ogDescription:
      'Prédiction du turnover par IA, matching CV automatique et gestion RH tout-en-un. Découvrez Smart-HR.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  }),

  '/login': d({
    title: `Connexion | ${SITE_NAME}`,
    description: 'Connectez-vous à votre espace Smart-HR pour gérer votre équipe, vos congés et vos recrutements.',
    noIndex: true,
  }),

  '/register': d({
    title: `Inscription | ${SITE_NAME}`,
    description: 'Créez votre compte Smart-HR et commencez à gérer vos ressources humaines intelligemment.',
    noIndex: true,
  }),

  '/verify-email': d({
    title: `Vérification de l'email | ${SITE_NAME}`,
    description: 'Vérifiez votre adresse email pour activer votre compte Smart-HR.',
    noIndex: true,
  }),

  '/unauthorized': d({
    title: `Accès refusé | ${SITE_NAME}`,
    description: "Vous n'avez pas les droits nécessaires pour accéder à cette page.",
    noIndex: true,
  }),

  // ─── Offres et candidatures (public) ───────────────────────────────────────
  '/jobs': d({
    title: `Offres d'emploi | ${SITE_NAME}`,
    description:
      "Consultez les offres d'emploi disponibles et postulez directement depuis votre espace candidat Smart-HR.",
    ogTitle: "Offres d'emploi — Smart-HR",
    ogDescription: "Trouvez votre prochain poste. Postulez en quelques clics via Smart-HR.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  }),

  '/apply': d({
    title: `Postuler | ${SITE_NAME}`,
    description: "Soumettez votre candidature et votre CV. Notre IA analyse votre profil et vous met en avant.",
    noIndex: false,
  }),

  '/application-tracking': d({
    title: `Suivi de candidature | ${SITE_NAME}`,
    description: 'Suivez en temps réel le statut de vos candidatures déposées sur Smart-HR.',
    noIndex: true,
  }),

  // ─── Entretiens IA (public) ────────────────────────────────────────────────
  '/interview/:token': d({
    title: `Entretien IA | ${SITE_NAME}`,
    description: "Bienvenue dans votre entretien IA Smart-HR. Préparez-vous et démarrez quand vous êtes prêt.",
    ogTitle: 'Votre entretien IA — Smart-HR',
    ogDescription: "Un entretien intelligent, personnalisé et analysé par IA.",
    ogImage: DEFAULT_OG_IMAGE,
    noIndex: true,
  }),

  '/interview/:token/start': d({
    title: `Démarrer l'entretien | ${SITE_NAME}`,
    description: "Entretien IA en cours. Répondez aux questions pour maximiser vos chances.",
    noIndex: true,
  }),

  '/interview/:token/completed': d({
    title: `Entretien terminé | ${SITE_NAME}`,
    description: "Votre entretien IA est terminé. Merci pour votre participation — les résultats seront analysés.",
    noIndex: true,
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  '/dashboard': d({
    title: `Tableau de bord | ${SITE_NAME}`,
    description: "Vue d'ensemble de votre activité RH : KPIs, alertes et analyses en temps réel.",
    noIndex: true,
  }),

  // ─── Personnel ─────────────────────────────────────────────────────────────
  '/employees': d({
    title: `Gestion du personnel | ${SITE_NAME}`,
    description: "Annuaire complet de vos employés avec recherche avancée, filtres et accès aux profils détaillés.",
    noIndex: true,
  }),

  '/employees/create': d({
    title: `Ajouter un employé | ${SITE_NAME}`,
    description: "Créez un nouveau profil employé et configurez son accès à Smart-HR.",
    noIndex: true,
  }),

  '/departments': d({
    title: `Départements | ${SITE_NAME}`,
    description: "Gérez les départements et l'organigramme de votre entreprise.",
    noIndex: true,
  }),

  // ─── Congés ────────────────────────────────────────────────────────────────
  '/leaves': d({
    title: `Gestion des congés | ${SITE_NAME}`,
    description: "Suivez, validez et gérez les demandes de congés de vos équipes en toute simplicité.",
    noIndex: true,
  }),

  // ─── Tâches ────────────────────────────────────────────────────────────────
  '/tasks': d({
    title: `Tableau des tâches | ${SITE_NAME}`,
    description: "Visualisez et gérez les tâches de votre équipe sur un tableau Kanban interactif.",
    noIndex: true,
  }),

  // ─── Présences ─────────────────────────────────────────────────────────────
  '/attendance': d({
    title: `Gestion des présences | ${SITE_NAME}`,
    description: "Suivez quotidiennement la présence de vos employés et générez des rapports mensuels.",
    noIndex: true,
  }),

  // ─── Paie ──────────────────────────────────────────────────────────────────
  '/payroll': d({
    title: `Gestion de la paie | ${SITE_NAME}`,
    description: "Générez et gérez les fiches de paie de vos employés. Historique complet et export PDF.",
    noIndex: true,
  }),

  // ─── Documents ─────────────────────────────────────────────────────────────
  '/documents': d({
    title: `Documents RH | ${SITE_NAME}`,
    description: "Stockage sécurisé de vos documents RH : contrats, attestations et certificats.",
    noIndex: true,
  }),

  // ─── Formations ────────────────────────────────────────────────────────────
  '/training': d({
    title: `Formations & Réunions | ${SITE_NAME}`,
    description: "Planifiez vos formations, organisez des réunions et intégrez Zoom directement depuis Smart-HR.",
    noIndex: true,
  }),

  // ─── Calendrier ────────────────────────────────────────────────────────────
  '/calendar': d({
    title: `Calendrier | ${SITE_NAME}`,
    description: "Vue calendrier de vos événements RH : congés, formations, réunions et échéances.",
    noIndex: true,
  }),

  // ─── Recrutement ───────────────────────────────────────────────────────────
  '/applications': d({
    title: `Gestion des candidatures | ${SITE_NAME}`,
    description: "Gérez toutes les candidatures reçues, consultez les CVs et lancez les entretiens IA.",
    noIndex: true,
  }),

  // ─── Intelligence Artificielle ─────────────────────────────────────────────
  '/ai-insights': d({
    title: `Analyse du turnover (IA) | ${SITE_NAME}`,
    description: "Identifiez vos employés à risque de départ grâce au modèle prédictif Smart-HR basé sur Random Forest.",
    noIndex: true,
  }),

  '/ai-chat': d({
    title: `Assistant IA | ${SITE_NAME}`,
    description: "Posez vos questions RH à l'assistant IA Smart-HR — analyses, conseils et réponses contextuelles.",
    noIndex: true,
  }),

  '/recruteur-ia': d({
    title: `Recruteur IA | ${SITE_NAME}`,
    description: "Analysez les CVs automatiquement, calculez le matching et planifiez les entretiens via IA.",
    noIndex: true,
  }),

  '/voice-assistant': d({
    title: `Assistant vocal | ${SITE_NAME}`,
    description: "Accédez à la FAQ RH par commande vocale. Réponses instantanées pour candidats et employés.",
    noIndex: true,
  }),

  // ─── Administration ─────────────────────────────────────────────────────────
  '/admin/users': d({
    title: `Gestion des utilisateurs | ${SITE_NAME}`,
    description: "Activez, désactivez et gérez les rôles de tous les comptes utilisateurs Smart-HR.",
    noIndex: true,
  }),

  // ─── Paramètres ────────────────────────────────────────────────────────────
  '/profile': d({
    title: `Mon profil | ${SITE_NAME}`,
    description: "Consultez et modifiez vos informations personnelles et préférences Smart-HR.",
    noIndex: true,
  }),

  '/settings': d({
    title: `Paramètres | ${SITE_NAME}`,
    description: "Configurez votre compte, vos préférences de notification et l'apparence de Smart-HR.",
    noIndex: true,
  }),

  '/security': d({
    title: `Sécurité | ${SITE_NAME}`,
    description: "Gérez la sécurité de votre compte Smart-HR : mot de passe, sessions et journaux d'audit.",
    noIndex: true,
  }),

  // ─── Erreurs ───────────────────────────────────────────────────────────────
  '*': d({
    title: `Page introuvable | ${SITE_NAME}`,
    description: "Cette page n'existe pas ou a été déplacée. Retournez à l'accueil Smart-HR.",
    noIndex: true,
  }),
};

export const DEFAULT_SEO: PageSEOConfig = {
  title: `${SITE_NAME} | SIRH Intelligent`,
  description: "Smart-HR — SIRH intelligent avec IA pour la gestion des ressources humaines.",
  ogImage: DEFAULT_OG_IMAGE,
  ogType: 'website',
};

export function getSEOForPath(pathname: string): PageSEOConfig {
  if (SEO_PAGES[pathname]) return SEO_PAGES[pathname];

  // Routes dynamiques
  if (pathname.match(/^\/interview\/[^/]+$/)) return SEO_PAGES['/interview/:token'];
  if (pathname.match(/^\/interview\/[^/]+\/start$/)) return SEO_PAGES['/interview/:token/start'];
  if (pathname.match(/^\/interview\/[^/]+\/completed$/)) return SEO_PAGES['/interview/:token/completed'];
  if (pathname.match(/^\/employees\/\d+/)) {
    return {
      title: `Profil employé | ${SITE_NAME}`,
      description: "Consultez le profil complet de cet employé : contrat, paie, congés et historique.",
      noIndex: true,
    };
  }

  return DEFAULT_SEO;
}
