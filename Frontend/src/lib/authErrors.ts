/**
 * Traduction des erreurs d'authentification en messages utilisateur.
 *
 * L'ancien code retombait sur « Email ou mot de passe incorrect » dès que la
 * réponse ne contenait pas de champ `detail`. Une panne serveur (502, page HTML
 * renvoyée par nginx) était donc annoncée comme un mauvais mot de passe, envoyant
 * l'utilisateur chercher un problème d'identifiants inexistant.
 */

const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_SERVER_ERROR = 500;

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: { detail?: string } | string;
  };
}

function extractServerDetail(error: ApiErrorShape): string | null {
  const data = error.response?.data;
  // nginx renvoie du HTML sur une erreur de passerelle : il n'y a pas de `detail`
  // exploitable, et surtout rien qui soit affichable à l'utilisateur.
  if (!data || typeof data === 'string') return null;
  return data.detail ?? null;
}

/**
 * @param invalidCredentialsMessage Message affiché quand le serveur rejette
 * effectivement l'authentification sans en préciser la raison.
 */
export function getAuthErrorMessage(
  error: unknown,
  invalidCredentialsMessage: string,
): string {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    // Pas de réponse du tout : DNS, réseau coupé, CORS, serveur injoignable.
    return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
  }

  const apiError = error as ApiErrorShape;
  const status = apiError.response?.status;
  const serverDetail = extractServerDetail(apiError);

  if (serverDetail) return serverDetail;

  if (status !== undefined && status >= HTTP_STATUS_SERVER_ERROR) {
    return `Le service est momentanément indisponible (erreur ${status}). Réessayez dans quelques instants.`;
  }

  if (status === HTTP_STATUS_TOO_MANY_REQUESTS) {
    return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
  }

  if (
    status === HTTP_STATUS_BAD_REQUEST ||
    status === HTTP_STATUS_UNAUTHORIZED ||
    status === HTTP_STATUS_FORBIDDEN
  ) {
    return invalidCredentialsMessage;
  }

  return 'Une erreur inattendue est survenue. Réessayez.';
}
