import { useGoogleLogin } from '@react-oauth/google';

/**
 * Bouton « Continuer avec Google ».
 *
 * Rendu par l'application, et non par Google Identity Services. Le bouton GSI
 * imposait deux limites gênantes :
 *   - dès qu'une session Google était ouverte, il affichait un bouton
 *     « personnalisé » verrouillé sur ce compte, sans moyen d'en proposer un
 *     autre autrement qu'en ouvrant un menu discret ;
 *   - dessiné dans une iframe Google, il n'acceptait qu'une largeur en pixels
 *     et ignorait le design du reste du formulaire.
 *
 * On utilise donc le flux « code d'autorisation » avec `prompt: 'select_account'`,
 * qui demande systématiquement quel compte utiliser. Le code obtenu est échangé
 * côté serveur (avec le client_secret), ce qui garantit que l'identité provient
 * bien de notre application — un simple access_token transmis par le navigateur
 * n'offrirait pas cette garantie.
 */

interface GoogleAuthButtonProps {
  /** Appelé avec le code d'autorisation Google, à transmettre au backend. */
  onAuthorizationCode: (code: string) => void;
  /** Appelé avec un message prêt à afficher lorsque Google échoue. */
  onFailure: (message: string) => void;
  /** Libellé du bouton (connexion ou inscription). */
  label?: string;
  /** Désactive le bouton pendant qu'une authentification est en cours. */
  isBusy?: boolean;
}

function GoogleLogoIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  onAuthorizationCode,
  onFailure,
  label = 'Continuer avec Google',
  isBusy = false,
}: GoogleAuthButtonProps) {
  const startGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    // Force Google à demander quel compte utiliser, même si une seule session
    // est ouverte : c'est ce qui manquait au bouton d'origine.
    prompt: 'select_account',
    onSuccess: ({ code }) => {
      if (code) {
        onAuthorizationCode(code);
      } else {
        onFailure('Google n’a pas renvoyé de code d’autorisation. Réessayez.');
      }
    },
    onError: () => onFailure('La connexion Google a échoué. Réessayez.'),
    // Déclenché quand l'utilisateur ferme la popup : ce n'est pas une erreur,
    // inutile d'afficher une alerte rouge pour un abandon volontaire.
    onNonOAuthError: () => undefined,
  });

  return (
    <button
      type="button"
      onClick={() => startGoogleLogin()}
      disabled={isBusy}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border/70 bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isBusy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <GoogleLogoIcon />
      )}
      {isBusy ? 'Connexion en cours…' : label}
    </button>
  );
}

export default GoogleAuthButton;
