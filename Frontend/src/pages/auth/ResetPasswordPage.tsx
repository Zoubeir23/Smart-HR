import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/common/Logo';
import { authService } from '@/services/authService';

export default function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
      });
      return;
    }

    if (!uid || !token) {
      toast({
        variant: 'destructive',
        title: 'Lien invalide',
        description: 'Ce lien de réinitialisation est invalide ou expiré.',
      });
      return;
    }

    setIsLoading(true);

    try {
      await authService.confirmPasswordReset(uid, token, newPassword, confirmPassword);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Lien expiré ou invalide. Faites une nouvelle demande de réinitialisation.',
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
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  Mot de passe modifié
                </h2>
                <p className="text-sm text-muted-foreground">
                  Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé
                  vers la page de connexion…
                </p>
              </div>
              <Link
                to="/login"
                className="mt-2 text-sm font-semibold text-primary hover:underline"
              >
                Se connecter maintenant
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-7 space-y-1.5">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Nouveau mot de passe
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choisissez un nouveau mot de passe sécurisé pour votre compte.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="new-password"
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
                  >
                    Nouveau mot de passe
                  </Label>
                  <div className="relative group/field">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within/field:text-primary" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 text-sm border-border/60 transition-all focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus:ring-0"
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-foreground focus:outline-none"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-password"
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70"
                  >
                    Confirmer le mot de passe
                  </Label>
                  <div className="relative group/field">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within/field:text-primary" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 text-sm border-border/60 transition-all focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus:ring-0"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-foreground focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full font-semibold"
                >
                  {isLoading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                </Button>
              </form>

              <div className="mt-6 flex justify-center">
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Demander un nouveau lien
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
