import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';

export default function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Link to="/" className="absolute top-6 left-6">
        <Logo variant="full" size="md" />
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-12 w-12 text-destructive" />
        </div>
        
        <h1 className="mt-6 text-3xl font-bold">Accès non autorisé</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
        
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link to="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/dashboard" className="gap-2">
              <Home className="h-4 w-4" />
              Tableau de bord
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
