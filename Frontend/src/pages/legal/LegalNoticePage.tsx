import LegalPageLayout from '@/components/legal/LegalPageLayout';

export default function LegalNoticePage() {
  return (
    <LegalPageLayout title="Mentions légales" lastUpdated="24 juillet 2026">
      <h2>1. Éditeur de la plateforme</h2>
      <p>
        Smart-HR est une plateforme SaaS de gestion des ressources humaines. Pour toute question
        relative à l'édition ou à l'exploitation du service, contactez l'administrateur système
        de votre organisation.
      </p>

      <h2>2. Hébergement</h2>
      <p>
        L'application est hébergée sur une infrastructure cloud sécurisée. Les données sont
        stockées dans une base de données PostgreSQL et les fichiers (CV, documents, photos)
        dans un espace de stockage dédié.
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments de la plateforme Smart-HR (interface, logos, textes, code source)
        est protégé par le droit de la propriété intellectuelle. Toute reproduction non autorisée
        est interdite.
      </p>

      <h2>4. Cookies et traceurs</h2>
      <p>
        Smart-HR utilise uniquement des cookies techniques strictement nécessaires au
        fonctionnement du service (session, authentification, préférence de thème). Aucun cookie
        publicitaire ou de traçage tiers n'est utilisé.
      </p>

      <h2>5. Contact</h2>
      <p>
        Pour toute question juridique concernant l'utilisation de la plateforme, contactez le
        service RH ou l'administrateur système de votre organisation.
      </p>
    </LegalPageLayout>
  );
}
