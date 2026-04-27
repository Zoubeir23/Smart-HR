import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
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
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Animated counter
───────────────────────────────────────────── */
function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
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

  return (
    <span ref={ref}>
      {prefix}{display.toLocaleString('fr-FR')}{suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Ticker item
───────────────────────────────────────────── */
const TICKER_ITEMS = [
  '80% de précision churn',
  '−40% temps administratif',
  '1 500+ PME partenaires',
  'SLA 99,9% garanti',
  'Analyse CV en < 3 secondes',
  'RGPD conforme',
  'Déploiement en 48h',
  'Support 24/7',
];

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-white/[0.03] py-3">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-sm font-medium text-white/50">
            <span className="h-1 w-1 rounded-full bg-brand-red" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dashboard mockup
───────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-red/20 via-transparent to-brand-cream/5 blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 bg-brand-navy-800 overflow-hidden shadow-2xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-red/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/40" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
          <div className="ml-auto flex items-center gap-2 rounded-md bg-white/5 px-3 py-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-white/30">SMART-HR DASHBOARD</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* KPI row */}
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

          {/* Churn alert */}
          <div className="rounded-xl border border-brand-red/30 bg-brand-red/10 p-3 flex items-start gap-3">
            <div className="mt-0.5 h-6 w-6 rounded-lg bg-brand-red/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-3 w-3 text-brand-red" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-brand-red-light">Alerte IA — Risque élevé</p>
              <p className="text-[10px] text-white/40 mt-0.5">3 collaborateurs identifiés au pôle Tech (+18% vs mois dernier)</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Rétention / 6 mois</p>
            <div className="flex items-end gap-1.5 h-16">
              {[65, 72, 68, 85, 79, 92].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="flex-1 rounded-sm"
                  style={{
                    background: i === 5
                      ? 'linear-gradient(180deg, #D62828, #e86060)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const NAV_LINKS = [
    { label: 'Produit', id: 'produit' },
    { label: 'Modules', id: 'modules' },
    { label: 'Solutions', id: 'solutions' },
    { label: 'Tarifs', id: 'tarifs' },
  ];

  return (
    <div className="bg-brand-navy text-white antialiased">

      {/* ─────── NAVBAR ─────── */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? 'border-b border-white/10 bg-brand-navy/90 backdrop-blur-xl' : ''
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-xl font-normal tracking-tight text-white">
            Smart<span className="text-brand-red">-HR</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm font-medium text-white/50 transition-colors hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="text-sm font-semibold text-white/60 transition-colors hover:text-white"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-brand-red px-5 py-2 text-sm font-bold text-white transition-all hover:bg-brand-red-light active:scale-95"
            >
              Démarrer gratuitement
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden text-white/60 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-white/10 bg-brand-navy px-6 pb-6 lg:hidden"
          >
            <div className="space-y-1 pt-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/login" className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white">
                Connexion
              </Link>
              <Link to="/register" className="rounded-lg bg-brand-red px-4 py-2.5 text-center text-sm font-bold text-white">
                Démarrer gratuitement
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      {/* ─────── HERO ─────── */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/4 h-[600px] w-[600px] rounded-full bg-brand-red/8 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-brand-cream/4 blur-[100px]" />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)`,
              backgroundSize: '80px 80px',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-36 pb-24 lg:pt-48 lg:pb-32">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full border border-brand-red/30 bg-brand-red/10 px-4 py-1.5"
              >
                <Brain className="h-3.5 w-3.5 text-brand-red" />
                <span className="text-xs font-bold uppercase tracking-widest text-brand-red-light">
                  SIRH propulsé par l'IA
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="font-display text-5xl leading-[1.05] tracking-tight lg:text-[4.5rem]"
              >
                La gestion RH
                <br />
                <span className="italic text-brand-cream/80">augmentée</span>
                <br />
                par l'<span className="text-brand-red">Intelligence.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="max-w-lg text-lg font-medium leading-relaxed text-white/50"
              >
                Smart-HR anticipe les départs, automatise le recrutement
                et transforme vos données RH en décisions stratégiques.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex flex-wrap gap-3"
              >
                <Link
                  to="/register"
                  className="group flex items-center gap-2 rounded-xl bg-brand-red px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-red/25 transition-all hover:bg-brand-red-light hover:shadow-brand-red/40 active:scale-95"
                >
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button
                  onClick={() => scrollTo('produit')}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-base font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  Voir les fonctionnalités
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex items-center gap-6 pt-2"
              >
                <div className="flex -space-x-2">
                  {['A', 'B', 'M', 'S'].map((l) => (
                    <div key={l} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-navy bg-gradient-to-br from-brand-red to-brand-red-dark text-[11px] font-bold text-white">
                      {l}
                    </div>
                  ))}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-navy bg-white/10 text-[9px] font-bold text-white/60">
                    +1.5k
                  </div>
                </div>
                <p className="text-sm text-white/40">
                  Rejoints par <span className="font-semibold text-white/70">1 500+ PME</span>
                </p>
              </motion.div>
            </div>

            {/* Right — Dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 32, rotateY: 8 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ perspective: '1200px' }}
            >
              <DashboardMockup />
            </motion.div>
          </div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="h-6 w-6 text-white/20" />
            </motion.div>
          </motion.div>
        </div>

        {/* Ticker */}
        <Ticker />
      </section>

      {/* ─────── FEATURES #produit ─────── */}
      <section id="produit" className="bg-brand-cream py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20 max-w-2xl"
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-red">
              Fonctionnalités IA
            </p>
            <h2 className="font-display text-4xl leading-tight text-brand-navy lg:text-5xl">
              Trois piliers qui transforment
              <br />
              <span className="italic">votre quotidien RH.</span>
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: TrendingDown,
                title: 'Prédiction du Churn',
                desc: "Notre Random Forest analyse 40+ signaux — satisfaction, ancienneté, salaire — pour identifier les collaborateurs à risque de départ avec 80% de précision.",
                stat: '80%',
                statLabel: 'de précision',
                delay: 0,
              },
              {
                icon: FileSearch,
                title: 'Analyse NLP des CVs',
                desc: "Gemini 2.5 Flash extrait compétences, expériences et compatibilité avec le poste en moins de 3 secondes. Plus jamais de tri manuel de CVs.",
                stat: '< 3s',
                statLabel: "d'analyse",
                delay: 0.1,
              },
              {
                icon: Bot,
                title: 'Assistant IA Conversationnel',
                desc: "Posez vos questions RH en langage naturel. L'assistant accède aux données réelles de l'application pour des réponses précises et contextualisées.",
                stat: '24/7',
                statLabel: 'disponible',
                delay: 0.2,
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: feature.delay }}
                className="group relative overflow-hidden rounded-3xl border border-brand-navy/8 bg-white p-8 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy">
                  <feature.icon className="h-5 w-5 text-brand-cream" />
                </div>
                <h3 className="mb-3 font-display text-2xl text-brand-navy">{feature.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-brand-navy/60">{feature.desc}</p>
                <div className="flex items-baseline gap-1.5 border-t border-brand-navy/6 pt-5">
                  <span className="font-display text-3xl text-brand-red">{feature.stat}</span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-brand-navy/40">{feature.statLabel}</span>
                </div>

                {/* hover accent */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-brand-red to-brand-red-light transition-all duration-500 group-hover:w-full" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── MODULES #modules ─────── */}
      <section id="modules" className="bg-white py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
          >
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-red">
                Modules opérationnels
              </p>
              <h2 className="font-display text-4xl leading-tight text-brand-navy lg:text-5xl">
                Une plateforme,
                <br />
                <span className="italic">zéro friction.</span>
              </h2>
            </div>
            <Link
              to="/login"
              className="group flex items-center gap-2 text-sm font-bold text-brand-red transition-all hover:gap-3"
            >
              Accéder à la plateforme <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CheckSquare,
                title: 'Gestion des Tâches',
                desc: 'Vue Kanban temps réel avec statuts automatisés et rappels intelligents.',
                span: 'lg:col-span-2',
                bg: 'bg-brand-navy',
                textColor: 'text-white',
                descColor: 'text-white/50',
                iconBg: 'bg-white/10',
                iconColor: 'text-white',
              },
              {
                icon: Calendar,
                title: 'Congés',
                desc: 'Demande, validation et suivi des soldes en quelques clics.',
                span: '',
                bg: 'bg-brand-cream',
                textColor: 'text-brand-navy',
                descColor: 'text-brand-navy/60',
                iconBg: 'bg-brand-navy',
                iconColor: 'text-brand-cream',
              },
              {
                icon: Users,
                title: 'Gestion du Personnel',
                desc: 'Annuaire complet, fiches détaillées, hiérarchies et organigramme.',
                span: '',
                bg: 'bg-slate-50',
                textColor: 'text-brand-navy',
                descColor: 'text-brand-navy/60',
                iconBg: 'bg-brand-red',
                iconColor: 'text-white',
              },
              {
                icon: DollarSign,
                title: 'Paie & Avantages',
                desc: 'Historique complet, fiches de paie et suivi des salaires.',
                span: '',
                bg: 'bg-brand-red',
                textColor: 'text-white',
                descColor: 'text-white/60',
                iconBg: 'bg-white/20',
                iconColor: 'text-white',
              },
              {
                icon: FileText,
                title: 'Documents',
                desc: 'Stockage sécurisé de contrats, attestations et certificats.',
                span: 'lg:col-span-2',
                bg: 'bg-brand-cream',
                textColor: 'text-brand-navy',
                descColor: 'text-brand-navy/60',
                iconBg: 'bg-brand-navy',
                iconColor: 'text-brand-cream',
              },
            ].map((module, i) => (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className={`group rounded-3xl p-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${module.bg} ${module.span}`}
              >
                <div className={`mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl ${module.iconBg}`}>
                  <module.icon className={`h-5 w-5 ${module.iconColor}`} />
                </div>
                <h3 className={`mb-3 font-display text-2xl ${module.textColor}`}>{module.title}</h3>
                <p className={`text-sm leading-relaxed ${module.descColor}`}>{module.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── STATS #solutions ─────── */}
      <section id="solutions" className="bg-brand-navy py-28 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-brand-red/6 blur-[100px]" />
          <div className="absolute right-0 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-brand-cream/3 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-red">Impact mesurable</p>
            <h2 className="font-display text-4xl text-white lg:text-5xl">
              Des résultats,{' '}
              <span className="italic text-brand-cream/60">pas des promesses.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-px rounded-3xl overflow-hidden border border-white/8 lg:grid-cols-4">
            {[
              { value: 1500, suffix: '+', label: 'PME partenaires', prefix: '' },
              { value: 35, suffix: '%', label: 'Productivité accrue', prefix: '+' },
              { value: 40, suffix: '%', label: 'Temps admin réduit', prefix: '−' },
              { value: 80, suffix: '%', label: 'Précision churn IA', prefix: '' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="flex flex-col items-center justify-center bg-white/[0.02] p-10 text-center hover:bg-white/[0.04] transition-colors"
              >
                <p className="font-display text-5xl text-white lg:text-6xl">
                  <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-white/30">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── WHY / TRUST ─────── */}
      <section className="bg-brand-cream py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-brand-red">Pourquoi Smart-HR</p>
              <h2 className="font-display text-4xl leading-tight text-brand-navy lg:text-5xl">
                Conçu pour
                <br />
                <span className="italic">les équipes RH</span>
                <br />
                modernes.
              </h2>
              <p className="text-base leading-relaxed text-brand-navy/60">
                Smart-HR n'est pas un simple logiciel de paie. C'est un copilote stratégique
                qui transforme vos données dormantes en insights actionnables, en temps réel.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-7 py-3.5 text-sm font-bold text-brand-cream transition-all hover:bg-brand-navy-800 active:scale-95"
              >
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
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-2xl border border-brand-navy/8 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy">
                    <item.icon className="h-4 w-4 text-brand-cream" />
                  </div>
                  <h3 className="mb-2 font-semibold text-brand-navy">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-brand-navy/50">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────── CTA #tarifs ─────── */}
      <section id="tarifs" className="bg-brand-navy py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-brand-red p-16 text-center"
          >
            {/* bg detail */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,.5) 30px, rgba(255,255,255,.5) 31px)`,
                }}
              />
            </div>

            <div className="relative space-y-6">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                Accès immédiat
              </p>
              <h2 className="font-display text-4xl text-white lg:text-6xl">
                Prêt à transformer
                <br />
                <span className="italic">votre culture RH ?</span>
              </h2>
              <p className="mx-auto max-w-lg text-lg text-white/70">
                Rejoignez les équipes qui utilisent Smart-HR pour anticiper, décider et grandir.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link
                  to="/register"
                  className="rounded-2xl bg-white px-10 py-4 text-base font-bold text-brand-red transition-all hover:bg-brand-cream hover:scale-105 active:scale-95 shadow-xl"
                >
                  Créer un compte gratuit
                </Link>
                <Link
                  to="/login"
                  className="rounded-2xl border-2 border-white/30 px-10 py-4 text-base font-bold text-white transition-all hover:bg-white/10"
                >
                  Se connecter
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────── FOOTER ─────── */}
      <footer className="border-t border-white/8 bg-brand-navy py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-5 mb-14">

            {/* Brand column */}
            <div className="col-span-2 space-y-5">
              <Link to="/" className="font-display text-2xl text-white">
                Smart<span className="text-brand-red">-HR</span>
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-white/40">
                Le SIRH intelligent conçu pour les PME qui placent l'humain et la donnée au cœur de leur stratégie.
              </p>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:text-white"
                  aria-label="LinkedIn"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:text-white"
                  aria-label="Twitter/X"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Produit */}
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Produit</p>
              <ul className="space-y-3 text-sm">
                {['Churn Prediction', 'Analyse CV', 'Assistant IA', 'Tableaux de bord', 'Recrutement'].map((item) => (
                  <li key={item}>
                    <button onClick={() => scrollTo('produit')} className="text-white/50 hover:text-white transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modules */}
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Modules</p>
              <ul className="space-y-3 text-sm">
                {['Employés', 'Congés', 'Tâches', 'Présences', 'Paie', 'Documents'].map((item) => (
                  <li key={item}>
                    <button onClick={() => scrollTo('modules')} className="text-white/50 hover:text-white transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Liens */}
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-white/30">Légal</p>
              <ul className="space-y-3 text-sm">
                {['Confidentialité', 'CGU', 'RGPD', 'Mentions légales'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-white/50 hover:text-white transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-red-light"
                >
                  Connexion <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 md:flex-row">
            <p className="text-xs text-white/25">
              © {new Date().getFullYear()} Smart-HR — Tous droits réservés.
            </p>
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
