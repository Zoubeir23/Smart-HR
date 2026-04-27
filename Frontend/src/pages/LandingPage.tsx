import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  TrendingDown,
  FileSearch,
  Bot,
  CheckSquare,
  Calendar,
  DollarSign,
  Users,
  FileText,
  ArrowRight,
  ChevronDown,
  Zap,
  Shield,
  BarChart3,
  Brain,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/* AnimatedCounter */
function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }: { target: number; suffix?: string; prefix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return <span ref={ref}>{prefix}{display.toLocaleString('fr-FR')}{suffix}</span>;
}

/* Ticker */
const TICKER_ITEMS = [
  '80% de précision churn', '−40% temps administratif', '1 500+ PME partenaires',
  'SLA 99,9% garanti', 'Analyse CV en < 3 secondes', 'RGPD conforme',
  'Déploiement en 48h', 'Support 24/7',
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-y border-border bg-secondary/60 py-3">
      <motion.div className="flex gap-12 whitespace-nowrap" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />{item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* Dashboard mockup — always dark (shows the app UI) */
function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl" />
      <div className="relative rounded-2xl border border-white/10 bg-brand-navy overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 bg-brand-navy-800">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-red/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
          <div className="ml-auto flex items-center gap-2 rounded-md bg-white/5 px-3 py-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-white/30">SMART-HR</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Collaborateurs', value: '1 284', delta: '+12', color: 'text-emerald-400' },
              { label: 'Risque départ', value: '8,4%', delta: '−2.1%', color: 'text-emerald-400' },
              { label: 'Tâches actives', value: '47', delta: '+5', color: 'text-amber-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{kpi.label}</p>
                <p className="mt-1 text-xl font-bold text-white">{kpi.value}</p>
                <p className={`text-[10px] font-semibold ${kpi.color}`}>{kpi.delta}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-brand-red/30 bg-brand-red/10 p-3 flex items-start gap-3">
            <div className="mt-0.5 h-6 w-6 rounded-lg bg-brand-red/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-3 w-3 text-brand-red-light" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-brand-red-light">Alerte IA — Risque élevé</p>
              <p className="text-[10px] text-white/40 mt-0.5">3 collaborateurs identifiés au pôle Tech (+18%)</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Rétention / 6 mois</p>
            <div className="flex items-end gap-1.5 h-16">
              {[65, 72, 68, 85, 79, 92].map((h, i) => (
                <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="flex-1 rounded-sm" style={{ background: i === 5 ? 'linear-gradient(180deg, #D62828, #e86060)' : 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════ LANDING PAGE ═══════ */
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };

  const NAV_LINKS = [
    { label: 'Produit', id: 'produit' },
    { label: 'Modules', id: 'modules' },
    { label: 'Solutions', id: 'solutions' },
    { label: 'Tarifs', id: 'tarifs' },
  ];

  return (
    <div className="bg-background text-foreground antialiased">

      {/* NAVBAR */}
      <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'border-b border-border bg-background/90 backdrop-blur-xl shadow-sm' : 'bg-transparent'}`}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl font-normal tracking-tight text-foreground">
            Smart<span className="text-primary">-HR</span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <button key={link.id} onClick={() => scrollTo(link.id)} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:bg-secondary hover:text-foreground" aria-label="Changer le thème">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Connexion
            </Link>
            <Link to="/register" className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-brand-red-dark active:scale-95 shadow-sm">
              Démarrer gratuitement
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-border bg-background px-6 pb-6 lg:hidden">
            <div className="space-y-1 pt-4">
              {NAV_LINKS.map((link) => (
                <button key={link.id} onClick={() => scrollTo(link.id)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
                  {link.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/login" className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground">Connexion</Link>
              <Link to="/register" className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground">Démarrer gratuitement</Link>
            </div>
          </motion.div>
        )}
      </header>

      {/* HERO — cream/light by default */}
      <section className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-1/3 h-[500px] w-[500px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-primary/4 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-36 pb-24 lg:pt-48 lg:pb-32">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">SIRH propulsé par l'IA</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="font-display text-5xl leading-[1.05] tracking-tight text-foreground lg:text-[4.5rem]">
                La gestion RH
                <br /><span className="italic text-foreground/60">augmentée</span>
                <br />par l'<span className="text-primary">Intelligence.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="max-w-lg text-lg font-medium leading-relaxed text-muted-foreground">
                Smart-HR anticipe les départs, automatise le recrutement et transforme vos données RH en décisions stratégiques.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }} className="flex flex-wrap gap-3">
                <Link to="/register" className="group flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-brand-red-dark active:scale-95">
                  Essayer gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button onClick={() => scrollTo('produit')} className="flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground transition-all hover:border-primary/30 hover:bg-secondary active:scale-95">
                  Voir les fonctionnalités
                </button>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} className="flex items-center gap-6 pt-2">
                <div className="flex -space-x-2">
                  {['A', 'B', 'M', 'S'].map((l) => (
                    <div key={l} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary to-brand-red-dark text-[11px] font-bold text-white">{l}</div>
                  ))}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-[9px] font-bold text-muted-foreground">+1.5k</div>
                </div>
                <p className="text-sm text-muted-foreground">Rejoints par <span className="font-bold text-foreground">1 500+ PME</span></p>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <DashboardMockup />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <ChevronDown className="h-6 w-6 text-muted-foreground/50" />
            </motion.div>
          </motion.div>
        </div>
        <Ticker />
      </section>

      {/* FEATURES #produit */}
      <section id="produit" className="bg-secondary/30 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="mb-20 max-w-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Fonctionnalités IA</p>
            <h2 className="font-display text-4xl leading-tight text-foreground lg:text-5xl">
              Trois piliers qui transforment<br /><span className="italic text-foreground/70">votre quotidien RH.</span>
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: TrendingDown, title: 'Prédiction du Churn', desc: "Notre Random Forest analyse 40+ signaux — satisfaction, ancienneté, salaire — pour identifier les collaborateurs à risque avec 80% de précision.", stat: '80%', statLabel: 'de précision', delay: 0 },
              { icon: FileSearch, title: 'Analyse NLP des CVs', desc: "Gemini 2.5 Flash extrait compétences, expériences et compatibilité en moins de 3 secondes. Plus jamais de tri manuel de CVs.", stat: '< 3s', statLabel: "d'analyse", delay: 0.1 },
              { icon: Bot, title: 'Assistant IA Conversationnel', desc: "Posez vos questions RH en langage naturel. L'assistant accède aux données réelles pour des réponses précises et contextualisées.", stat: '24/7', statLabel: 'disponible', delay: 0.2 },
            ].map((feature) => (
              <motion.div key={feature.title} initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: feature.delay }} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-md">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-3 font-display text-2xl text-foreground">{feature.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                <div className="flex items-baseline gap-1.5 border-t border-border pt-5">
                  <span className="font-display text-3xl text-primary">{feature.stat}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{feature.statLabel}</span>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-primary transition-all duration-500 group-hover:w-full" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES #modules */}
      <section id="modules" className="bg-background py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.2 }} className="mb-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Modules opérationnels</p>
              <h2 className="font-display text-4xl leading-tight text-foreground lg:text-5xl">
                Une plateforme,<br /><span className="italic text-foreground/70">zéro friction.</span>
              </h2>
            </div>
            <Link to="/login" className="group flex items-center gap-2 text-sm font-bold text-primary transition-all hover:gap-3">
              Accéder à la plateforme <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: CheckSquare, title: 'Gestion des Tâches', desc: 'Vue Kanban temps réel avec statuts automatisés et rappels intelligents.', span: 'lg:col-span-2', card: 'bg-primary dark:bg-brand-navy', titleClass: 'text-white', descClass: 'text-white/70', iconWrap: 'bg-white/20 text-white' },
              { icon: Calendar, title: 'Congés', desc: 'Demande, validation et suivi des soldes en quelques clics.', span: '', card: 'bg-secondary border border-border', titleClass: 'text-foreground', descClass: 'text-muted-foreground', iconWrap: 'bg-primary/12 text-primary ring-1 ring-primary/20' },
              { icon: Users, title: 'Gestion du Personnel', desc: 'Annuaire complet, fiches détaillées, hiérarchies et organigramme.', span: '', card: 'bg-card border border-border shadow-sm', titleClass: 'text-foreground', descClass: 'text-muted-foreground', iconWrap: 'bg-primary text-primary-foreground' },
              { icon: DollarSign, title: 'Paie & Avantages', desc: 'Historique complet, fiches de paie et suivi des salaires.', span: '', card: 'bg-primary', titleClass: 'text-primary-foreground', descClass: 'text-white/70', iconWrap: 'bg-white/20 text-white' },
              { icon: FileText, title: 'Documents', desc: 'Stockage sécurisé de contrats, attestations et certificats.', span: 'lg:col-span-2', card: 'bg-secondary border border-border', titleClass: 'text-foreground', descClass: 'text-muted-foreground', iconWrap: 'bg-primary/12 text-primary ring-1 ring-primary/20' },
            ].map((module, i) => (
              <motion.div key={module.title} initial={{ y: 16 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, delay: i * 0.07 }} className={`group rounded-3xl p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${module.card} ${module.span}`}>
                <div className={`mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl ${module.iconWrap}`}>
                  <module.icon className="h-5 w-5" />
                </div>
                <h3 className={`mb-3 font-display text-2xl ${module.titleClass}`}>{module.title}</h3>
                <p className={`text-sm leading-relaxed ${module.descClass}`}>{module.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS #solutions */}
      <section id="solutions" className="bg-secondary/40 dark:bg-brand-navy py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-primary/6 blur-[100px]" />
          <div className="absolute right-0 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-primary/4 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.2 }} className="mb-20 text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Impact mesurable</p>
            <h2 className="font-display text-4xl text-foreground dark:text-white lg:text-5xl">
              Des résultats, <span className="italic text-muted-foreground dark:text-brand-cream/60">pas des promesses.</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 gap-px rounded-3xl overflow-hidden border border-border dark:border-white/8 lg:grid-cols-4">
            {[
              { value: 1500, suffix: '+', label: 'PME partenaires', prefix: '' },
              { value: 35, suffix: '%', label: 'Productivité accrue', prefix: '+' },
              { value: 40, suffix: '%', label: 'Temps admin réduit', prefix: '−' },
              { value: 80, suffix: '%', label: 'Précision churn IA', prefix: '' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ y: 12 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: i * 0.1 }} className="flex flex-col items-center justify-center bg-background/40 dark:bg-white/[0.02] p-10 text-center hover:bg-background/60 dark:hover:bg-white/[0.04] transition-colors">
                <p className="font-display text-5xl text-foreground dark:text-white lg:text-6xl">
                  <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-white/30">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY — adapts to mode */}
      <section className="bg-secondary/30 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <motion.div initial={{ x: -16 }} whileInView={{ x: 0 }} viewport={{ once: true, amount: 0.2 }} className="space-y-8">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Pourquoi Smart-HR</p>
              <h2 className="font-display text-4xl leading-tight text-foreground lg:text-5xl">
                Conçu pour<br /><span className="italic text-foreground/70">les équipes RH</span><br />modernes.
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                Smart-HR n'est pas un simple logiciel de paie. C'est un copilote stratégique qui transforme vos données dormantes en insights actionnables, en temps réel.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-brand-navy-800 active:scale-95">
                Accéder à la plateforme <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, title: 'RGPD & CDP', desc: 'Conformité complète avec les réglementations européennes et africaines sur la protection des données.' },
                { icon: Zap, title: 'Temps réel', desc: 'Analyse continue des données RH avec des alertes instantanées sur les situations critiques.' },
                { icon: BarChart3, title: 'Data-driven', desc: '40+ indicateurs analysés par notre modèle ML pour des prédictions fiables à 80%.' },
                { icon: Brain, title: 'IA générative', desc: 'Google Gemini 2.5 Flash pour des analyses textuelles, NLP et un assistant conversationnel.' },
              ].map((item, i) => (
                <motion.div key={item.title} initial={{ y: 12 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA #tarifs — always red */}
      <section id="tarifs" className="bg-background py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: 0.2 }} className="relative overflow-hidden rounded-3xl bg-primary p-16 text-center">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
            </div>
            <div className="relative space-y-6">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Accès immédiat</p>
              <h2 className="font-display text-4xl text-white lg:text-6xl">
                Prêt à transformer<br /><span className="italic text-white/80">votre culture RH ?</span>
              </h2>
              <p className="mx-auto max-w-lg text-lg text-white/70">
                Rejoignez les équipes qui utilisent Smart-HR pour anticiper, décider et grandir.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link to="/register" className="rounded-2xl bg-white px-10 py-4 text-base font-bold text-primary transition-all hover:bg-brand-cream hover:scale-105 active:scale-95 shadow-xl">
                  Créer un compte gratuit
                </Link>
                <Link to="/login" className="rounded-2xl border-2 border-white/30 px-10 py-4 text-base font-bold text-white transition-all hover:bg-white/10">
                  Se connecter
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER — always dark navy */}
      <footer className="border-t border-white/8 bg-brand-navy py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-5 mb-14">
            <div className="col-span-2 space-y-5">
              <Link to="/" className="font-display text-2xl text-white">Smart<span className="text-primary">-HR</span></Link>
              <p className="max-w-xs text-sm leading-relaxed text-white/40">Le SIRH intelligent conçu pour les PME qui placent l'humain et la donnée au cœur de leur stratégie.</p>
              <div className="flex gap-3">
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:text-white" aria-label="LinkedIn">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>
                </a>
                <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:text-white" aria-label="Twitter/X">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
              </div>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Produit</p>
              <ul className="space-y-3 text-sm">
                {['Churn Prediction', 'Analyse CV', 'Assistant IA', 'Tableaux de bord', 'Recrutement'].map((item) => (
                  <li key={item}><button onClick={() => scrollTo('produit')} className="text-white/50 hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Modules</p>
              <ul className="space-y-3 text-sm">
                {['Employés', 'Congés', 'Tâches', 'Présences', 'Paie', 'Documents'].map((item) => (
                  <li key={item}><button onClick={() => scrollTo('modules')} className="text-white/50 hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Légal</p>
              <ul className="space-y-3 text-sm">
                {['Confidentialité', 'CGU', 'RGPD', 'Mentions légales'].map((item) => (
                  <li key={item}><a href="#" className="text-white/50 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-brand-red-dark">
                  Connexion <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 md:flex-row">
            <p className="text-xs text-white/25">© {new Date().getFullYear()} Smart-HR — Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <p className="text-xs text-white/25">Tous les systèmes opérationnels</p>
            </div>
            <p className="text-xs text-white/25">SaaS B2B · SIRH · IA Prédictive</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
