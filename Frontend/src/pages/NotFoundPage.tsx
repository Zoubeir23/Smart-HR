import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Link to="/" className="absolute top-6 left-6">
        <Logo variant="full" size="md" />
      </Link>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="relative">
          <h1 className="text-[150px] font-bold leading-none text-gradient sm:text-[200px]">
            404
          </h1>
          <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-primary" />
        </div>

        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Page non trouvée</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
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
              Aller au tableau de bord
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
