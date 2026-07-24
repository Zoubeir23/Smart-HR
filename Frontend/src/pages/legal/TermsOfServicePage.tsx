import LegalPageLayout from '@/components/legal/LegalPageLayout';

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation" lastUpdated="24 juillet 2026">
      <p>
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation
        de la plateforme Smart-HR par tout utilisateur : administrateur, responsable RH, employé
        ou candidat.
      </p>

      <h2>1. Objet du service</h2>
      <p>
        Smart-HR est un SIRH (Système d'Information Ressources Humaines) intelligent permettant la
        gestion du personnel, des congés, des tâches, des présences, de la paie, des documents,
        du recrutement, ainsi que des fonctionnalités d'intelligence artificielle (prédiction de
        churn, assistant conversationnel, analyse de CV).
      </p>

      <h2>2. Accès au service</h2>
      <p>
        L'accès nécessite un compte valide. Chaque utilisateur est responsable de la
        confidentialité de ses identifiants et de toute activité effectuée depuis son compte.
        Les droits d'accès sont attribués selon un rôle (Admin, RH, Employé, Candidat) et
        limitent les actions disponibles.
      </p>

      <h2>3. Obligations de l'utilisateur</h2>
      <ul>
        <li>Fournir des informations exactes lors de l'inscription ou de la candidature</li>
        <li>Ne pas tenter de contourner les mécanismes de sécurité ou de contrôle d'accès</li>
        <li>Ne pas utiliser la plateforme à des fins illicites ou frauduleuses</li>
        <li>Respecter la confidentialité des informations RH auxquelles l'utilisateur a accès</li>
      </ul>

      <h2>4. Fonctionnalités d'intelligence artificielle</h2>
      <p>
        Certaines fonctionnalités (prédiction de risque de départ, analyse de CV, assistant
        conversationnel) reposent sur des modèles d'intelligence artificielle. Ces résultats sont
        fournis à titre d'aide à la décision et ne remplacent pas le jugement humain du service RH.
      </p>

      <h2>5. Disponibilité et responsabilité</h2>
      <p>
        Smart-HR met en œuvre des moyens raisonnables pour assurer la disponibilité et la
        sécurité du service, sans garantie d'absence totale d'interruption. La responsabilité de
        Smart-HR ne saurait être engagée en cas de dommage résultant d'une utilisation non
        conforme aux présentes CGU.
      </p>

      <h2>6. Modification des CGU</h2>
      <p>
        Ces CGU peuvent être mises à jour périodiquement. La date de dernière mise à jour est
        indiquée en haut de cette page. La poursuite de l'utilisation du service après
        modification vaut acceptation des nouvelles conditions.
      </p>
    </LegalPageLayout>
  );
}
