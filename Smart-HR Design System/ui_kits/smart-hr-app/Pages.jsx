/* ═══════════════════════════════════════
   Pages: LoginPage, HRDashboardPage
   ═══════════════════════════════════════ */

const DEMO_ACCOUNTS = [
  { email: 'admin@smarthr.com', password: 'admin123', role: 'Admin', initial: 'A', color: '#c41e1e' },
  { email: 'rh@smarthr.com', password: 'rh123', role: 'RH', initial: 'R', color: '#D62828' },
  { email: 'employee@smarthr.com', password: 'employee123', role: 'Employé', initial: 'E', color: '#e86060' },
  { email: 'candidate@smarthr.com', password: 'candidate123', role: 'Candidat', initial: 'C', color: '#f59e0b' },
];

const LOGIN_FEATURES = [
  { icon: 'brain-circuit', label: 'Prédiction du turnover (ML)' },
  { icon: 'file-search', label: 'Analyse automatique des CVs' },
  { icon: 'bar-chart-3', label: 'Tableaux de bord analytiques' },
  { icon: 'mic', label: 'Assistant vocal intelligent' },
];

function LoginPage({ onLogin }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    const acct = DEMO_ACCOUNTS.find((a) => a.email === email) || DEMO_ACCOUNTS[1];
    onLogin({ email: acct.email, role: acct.role, first_name: acct.role === 'RH' ? 'Fatou' : acct.role === 'Admin' ? 'Aïssa' : 'Amadou', last_name: acct.role === 'RH' ? 'Ndiaye' : acct.role === 'Admin' ? 'Diop' : 'Sow', roleLabel: `Responsable ${acct.role}` });
  };

  return (
    <div className="login">
      <div className="login-left">
        <div className="login-glow-a" />
        <div className="login-glow-b" />
        <div className="login-content">
          <div className="login-brand">
            <div className="login-brand-box"><Icon name="sparkles" size={18} color="#fff" /></div>
            <div className="login-brand-name">Smart<em>-HR</em></div>
          </div>

          <div className="login-hero">
            <div className="login-pill"><Icon name="shield" size={12} color="currentColor" /> Plateforme SIRH Intelligent</div>
            <h1 className="login-title">
              La GRH augmentée<br/>par l'<span className="grad">Intelligence</span><br/><span className="grad">Artificielle</span>
            </h1>
            <p className="login-lead">
              Anticipez les départs, automatisez le recrutement et prenez des décisions éclairées grâce au Machine Learning.
            </p>
            <div className="login-feats">
              {LOGIN_FEATURES.map((f) => (
                <div key={f.label} className="login-feat">
                  <div className="login-feat-ico"><Icon name={f.icon} size={15} color="rgba(255,255,255,0.9)" /></div>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <div className="login-stats">
              <div className="login-stat"><strong>80%</strong><span>Précision churn</span></div>
              <div className="login-stat-div" />
              <div className="login-stat"><strong>-40%</strong><span>Temps admin RH</span></div>
              <div className="login-stat-div" />
              <div className="login-stat"><strong>&lt;200ms</strong><span>Temps réponse</span></div>
            </div>
          </div>

          <div className="login-foot">
            <span>© 2026 Smart-HR — Tous droits réservés</span>
            <span>SaaS B2B · SIRH · IA</span>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-card">
            <h2>Connexion</h2>
            <p className="login-sub">Accédez à votre espace de gestion RH</p>

            <form className="login-form" onSubmit={submit}>
              <Input icon="mail" type="email" label="Adresse email"
                placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />

              <div className="login-form-row">
                <div className="row-top">
                  <label className="field-label">Mot de passe</label>
                  <a href="#" className="login-forgot" onClick={(e) => e.preventDefault()}>Oublié ?</a>
                </div>
                <div className="field-wrap">
                  <Icon name="lock" size={15} className="field-ico" />
                  <input className="input" type={showPw ? 'text' : 'password'}
                    placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <span className="eye" onClick={() => setShowPw(!showPw)}>
                    <Icon name={showPw ? 'eye-off' : 'eye'} size={15} />
                  </span>
                </div>
              </div>

              <Button variant="primary" size="lg" type="submit" iconRight="arrow-right">Se connecter</Button>
            </form>

            <div className="login-divider" style={{ margin: '20px 0' }}>ou continuer avec</div>

            <button className="login-google" onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.37-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Continuer avec Google
            </button>
          </div>

          <div className="login-demo">
            <div className="login-demo-label">Accès démo</div>
            <div className="login-demo-grid">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.email} className="login-demo-btn"
                  onClick={() => { setEmail(a.email); setPassword(a.password); }}
                  title={a.email}>
                  <div className="login-demo-av" style={{ background: a.color }}>{a.initial}</div>
                  <span className="login-demo-role">{a.role}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="login-bottom">
            Pas encore de compte ? <a href="#" onClick={(e) => e.preventDefault()}>Créer un compte →</a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── HR Dashboard page ─── */
function HRDashboardPage({ user, onNavigate, onToast, leaves, setLeaves, activeNav }) {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir';

  const employeesAtRisk = [
    { id: 1, name: 'Moussa Bâ', role: 'Ingénieur Logiciel', department: 'Ingénierie', risk: 87, status: 'actif', signal: 'Baisse d\'engagement · 3 mois' },
    { id: 2, name: 'Aminata Sy', role: 'Chef de Projet', department: 'Produit', risk: 74, status: 'actif', signal: 'Surcharge détectée · 40+ signaux' },
    { id: 3, name: 'Ibrahim Diallo', role: 'Commercial Senior', department: 'Ventes', risk: 68, status: 'actif', signal: 'Absences répétées' },
    { id: 4, name: 'Kadiatou Touré', role: 'Designer UX', department: 'Design', risk: 61, status: 'actif', signal: 'Feedback négatif récent' },
  ];

  const approve = (id) => {
    const lv = leaves.find((l) => l.id === id);
    setLeaves(leaves.filter((l) => l.id !== id));
    onToast({ title: 'Congé approuvé', description: `La demande de ${lv.name} a été approuvée avec succès.`, variant: 'success' });
  };
  const reject = (id) => {
    const lv = leaves.find((l) => l.id === id);
    setLeaves(leaves.filter((l) => l.id !== id));
    onToast({ title: 'Congé refusé', description: `La demande de ${lv.name} a été refusée.`, variant: 'destructive' });
  };

  const timeline = [
    { id: 1, icon: 'briefcase', title: 'Nouvelle candidature', sub: 'Développeur Full-Stack — Oumar Kane', time: 'Il y a 12min' },
    { id: 2, icon: 'user-check', title: 'Onboarding validé', sub: 'Marie Ndoye a terminé son parcours', time: 'Il y a 2h' },
    { id: 3, icon: 'sparkles', title: 'Analyse IA mise à jour', sub: '40+ signaux faibles ré-évalués', time: 'Il y a 3h' },
    { id: 4, icon: 'file-text', title: 'Document signé', sub: 'Avenant contrat — Fatou Gueye', time: 'Il y a 5h' },
    { id: 5, icon: 'trending-down', title: 'Alerte turnover', sub: 'Risque élevé détecté pour Moussa Bâ', time: 'Hier' },
  ];

  // Secondary views (short stubs — keeps click-through feeling complete)
  if (activeNav === 'employees') return <StubPage icon="users" title="Employés" subtitle="284 collaborateurs actifs — RH / Admin" />;
  if (activeNav === 'leaves') return <StubPage icon="calendar" title="Congés" subtitle="3 en attente de validation" />;
  if (activeNav === 'tasks') return <StubPage icon="clipboard-list" title="Tâches" subtitle="Tableau Kanban — 42 tâches actives" />;
  if (activeNav === 'attendance') return <StubPage icon="clock" title="Présences" subtitle="Pointages · retards · télétravail" />;
  if (activeNav === 'payroll') return <StubPage icon="credit-card" title="Paie" subtitle="Bulletins — Avril 2026" />;
  if (activeNav === 'documents') return <StubPage icon="file-text" title="Documents" subtitle="Contrats, avenants, certificats" />;
  if (activeNav === 'training') return <StubPage icon="graduation-cap" title="Formations" subtitle="Catalogue · parcours · certifications" />;
  if (activeNav === 'jobs') return <StubPage icon="briefcase" title="Offres d'emploi" subtitle="8 postes ouverts · 47 candidatures" />;
  if (activeNav === 'ai-insights') return <StubPage icon="trending-down" title="Analyse Churn IA" subtitle="Machine Learning · 40+ signaux faibles" />;
  if (activeNav === 'ai-chat') return <StubPage icon="message-square" title="Chat IA" subtitle="Votre assistant RH intelligent" />;
  if (activeNav === 'voice') return <StubPage icon="mic" title="Assistant Vocal" subtitle="Interface vocale — parlez à Smart-HR" />;
  if (activeNav === 'settings') return <StubPage icon="settings" title="Paramètres" subtitle="Organisation · intégrations · API" />;
  if (activeNav === 'security') return <StubPage icon="shield" title="Sécurité" subtitle="RGPD · audit · accès" />;

  return (
    <div>
      <div className="page-head">
        <div>
          <Eyebrow>{today}</Eyebrow>
          <h1>{greeting}, {user.first_name}</h1>
          <p>Voici un résumé de l'activité RH de votre organisation</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" size="md" icon="file-text">Exporter</Button>
          <Button variant="primary" size="md" icon="plus">Nouvel employé</Button>
        </div>
      </div>

      <div className="grid-kpi">
        <KPICard title="Total Employés" value={284} icon="users" color="indigo" description="271 actifs" delta={{ dir: 'up', value: '3.2%' }} />
        <KPICard title="Congés en attente" value={leaves.length} icon="calendar" color="amber" description="À valider" />
        <KPICard title="Postes ouverts" value={8} icon="briefcase" color="emerald" description="47 candidatures" delta={{ dir: 'up', value: '2' }} />
        <KPICard title="Risque élevé" value={6} icon="alert-triangle" color="rose" description="À surveiller" delta={{ dir: 'down', value: '8%' }} />
      </div>

      <div className="grid-quick">
        <QuickAction icon="users" label="Gérer les employés" onClick={() => onNavigate('employees')} />
        <QuickAction icon="bar-chart-3" label="Analyse Churn IA" onClick={() => onNavigate('ai-insights')} />
        <QuickAction icon="briefcase" label="Recrutement" onClick={() => onNavigate('jobs')} />
        <QuickAction icon="sparkles" label="Chat IA" onClick={() => onNavigate('ai-chat')} />
      </div>

      <div className="grid-main">
        <RetentionChart />
        <Card>
          <CardHead icon="activity" title="Risque de turnover"
            action={<Badge variant="outline" icon="activity">Détails</Badge>} />
          <CardBody style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ChurnGauge value={6} total={284} />
            <RiskDistribution />
          </CardBody>
        </Card>
      </div>

      <div className="grid-bottom">
        <Card>
          <CardHead icon="alert-triangle" title="Employés à risque" subtitle="Risque de départ le plus élevé"
            action={<Button variant="ghost" size="sm" iconRight="arrow-right">Voir tout</Button>} />
          <CardBody>
            <div className="grid-atrisk">
              {employeesAtRisk.map((e) => <EmployeeRiskCard key={e.id} emp={e} />)}
            </div>
          </CardBody>
        </Card>

        <div className="grid-bottom-right">
          <Card>
            <CardHead icon="calendar" title="Congés en attente"
              action={<Badge variant="count">{leaves.length}</Badge>} />
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
                  <Icon name="calendar" size={26} /><div style={{ marginTop: 6 }}>Aucun congé en attente</div>
                </div>
              ) : leaves.slice(0, 4).map((lv) => <LeaveRow key={lv.id} leave={lv} onApprove={approve} onReject={reject} />)}
            </CardBody>
          </Card>

          <Card>
            <CardHead icon="clock" title="Activité récente" />
            <CardBody><Timeline items={timeline} /></CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StubPage({ icon, title, subtitle }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <Eyebrow>Section</Eyebrow>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <Button variant="primary" icon="plus">Nouveau</Button>
      </div>
      <Card>
        <CardBody style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: 16, background: 'hsl(0 68% 50% / .10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
            <Icon name={icon} size={28} />
          </div>
          <h3 style={{ margin: '0 0 6px' }}>{title}</h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: 13, maxWidth: 420, margin: '0 auto' }}>
            Cet écran fait partie du parcours {title.toLowerCase()}. Dans le produit réel, il affiche la liste, les filtres et les détails associés. Revenez au tableau de bord pour la démo principale.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

Object.assign(window, { LoginPage, HRDashboardPage, DEMO_ACCOUNTS, StubPage });
