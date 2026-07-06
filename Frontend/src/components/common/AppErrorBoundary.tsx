import * as Sentry from '@sentry/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-8 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-lg font-semibold text-foreground">Une erreur est survenue</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Quelque chose s'est mal passé. Vous pouvez réessayer ou recharger la page.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={resetError}>
          Réessayer
        </Button>
        <Button onClick={() => window.location.reload()}>Recharger la page</Button>
      </div>
    </div>
  );
}

/**
 * Filet de sécurité applicatif : sans lui, toute erreur de rendu React
 * (donnée inattendue, chunk lazy introuvable après un redéploiement)
 * fait disparaître l'app entière derrière un écran blanc.
 */
export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
