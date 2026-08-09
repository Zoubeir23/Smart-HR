import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

/**
 * Bouton « Continuer avec Google », aligné sur la largeur du formulaire.
 *
 * Le composant `GoogleLogin` délègue le rendu à la bibliothèque Google
 * Identity Services, qui dessine le bouton dans son propre conteneur et
 * n'accepte qu'une largeur **en pixels** — ni pourcentage, ni `100%`. Sans
 * valeur explicite, Google choisit une largeur fonction du texte : le bouton
 * ne s'alignait donc pas sur le bouton pleine largeur du formulaire juste
 * au-dessus, d'où l'impression de mise en page décalée.
 *
 * On mesure ici la largeur réelle du conteneur et on la transmet à Google,
 * en la recalculant si la fenêtre change de taille (responsive).
 */

/** Largeur maximale acceptée par Google Identity Services, en pixels. */
const GOOGLE_BUTTON_MAXIMUM_WIDTH = 400;

/**
 * Largeur utilisée quand le conteneur ne peut pas être mesuré : élément encore
 * masqué au montage, ou environnement de test (jsdom renvoie toujours 0). Sans
 * ce repli, le bouton ne serait jamais rendu du tout.
 */
const GOOGLE_BUTTON_FALLBACK_WIDTH = 320;

interface GoogleAuthButtonProps {
  /** Appelé avec l'ID token Google (le `credential`) après authentification. */
  onCredential: (credential: string) => void;
  /** Appelé avec un message prêt à afficher lorsque Google échoue. */
  onFailure: (message: string) => void;
  /** Libellé rendu par Google : connexion ou inscription. */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export function GoogleAuthButton({
  onCredential,
  onFailure,
  text = 'continue_with',
}: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measureContainerWidth = () => {
      const availableWidth = Math.floor(container.getBoundingClientRect().width);
      setButtonWidth(
        availableWidth > 0
          ? Math.min(availableWidth, GOOGLE_BUTTON_MAXIMUM_WIDTH)
          : GOOGLE_BUTTON_FALLBACK_WIDTH,
      );
    };

    measureContainerWidth();

    const resizeObserver = new ResizeObserver(measureContainerWidth);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex w-full justify-center">
      {/* Google ne rend le bouton qu'une fois la largeur connue : le monter
          avant la mesure produirait un bouton à la mauvaise taille, que la
          bibliothèque ne redimensionne pas après coup. */}
      {buttonWidth !== null && (
        <GoogleLogin
          width={buttonWidth}
          text={text}
          shape="rectangular"
          size="large"
          logo_alignment="left"
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              onCredential(credentialResponse.credential);
            } else {
              onFailure('Google n’a pas renvoyé de jeton d’identité. Réessayez.');
            }
          }}
          onError={() => onFailure('La connexion Google a été interrompue. Réessayez.')}
        />
      )}
    </div>
  );
}

export default GoogleAuthButton;
