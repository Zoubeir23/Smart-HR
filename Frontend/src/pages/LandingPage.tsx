import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  PlayCircle,
  Zap,
  TrendingDown,
  UserSearch,
  Bot,
  ShieldCheck,
  CheckSquare,
  CheckCircle2,
  Banknote,
  Shield,
  UserCircle,
  Link as LinkIcon,
  AtSign,
  ArrowRight
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-slate-50 font-sans text-slate-900 antialiased mesh-gradient min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/50">
        <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-10">
            <Link to="/" className="text-2xl font-extrabold tracking-tight text-primary">
              Smart-HR
            </Link>
            <div className="hidden lg:flex items-center gap-8">
              <a href="#" className="text-sm font-semibold text-slate-900 hover:text-primary transition-colors">Produit</a>
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-primary transition-colors">Solutions</a>
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-primary transition-colors">Ressources</a>
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-primary transition-colors">Tarifs</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary transition-all">
              Connexion
            </Link>
            <button className="bg-gradient-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95">
              Demander une démo
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative z-10 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <Sparkles className="text-primary w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Intelligence Artificielle RH</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-slate-900">
                Le futur des RH et de la <span className="text-primary">gestion des tâches</span> pour les PME
              </h1>

              <p className="text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Optimisez votre capital humain grâce à nos <span className="text-slate-900 font-bold">outils d'IA prédictive</span>, une paie automatisée et un assistant virtuel disponible 24/7.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <button className="bg-gradient-primary text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  Essayer Gratuitement
                </button>
                <button className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                  <PlayCircle className="w-6 h-6" />
                  Voir la démo
                </button>
              </div>

              <div className="pt-4 flex items-center justify-center lg:justify-start gap-4 text-slate-500">
                <div className="flex -space-x-2">
                  <img alt="User" className="w-8 h-8 rounded-full border-2 border-white object-cover bg-slate-200" src="https://ui-avatars.com/api/?name=Alice&background=random" />
                  <img alt="User" className="w-8 h-8 rounded-full border-2 border-white object-cover bg-slate-200" src="https://ui-avatars.com/api/?name=Bob&background=random" />
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                    +1.5k
                  </div>
                </div>
                <p className="text-sm font-medium">Rejoint par plus de 1 500 PME en Europe</p>
              </div>
            </div>

            <div className="relative lg:h-[600px] flex items-center justify-center">
              {/* Sleek Mockup */}
              <div className="relative w-full max-w-2xl transform lg:rotate-2 hover:rotate-0 transition-all duration-700 dashboard-glow">
                <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-3xl border border-slate-200/50 shadow-2xl">
                  <div className="bg-slate-50 border border-slate-100 rounded-[22px] overflow-hidden">
                    <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400/20"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400/20"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-400/20"></div>
                      </div>
                      <div className="px-3 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-400 tracking-tighter uppercase">
                        Console Smart-HR v5.2
                      </div>
                    </div>
                    <div className="p-8 space-y-8">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Collaborateurs actifs</p>
                          <p className="text-4xl font-extrabold text-slate-900">1,284</p>
                        </div>
                        <div className="h-16 w-32 flex items-end gap-1.5">
                          <div className="w-full bg-primary/20 h-2/5 rounded-t-sm"></div>
                          <div className="w-full bg-primary/40 h-3/5 rounded-t-sm"></div>
                          <div className="w-full bg-primary/60 h-4/5 rounded-t-sm"></div>
                          <div className="w-full bg-primary h-full rounded-t-sm"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            <span className="text-[11px] font-bold text-slate-900 uppercase">Tâches Critiques</span>
                          </div>
                          <div className="space-y-3">
                            <div className="h-2 bg-slate-100 rounded-full w-full"></div>
                            <div className="h-2 bg-slate-100 rounded-full w-4/5"></div>
                            <div className="h-2 bg-slate-100 rounded-full w-3/5"></div>
                          </div>
                        </div>
                        <div className="bg-primary p-5 rounded-2xl shadow-sm text-white">
                          <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Alerte IA</span>
                          </div>
                          <p className="text-xs font-medium opacity-90 leading-relaxed">
                            Hausse du risque de départ détectée au pôle Tech (+12%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Features Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                L'IA au service de vos talents
              </h2>
              <p className="text-slate-500 text-lg font-medium">
                Trois piliers technologiques conçus pour transformer votre gestion RH quotidienne.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {/* Feature 1 */}
              <div className="group p-10 bg-slate-50 rounded-3xl hover:bg-white hover:shadow-lg transition-all duration-500 border border-transparent hover:border-slate-100">
                <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl mb-8 group-hover:scale-110 transition-transform">
                  <TrendingDown className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">Prédiction de l'Attrition</h3>
                <p className="text-slate-500 leading-relaxed font-medium mb-6">
                  Identifiez les collaborateurs à risque avant qu'ils ne partent. Notre IA analyse 40+ signaux faibles pour réduire votre turnover de 25%.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest group-hover:gap-4 transition-all">
                  En savoir plus <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Feature 2 */}
              <div className="group p-10 bg-slate-50 rounded-3xl hover:bg-white hover:shadow-lg transition-all duration-500 border border-transparent hover:border-slate-100">
                <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl mb-8 group-hover:scale-110 transition-transform">
                  <UserSearch className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">Recrutement Intelligent</h3>
                <p className="text-slate-500 leading-relaxed font-medium mb-6">
                  Le matching automatique par IA analyse les CV et les profils sociaux pour trouver la perle rare. Divisez votre temps de recrutement par deux.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest group-hover:gap-4 transition-all">
                  Découvrir l'outil <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Feature 3 */}
              <div className="group p-10 bg-slate-50 rounded-3xl hover:bg-white hover:shadow-lg transition-all duration-500 border border-transparent hover:border-slate-100">
                <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl mb-8 group-hover:scale-110 transition-transform">
                  <Bot className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">Assistant RH Virtuel</h3>
                <p className="text-slate-500 leading-relaxed font-medium mb-6">
                  Libérez votre équipe des questions répétitives. Notre chatbot répond instantanément sur les congés, les mutuelles et les contrats.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest group-hover:gap-4 transition-all">
                  Voir en action <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Core Modules Section */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div className="max-w-xl">
                <h2 className="text-4xl font-extrabold mb-4 tracking-tight text-slate-900">Une plateforme, zéro friction</h2>
                <p className="text-slate-500 text-lg font-medium">
                  Centralisez tout ce qui compte pour la croissance de votre entreprise.
                </p>
              </div>
              <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl shadow-sm border border-slate-200">
                <ShieldCheck className="text-emerald-500 w-6 h-6" />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Disponibilité</p>
                  <p className="text-sm font-bold text-slate-900">SLA 99.9% Garanti</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Task Management Card */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-10 flex flex-col md:flex-row gap-10 items-center overflow-hidden border border-slate-200/50 shadow-sm">
                <div className="flex-1 space-y-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <CheckSquare className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900">Gestion des Tâches</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Suivez l'avancement des projets et les checklists d'onboarding en temps réel. Une interface intuitive pour ne plus rien oublier.
                  </p>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                      <span className="text-sm font-bold text-slate-700">Automation des flux de travail</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                      <span className="text-sm font-bold text-slate-700">Rappels intelligents par IA</span>
                    </li>
                  </ul>
                </div>
                <div className="w-full md:w-1/2 bg-slate-50 rounded-2xl border border-slate-100 p-4 transform lg:translate-x-12">
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg shadow-sm flex items-center gap-3 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <div className="h-2 bg-slate-100 rounded-full w-24"></div>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm flex items-center gap-3 border border-slate-100 opacity-60">
                      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      <div className="h-2 bg-slate-100 rounded-full w-32"></div>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm flex items-center gap-3 border border-slate-100 opacity-30">
                      <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                      <div className="h-2 bg-slate-100 rounded-full w-20"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payroll Card */}
              <div className="bg-white rounded-3xl p-10 border border-slate-200/50 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-8">
                    <Banknote className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-slate-900">Paie et Avantages</h3>
                  <p className="text-slate-500 font-medium leading-relaxed mb-6">
                    Simplifiez la gestion de la paie et des avantages sociaux. Tout est automatisé pour une conformité totale sans effort.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conforme RGPD</span>
                  <Shield className="text-primary w-5 h-5" />
                </div>
              </div>

              {/* Profiles Card */}
              <div className="bg-white rounded-3xl p-10 border border-slate-200/50 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-8">
                    <UserCircle className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-slate-900">Profils Unifiés</h3>
                  <p className="text-slate-500 font-medium leading-relaxed mb-6">
                    Une vue à 360° sur chaque collaborateur : historique, compétences, et évolution de carrière centralisés.
                  </p>
                </div>
                <div className="flex -space-x-3">
                  <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover bg-slate-200" src="https://ui-avatars.com/api/?name=C&background=random" alt="User" />
                  <img className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover bg-slate-200" src="https://ui-avatars.com/api/?name=D&background=random" alt="User" />
                  <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-primary">
                    +48
                  </div>
                </div>
              </div>

              {/* Strategic CTA Card */}
              <div className="lg:col-span-2 bg-gradient-primary rounded-3xl p-12 relative overflow-hidden text-white flex flex-col md:flex-row items-center gap-10">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex-1 text-center md:text-left">
                  <h3 className="text-3xl font-extrabold mb-4">Prêt à transformer votre culture d'entreprise ?</h3>
                  <p className="text-blue-100 text-lg font-medium">Rejoignez les leaders qui utilisent Smart-HR pour libérer le potentiel de leurs équipes.</p>
                </div>
                <div className="relative z-10 shrink-0 flex flex-col sm:flex-row gap-4">
                  <button className="bg-white text-primary px-10 py-5 rounded-2xl font-bold text-xl hover:scale-105 transition-all shadow-xl">
                    Demander une démo
                  </button>
                  <button className="bg-transparent text-white border-2 border-white/30 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/10 transition-all">
                    En savoir plus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Metrics Section */}
        <section className="py-24 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div className="space-y-2">
              <p className="text-5xl font-extrabold text-primary">1 500+</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">PME partenaires</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-extrabold text-primary">35%</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Productivité accrue</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-extrabold text-primary">99%</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Confiance client</p>
            </div>
            <div className="space-y-2">
              <p className="text-5xl font-extrabold text-primary">-40%</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tâches administratives</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-6">
              <Link to="/" className="text-2xl font-extrabold tracking-tight text-primary">
                Smart-HR
              </Link>
              <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
                L'allié digital des directions RH modernes. Conçu pour les entreprises qui placent l'humain au cœur de leur stratégie de croissance.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                  <LinkIcon className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                  <AtSign className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Produit</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><a href="#" className="hover:text-primary transition-colors">Plateforme</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Analyses IA</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Gestion Tâches</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Tarifs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Société</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><a href="#" className="hover:text-primary transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog RH</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Carrières</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Légal</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-500">
                <li><a href="#" className="hover:text-primary transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">RGPD</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Mentions légales</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">CGU</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <p>© 2024 Smart-HR. Tous droits réservés.</p>
            <p>Fait avec passion pour l'humain.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
