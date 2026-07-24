import LegalPageLayout from '@/components/legal/LegalPageLayout';

export default function GdprPage() {
  return (
    <LegalPageLayout title="RGPD — Protection des données" lastUpdated="24 juillet 2026">
      <p>
        Smart-HR traite des données à caractère personnel, dont certaines sont sensibles
        (données de paie, évaluations, et à terme des données biométriques dans le cadre du
        module de proctoring). Cette page détaille notre conformité au Règlement Général sur la
        Protection des Données (RGPD) et à la loi sénégalaise de protection des données
        personnelles (CDP).
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        L'organisation utilisatrice de Smart-HR (votre employeur) est responsable du traitement
        des données de ses employés et candidats. Smart-HR agit en tant que sous-traitant
        technique, fournissant l'infrastructure et les outils de traitement.
      </p>

      <h2>2. Principes appliqués</h2>
      <ul>
        <li>Minimisation : seules les données nécessaires à la finalité RH sont collectées</li>
        <li>Limitation de la conservation : suppression ou anonymisation après la durée légale</li>
        <li>Sécurité : chiffrement des mots de passe, contrôle d'accès par rôle (RBAC)</li>
        <li>Transparence : information claire sur les traitements automatisés (IA)</li>
      </ul>

      <h2>3. Consentement explicite</h2>
      <p>
        Pour toute analyse de CV par intelligence artificielle, le consentement explicite du
        candidat est requis avant tout traitement (case à cocher lors de la candidature). Aucune
        analyse automatisée n'est effectuée sans ce consentement.
      </p>

      <h2>4. Données biométriques (module de surveillance des tests techniques)</h2>
      <p>
        Lorsqu'un test technique avec vérification d'identité est proposé à un candidat, une
        photo de référence et des instantanés périodiques peuvent être capturés avec son
        consentement explicite. Ces données sont chiffrées, utilisées uniquement à des fins de
        vérification d'authenticité, et supprimées automatiquement 90 jours après la fin du
        processus de recrutement.
      </p>

      <h2>5. Exercice de vos droits</h2>
      <p>
        Vous pouvez demander l'accès, la rectification, l'effacement ou la portabilité de vos
        données personnelles en contactant le service RH ou l'administrateur système de votre
        organisation. Une réponse est apportée dans un délai raisonnable conformément à la
        réglementation applicable.
      </p>

      <h2>6. Transferts de données</h2>
      <p>
        Certains traitements (analyse IA, envoi d'emails, visioconférence) peuvent impliquer des
        prestataires tiers. Ces prestataires sont sélectionnés pour leurs garanties de sécurité
        et de conformité, et n'accèdent qu'aux données strictement nécessaires à leur service.
      </p>
    </LegalPageLayout>
  );
}
