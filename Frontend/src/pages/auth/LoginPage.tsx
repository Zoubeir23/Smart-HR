import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  BrainCircuit,
  FileSearch,
  BarChart3,
  Mic,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/common/Logo';
import { getSafePostLoginPath } from '@/lib/authNavigation';

/* ─── Isometric grid node for the branding panel ─── */
function GridNode({
  positionClass,
  delay,
  size = 'md',
}: {
  positionClass: string;
  delay: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-3 w-3' : 'h-2 w-2';
  return (
    <motion.div
      className={`absolute rounded-full bg-white/20 ${dim} ${positionClass}`}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 0.6, 0.3], scale: [0, 1.2, 1] }}
      transition={{ duration: 2, delay, repeat: Infinity, repeatDelay: 4 + delay }}
    />
  );
}

/* ─── Feature pill with icon ─── */
function FeaturePill({
  icon: Icon,
  label,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 backdrop-blur-sm"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
        <Icon className="h-4 w-4 text-white/90" />
      </div>
      <span className="text-sm font-medium text-white/80">{label}</span>
    </motion.div>
  );
}

/* ─── Stat counter for branding panel ─── */
function StatBadge({
  value,
  label,
  delay,
}: {
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="text-center"
    >
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOGIN PAGE — Editorial Corporate
   Swiss precision · geometric branding · floating form
   ═══════════════════════════════════════════════════════ */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  // La destination initiale arrive soit par le state de React Router (garde de
  // route), soit par ?next= lorsque l'intercepteur axios a dû forcer un
  // rechargement complet après l'expiration de la session.
  const redirectQueryParameter = new URLSearchParams(location.search).get('next') ?? undefined;
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? redirectQueryParameter;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const authenticatedUser = await login(email, password);
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur Smart-HR !',
      });
      navigate(getSafePostLoginPath(authenticatedUser.role, from), { replace: true });
    } catch (error) {
      toast({
        title: 'Erreur de connexion',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    setIsLoading(true);
    try {
      const authenticatedUser = await loginWithGoogle(token);
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur Smart-HR !',
      });
      navigate(getSafePostLoginPath(authenticatedUser.role, from), { replace: true });
    } catch (error) {
      toast({
        title: 'Connexion Google échouée',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Raccourcis de connexion affichés en permanence : ce déploiement sert de
  // support de soutenance académique, pas une mise en production publique —
  // le jury doit pouvoir tester les 4 rôles sans avoir les identifiants sous
  // la main. Ne pas réintroduire ce comportement sur un déploiement réel.
  const demoAccounts = [
    { email: 'admin@smarthr.com', password: 'SmartHR2026!', role: 'Admin', color: 'bg-[#c41e1e]' },
    { email: 'rh@smarthr.com', password: 'SmartHR2026!', role: 'RH', color: 'bg-[#D62828]' },
    { email: 'employee@smarthr.com', password: 'SmartHR2026!', role: 'Employé', color: 'bg-[hsl(160,84%,28%)]' },
    { email: 'candidate@smarthr.com', password: 'SmartHR2026!', role: 'Candidat', color: 'bg-[hsl(25,95%,45%)]' },
  ];

  const features = [
    { icon: BrainCircuit, label: 'Prédiction du turnover (ML)' },
    { icon: FileSearch, label: 'Analyse automatique des CVs' },
    { icon: BarChart3, label: 'Tableaux de bord analytiques' },
    { icon: Mic, label: 'Assistant vocal intelligent' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─────────────────────────────────────────────
          LEFT PANEL — DS: gradient rouge profond
          ───────────────────────────────────────────── */}
      <div className="relative hidden w-[55%] overflow-hidden lg:block">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[image:linear-gradient(160deg,#2d0505_0%,#5c0f0f_35%,#a01818_70%,#c41e1e_100%)]" />

        {/* Animated mesh gradient orbs */}
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] bg-orange-400/12"
        />
        <motion.div
          animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full blur-[100px] bg-brand-red/20"
        />
        <motion.div
          animate={{ x: [0, 25, -35, 0], y: [0, -15, 35, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute left-2/3 top-2/3 h-[280px] w-[280px] rounded-full blur-[80px] bg-amber-300/[0.08]"
        />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.035] bg-[image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:56px_56px]" />

        {/* Diagonal lines */}
        <div className="absolute inset-0 opacity-[0.025] bg-[image:repeating-linear-gradient(45deg,transparent,transparent_70px,rgba(255,255,255,0.5)_70px,rgba(255,255,255,0.5)_71px)]" />

        {/* Animated floating nodes */}
        <GridNode positionClass="left-[15%] top-[20%]" delay={0} size="lg" />
        <GridNode positionClass="left-[75%] top-[15%]" delay={0.8} />
        <GridNode positionClass="left-[25%] top-[55%]" delay={1.5} size="sm" />
        <GridNode positionClass="left-[60%] top-[45%]" delay={0.4} size="lg" />
        <GridNode positionClass="left-[85%] top-[65%]" delay={2.0} />
        <GridNode positionClass="left-[40%] top-[80%]" delay={1.2} size="sm" />
        <GridNode positionClass="left-[10%] top-[75%]" delay={0.6} />
        <GridNode positionClass="left-[50%] top-[25%]" delay={1.8} size="sm" />
        <GridNode positionClass="left-[70%] top-[78%]" delay={2.4} />
        <GridNode positionClass="left-[30%] top-[35%]" delay={0.2} />

        {/* Content layer */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          {/* Top — Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Logo variant="icon" size="sm" className="[&_svg]:text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Smart<span className="text-[#fecaca]">-HR</span>
              </span>
            </div>
          </motion.div>

          {/* Center — Hero */}
          <div className="max-w-lg space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/60 backdrop-blur-sm">
                <Shield className="h-3 w-3" />
                Plateforme SIRH Intelligent
              </div>

              <h1 className="text-[2.75rem] font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl">
                La GRH augmentée
                <br />
                par l'
                <span className="bg-gradient-to-r from-[#FFF3E0] to-[#fecaca] bg-clip-text text-transparent">
                  Intelligence
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#FFF3E0] to-[#fecaca] bg-clip-text text-transparent">
                  Artificielle
                </span>
              </h1>

              <p className="max-w-sm text-[15px] leading-relaxed text-white/50">
                Anticipez les départs, automatisez le recrutement
                et prenez des décisions éclairées grâce au Machine Learning.
              </p>
            </motion.div>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-2.5">
              {features.map((f, i) => (
                <FeaturePill key={f.label} icon={f.icon} label={f.label} delay={0.4 + i * 0.1} />
              ))}
            </div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex items-center gap-8 border-t border-white/10 pt-6"
            >
              <StatBadge value="80%" label="Précision churn" delay={1.0} />
              <div className="h-8 w-px bg-white/10" />
              <StatBadge value="-40%" label="Temps admin RH" delay={1.1} />
              <div className="h-8 w-px bg-white/10" />
              <StatBadge value="<200ms" label="Temps réponse" delay={1.2} />
            </motion.div>
          </div>

          {/* Bottom — Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="flex items-center justify-between text-xs text-white/30"
          >
            <span>&copy; 2026 Smart-HR &mdash; Tous droits réservés</span>
            <span>SaaS B2B &middot; SIRH &middot; IA</span>
          </motion.div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          RIGHT PANEL — Login form with floating card
          ───────────────────────────────────────────── */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 lg:w-[45%] lg:px-12 xl:px-20">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] bg-[image:radial-gradient(circle_at_1px_1px,hsl(var(--foreground))_0.5px,transparent_0)] bg-[size:24px_24px]" />

        {/* Floating card */}
        <motion.div
          initial={{ opacity: 0, y: 32, rotateX: 4 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 w-full max-w-[420px] [perspective:1200px]"
        >
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden">
            <Logo variant="full" size="md" />
          </div>

          {/* Form card surface */}
          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-[0_12px_40px_rgba(80,20,10,0.08),0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
            {/* Header */}
            <div className="mb-7 space-y-1.5">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                Connexion
              </h2>
              <p className="text-sm text-muted-foreground">
                Accédez à votre espace de gestion RH
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
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
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Mot de passe
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-primary hover:underline transition-colors"
                    >
                      Oublié ?
                    </Link>
                  </div>
                  <div className="relative group/field">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within/field:text-primary" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 text-sm border-border/60 transition-all focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus:ring-0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="h-11 w-full gap-2 text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider — Google SSO */}
            <div className="my-5">
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border/50" />
                <span className="mx-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  ou continuer avec
                </span>
                <div className="flex-1 border-t border-border/50" />
              </div>
            </div>

            {googleClientId && (
              <GoogleAuthButton
                text="signin_with"
                onCredential={handleGoogleSuccess}
                onFailure={(description) =>
                  toast({ title: 'Connexion Google échouée', description, variant: 'destructive' })
                }
              />
            )}
          </div>

          {/* Demo accounts — compact strip below card (développement uniquement) */}
          {demoAccounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm"
          >
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Accès démo
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  title={account.email}
                  className="group relative flex flex-col items-center gap-1.5 rounded-lg border border-transparent px-2 py-2.5 transition-all hover:border-border hover:bg-muted/50"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white transition-transform group-hover:scale-110 ${account.color}`}
                  >
                    {account.role[0]}
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
          )}

          {/* Sign up link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            Pas encore de compte ?{' '}
            <Link
              to="/register"
              className="inline-flex items-center gap-0.5 font-semibold text-primary transition-colors hover:text-secondary/80"
            >
              Créer un compte
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
