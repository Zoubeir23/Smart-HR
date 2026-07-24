import LegalPageLayout from '@/components/legal/LegalPageLayout';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Politique de confidentialité" lastUpdated="24 juillet 2026">
      <p>
        Smart-HR (« nous ») accorde une importance particulière à la protection des données
        personnelles des employés, responsables RH, administrateurs et candidats qui utilisent
        la plateforme. Cette politique décrit quelles données sont collectées, pourquoi, et
        comment elles sont protégées.
      </p>

      <h2>1. Données collectées</h2>
      <p>Selon votre rôle, nous traitons notamment :</p>
      <ul>
        <li>Identité et coordonnées (nom, prénom, email, téléphone, CIN)</li>
        <li>Données contractuelles et salariales (contrat, poste, service, historique de paie)</li>
        <li>Données de congés, présences et évaluations de performance</li>
        <li>Pour les candidats : CV, lettre de motivation, compétences extraites par l'IA</li>
        <li>Données techniques de connexion (journaux d'authentification, adresse IP)</li>
      </ul>

      <h2>2. Finalités du traitement</h2>
      <p>Les données sont utilisées pour :</p>
      <ul>
        <li>Assurer la gestion administrative du personnel (congés, paie, présence)</li>
        <li>Permettre l'analyse prédictive de risque de départ (churn) à des fins d'aide à la décision RH</li>
        <li>Effectuer l'analyse et le matching automatique des candidatures via l'intelligence artificielle</li>
        <li>Sécuriser l'accès à la plateforme (authentification, journaux d'audit)</li>
      </ul>

      <h2>3. Base légale</h2>
      <p>
        Le traitement repose sur l'exécution du contrat de travail, l'intérêt légitime de
        l'employeur en matière de gestion RH, et le consentement explicite du candidat pour
        l'analyse de son CV par l'IA.
      </p>

      <h2>4. Durée de conservation</h2>
      <p>
        Les données des employés sont conservées pendant la durée du contrat de travail et les
        délais légaux applicables après son terme. Les candidatures non retenues sont conservées
        au maximum 2 ans, sauf demande de suppression anticipée du candidat.
      </p>

      <h2>5. Vos droits</h2>
      <p>
        Conformément au RGPD et à la loi sénégalaise sur la protection des données personnelles,
        vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos
        données. Pour exercer ces droits, contactez le service RH ou l'administrateur de votre
        organisation.
      </p>

      <h2>6. Sécurité</h2>
      <p>
        L'accès aux données est protégé par authentification (JWT, OAuth2) et contrôle d'accès
        par rôle (RBAC). Les fichiers sensibles (CV, documents contractuels) sont stockés de
        manière sécurisée et accessibles uniquement aux utilisateurs autorisés.
      </p>
    </LegalPageLayout>
  );
}
