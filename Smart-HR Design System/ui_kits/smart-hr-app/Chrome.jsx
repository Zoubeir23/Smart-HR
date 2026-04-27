/* ═══════════════════════════════════════
   Sidebar + Topbar — app chrome
   Faithful to Frontend/src/components/layout/Sidebar.tsx
   ═══════════════════════════════════════ */

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [{ key: 'dashboard', label: 'Tableau de bord', icon: 'layout-dashboard' }],
  },
  {
    label: 'Gestion RH',
    items: [
      { key: 'employees', label: 'Employés', icon: 'users' },
      { key: 'leaves', label: 'Congés', icon: 'calendar', badge: 3 },
      { key: 'tasks', label: 'Tâches', icon: 'clipboard-list' },
      { key: 'attendance', label: 'Présences', icon: 'clock' },
      { key: 'payroll', label: 'Paie', icon: 'credit-card' },
    ],
  },
  {
    label: 'Documents & Formation',
    items: [
      { key: 'documents', label: 'Documents', icon: 'file-text' },
      { key: 'training', label: 'Formations', icon: 'graduation-cap' },
    ],
  },
  {
    label: 'Recrutement',
    items: [{ key: 'jobs', label: 'Offres d\'emploi', icon: 'briefcase' }],
  },
  {
    label: 'Intelligence IA',
    items: [
      { key: 'ai-insights', label: 'Analyse Churn', icon: 'trending-down' },
      { key: 'ai-chat', label: 'Chat IA', icon: 'message-square' },
      { key: 'voice', label: 'Assistant Vocal', icon: 'mic' },
    ],
  },
  {
    label: 'Paramètres',
    items: [
      { key: 'settings', label: 'Paramètres', icon: 'settings' },
      { key: 'security', label: 'Sécurité', icon: 'shield' },
    ],
  },
];

function Sidebar({ active = 'dashboard', onNavigate, user }) {
  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-brand-mark">
          <Icon name="sparkles" size={18} />
        </div>
        <div>
          <div className="sb-brand-name">Smart<em>-HR</em></div>
          <div className="sb-brand-sub">SIRH · IA</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2, minHeight: 0 }}>
        {NAV_GROUPS.map((group) => (
          <React.Fragment key={group.label}>
            <div className="sb-group-label">{group.label}</div>
            {group.items.map((it) => (
              <div
                key={it.key}
                className={`sb-item ${active === it.key ? 'active' : ''}`}
                onClick={() => onNavigate && onNavigate(it.key)}
              >
                <Icon name={it.icon} size={16} />
                <span>{it.label}</span>
                {it.badge ? <span className="sb-badge">{it.badge}</span> : null}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="sb-user">
        <div className="sb-avatar">{(user?.first_name || 'A')[0]}{(user?.last_name || 'D')[0]}</div>
        <div className="sb-user-meta">
          <div className="sb-user-name">{user?.first_name} {user?.last_name}</div>
          <div className="sb-user-role">{user?.roleLabel}</div>
        </div>
        <button className="tb-icon-btn" title="Déconnexion" onClick={() => onNavigate && onNavigate('logout')}>
          <Icon name="log-out" size={15} />
        </button>
      </div>
    </aside>
  );
}

function Topbar({ onSearch }) {
  return (
    <div className="tb">
      <div className="tb-search">
        <Icon name="search" size={14} />
        <input placeholder="Rechercher employés, documents, offres…" onChange={(e) => onSearch && onSearch(e.target.value)} />
      </div>
      <div className="tb-spacer" />
      <div className="tb-actions">
        <button className="tb-icon-btn" title="Assistant IA">
          <Icon name="sparkles" size={17} />
        </button>
        <button className="tb-icon-btn" title="Notifications">
          <Icon name="bell" size={17} />
          <span className="tb-notif-dot" />
        </button>
        <button className="tb-icon-btn" title="Thème">
          <Icon name="sun" size={17} />
        </button>
        <button className="tb-icon-btn" title="Paramètres">
          <Icon name="settings" size={17} />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, NAV_GROUPS });
