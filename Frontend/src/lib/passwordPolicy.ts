/**
 * Règle de mot de passe unique, alignée sur le backend
 * (smart_hr.users.serializers.MINIMUM_PASSWORD_LENGTH).
 *
 * Les formulaires annonçaient 8 caractères alors que l'API en exigeait 12 :
 * l'utilisateur ne découvrait la vraie règle qu'après un aller-retour serveur.
 */
export const MINIMUM_PASSWORD_LENGTH = 12;

export const PASSWORD_POLICY_HINT = `Minimum ${MINIMUM_PASSWORD_LENGTH} caractères`;

export function getPasswordLengthError(password: string): string | null {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MINIMUM_PASSWORD_LENGTH} caractères.`;
  }
  return null;
}
