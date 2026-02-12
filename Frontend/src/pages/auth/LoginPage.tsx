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
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/common/Logo';

/* ─── Isometric grid node for the branding panel ─── */
function GridNode({
  x,
  y,
  delay,
  size = 'md',
}: {
  x: string;
  y: string;
  delay: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-3 w-3' : 'h-2 w-2';
  return (
    <motion.div
      className={`absolute rounded-full bg-white/20 ${dim}`}
      style={{ left: x, top: y }}
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
  const [hoveredDemo, setHoveredDemo] = useState<string | null>(null);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur Smart-HR !',
      });
      navigate(from, { replace: true });
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
      await loginWithGoogle(token);
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur Smart-HR !',
      });
      navigate(from, { replace: true });
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

  const demoAccounts = [
    { email: 'admin@smarthr.com', password: 'admin123', role: 'Admin', color: 'bg-indigo-500' },
    { email: 'rh@smarthr.com', password: 'rh123', role: 'RH', color: 'bg-blue-500' },
    { email: 'employee@smarthr.com', password: 'employee123', role: 'Employé', color: 'bg-emerald-500' },
    { email: 'candidate@smarthr.com', password: 'candidate123', role: 'Candidat', color: 'bg-amber-500' },
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
          LEFT PANEL — Deep indigo branding canvas
          ───────────────────────────────────────────── */}
      <div className="relative hidden w-[55%] overflow-hidden lg:block">
        {/* Base gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, hsl(226 70% 18%) 0%, hsl(226 70% 30%) 40%, hsl(234 62% 38%) 100%)',
          }}
        />

        {/* Geometric grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Diagonal accent line */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 80px, rgba(255,255,255,0.4) 80px, rgba(255,255,255,0.4) 81px)',
          }}
        />

        {/* Animated floating nodes */}
        <GridNode x="15%" y="20%" delay={0} size="lg" />
        <GridNode x="75%" y="15%" delay={0.8} />
        <GridNode x="25%" y="55%" delay={1.5} size="sm" />
        <GridNode x="60%" y="45%" delay={0.4} size="lg" />
        <GridNode x="85%" y="65%" delay={2.0} />
        <GridNode x="40%" y="80%" delay={1.2} size="sm" />
        <GridNode x="10%" y="75%" delay={0.6} />
        <GridNode x="50%" y="25%" delay={1.8} size="sm" />
        <GridNode x="70%" y="78%" delay={2.4} />
        <GridNode x="30%" y="35%" delay={0.2} />

        {/* Radial glow spots */}
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/[0.06] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-300/[0.05] blur-[80px]" />

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
              <span className="text-xl font-bold tracking-tight text-white">
                Smart<span className="text-blue-300">-HR</span>
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

              <h1 className="text-[2.75rem] font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
                La GRH augmentée
                <br />
                par l'
                <span className="bg-gradient-to-r from-blue-300 to-indigo-200 bg-clip-text text-transparent">
                  Intelligence
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-300 to-indigo-200 bg-clip-text text-transparent">
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
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 0.5px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Floating card */}
        <motion.div
          initial={{ opacity: 0, y: 32, rotateX: 4 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative z-10 w-full max-w-[420px]"
          style={{ perspective: '1200px' }}
        >
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden">
            <Logo variant="full" size="md" />
          </div>

          {/* Form card surface */}
          <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
            {/* Header */}
            <div className="mb-7 space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
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
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Adresse email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10 text-sm transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Mot de passe
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 text-sm transition-shadow focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="h-11 w-full gap-2 bg-[hsl(var(--primary))] text-sm font-semibold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
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
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    ou continuer avec
                  </span>
                </div>
              </div>
            </div>

            {googleClientId ? (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                      handleGoogleSuccess(credentialResponse.credential);
                    } else {
                      toast({
                        title: 'Connexion Google échouée',
                        description: 'ID token manquant.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  onError={() =>
                    toast({
                      title: 'Connexion Google échouée',
                      description: 'Une erreur est survenue.',
                      variant: 'destructive',
                    })
                  }
                />
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground/60">
                SSO Google indisponible (VITE_GOOGLE_CLIENT_ID non configuré)
              </p>
            )}
          </div>

          {/* Demo accounts — compact strip below card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm"
          >
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Accès démo
            </p>
            <div className="grid grid-cols-4 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  onMouseEnter={() => setHoveredDemo(account.email)}
                  onMouseLeave={() => setHoveredDemo(null)}
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
                  {hoveredDemo === account.email && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background shadow-lg"
                    >
                      {account.email}
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>

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
              className="inline-flex items-center gap-0.5 font-semibold text-primary transition-colors hover:text-primary/80"
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
