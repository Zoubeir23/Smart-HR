import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/common/Logo';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      await authService.requestPasswordReset(email);
      setIsEmailSent(true);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'envoyer l'email. Vérifiez l'adresse saisie.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-[420px]"
      >
        <div className="mb-8 flex justify-center">
          <Logo variant="full" size="md" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-[0_12px_40px_rgba(80,20,10,0.08),0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          {isEmailSent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  Email envoyé
                </h2>
                <p className="text-sm text-muted-foreground">
                  Si un compte existe pour{' '}
                  <span className="font-semibold text-foreground">{email}</span>,
                  vous recevrez un lien de réinitialisation dans quelques minutes.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Pensez à vérifier votre dossier spam.
              </p>
              <Link
                to="/login"
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-7 space-y-1.5">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Mot de passe oublié
                </h2>
                <p className="text-sm text-muted-foreground">
                  Saisissez votre adresse email pour recevoir un lien de réinitialisation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
                  >
                    Adresse email
                  </Label>
                  <div className="relative group/field">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within/field:text-primary" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10 text-sm border-border/60 transition-all focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus:ring-0"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full font-semibold"
                >
                  {isLoading ? 'Envoi en cours…' : 'Envoyer le lien'}
                </Button>
              </form>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
