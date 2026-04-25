/* ═══════════════════════════════════════
   App shell: mounts Login or Dashboard, handles toast + nav state
   ═══════════════════════════════════════ */

function Toasts({ items, onDismiss }) {
  React.useEffect(() => {
    items.forEach((t) => {
      if (!t.scheduled) {
        t.scheduled = true;
        setTimeout(() => onDismiss(t.id), 3800);
      }
    });
  }, [items]);
  return (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.variant === 'destructive' ? 'destructive' : ''}`}>
          <Icon name={t.variant === 'destructive' ? 'x-circle' : 'check-circle-2'} className="toast-ico" size={18} />
          <div>
            <div className="toast-title">{t.title}</div>
            {t.description && <div className="toast-desc">{t.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

const INITIAL_LEAVES = [
  { id: 1, name: 'Amadou Sow', type: 'vacation', date: '10 juin — 17 juin' },
  { id: 2, name: 'Fatou Ndiaye', type: 'sick', date: '4 juin' },
  { id: 3, name: 'Aïssa Diop', type: 'maternity', date: '1 sept — 1 déc' },
];

function App() {
  const [user, setUser] = React.useState(null);
  const [activeNav, setActiveNav] = React.useState('dashboard');
  const [toasts, setToasts] = React.useState([]);
  const [leaves, setLeaves] = React.useState(INITIAL_LEAVES);
  const toastId = React.useRef(1);

  const pushToast = (t) => setToasts((prev) => [...prev, { ...t, id: toastId.current++ }]);
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleLogin = (u) => {
    setUser(u);
    pushToast({ title: 'Connexion réussie', description: `Bienvenue sur Smart-HR, ${u.first_name} !`, variant: 'success' });
  };

  const handleNav = (key) => {
    if (key === 'logout') {
      setUser(null); setActiveNav('dashboard');
      pushToast({ title: 'Déconnexion', description: 'À bientôt !', variant: 'success' });
    } else {
      setActiveNav(key);
    }
  };

  // Re-init Lucide icons whenever view changes
  React.useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [user, activeNav, leaves]);

  if (!user) return (<><LoginPage onLogin={handleLogin} /><Toasts items={toasts} onDismiss={dismissToast} /></>);

  return (
    <div className="shell">
      <Sidebar active={activeNav} onNavigate={handleNav} user={user} />
      <div className="shell-main">
        <Topbar />
        <div className="shell-content">
          <HRDashboardPage user={user} onNavigate={setActiveNav} onToast={pushToast}
            leaves={leaves} setLeaves={setLeaves} activeNav={activeNav} />
        </div>
      </div>
      <Toasts items={toasts} onDismiss={dismissToast} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
