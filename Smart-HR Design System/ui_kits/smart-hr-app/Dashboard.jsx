/* ═══════════════════════════════════════
   Dashboard-specific: KPICard, LeaveRow, EmployeeRiskCard,
   QuickAction, RetentionChart, ChurnGauge, RiskDistribution, Timeline
   ═══════════════════════════════════════ */

function KPICard({ title, value, icon, description, color = 'indigo', delta }) {
  return (
    <div className={`kpi kpi-color-${color}`}>
      <div className="kpi-head">
        <span className="kpi-label">{title}</span>
        <div className="kpi-ico"><Icon name={icon} size={17} /></div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {delta && (
          <span className={`kpi-delta ${delta.dir}`}>
            <Icon name={delta.dir === 'up' ? 'trending-up' : 'trending-down'} size={11} />
            {delta.value}
          </span>
        )}
        <span>{description}</span>
      </div>
    </div>
  );
}

const LEAVE_TYPE_EMOJI = { vacation: '🏖️', sick: '🤒', personal: '👤', maternity: '👶', other: '📋' };
const LEAVE_TYPE_LABEL = { vacation: 'Vacances', sick: 'Maladie', personal: 'Personnel', maternity: 'Maternité', other: 'Autre' };

function LeaveRow({ leave, onApprove, onReject }) {
  return (
    <div className="lv-row">
      <div className="lv-info">
        <span className="lv-emoji">{LEAVE_TYPE_EMOJI[leave.type] || '📋'}</span>
        <div style={{ minWidth: 0 }}>
          <div className="lv-name">{leave.name}</div>
          <div className="lv-meta">{LEAVE_TYPE_LABEL[leave.type]} · {leave.date}</div>
        </div>
      </div>
      <div className="lv-actions">
        <button className="lv-btn deny" onClick={() => onReject && onReject(leave.id)} title="Refuser">
          <Icon name="x" size={14} />
        </button>
        <button className="lv-btn approve" onClick={() => onApprove && onApprove(leave.id)} title="Approuver">
          <Icon name="check" size={14} />
        </button>
      </div>
    </div>
  );
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f472b6, #db2777)',
  'linear-gradient(135deg, #6366f1, #2563eb)',
  'linear-gradient(135deg, #10b981, #0d9488)',
  'linear-gradient(135deg, #f59e0b, #ea580c)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
];
const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const pickGradient = (seed) => AVATAR_GRADIENTS[seed % AVATAR_GRADIENTS.length];

function EmployeeRiskCard({ emp }) {
  return (
    <div className="emp-card">
      <div className="emp-head">
        <div className="emp-avatar" style={{ background: pickGradient(emp.id) }}>{initials(emp.name)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="emp-name">{emp.name}</div>
          <div className="emp-role">{emp.role} · {emp.department}</div>
        </div>
        <Badge variant={emp.status === 'actif' ? 'active' : 'pending'}>{emp.status}</Badge>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 6 }}>
        Risque de départ
      </div>
      <div className="emp-foot">
        <div className="emp-risk-bar"><div className="emp-risk-fill" style={{ width: `${emp.risk}%` }} /></div>
        <div className="emp-risk-val">{emp.risk}%</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name="sparkles" size={11} /> {emp.signal}
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button className="qa" onClick={onClick}>
      <Icon name={icon} size={16} />
      <span>{label}</span>
      <Icon name="chevron-right" size={14} className="qa-arrow" />
    </button>
  );
}

/* ─── Retention chart (SVG, approximates Recharts area) ─── */
function RetentionChart({ period = 'month', onPeriod }) {
  const pts = [
    { x: 0, y: 88 }, { x: 1, y: 92 }, { x: 2, y: 89 }, { x: 3, y: 94 },
    { x: 4, y: 91 }, { x: 5, y: 95 }, { x: 6, y: 93 }, { x: 7, y: 96 },
    { x: 8, y: 94 }, { x: 9, y: 97 }, { x: 10, y: 95 }, { x: 11, y: 98 },
  ];
  const labels = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const W = 560, H = 200, pl = 36, pr = 16, pt = 20, pb = 28;
  const iw = W - pl - pr, ih = H - pt - pb;
  const xFor = (i) => pl + (iw * i) / (pts.length - 1);
  const yFor = (v) => pt + ih - ((v - 80) / 20) * ih;
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(p.y)}`).join(' ');
  const areaPath = `${linePath} L${xFor(pts.length - 1)},${pt + ih} L${xFor(0)},${pt + ih} Z`;

  return (
    <Card className="chart-card">
      <div className="chart-head">
        <div className="card-head-title" style={{ padding: 0 }}>
          <div className="card-head-ico"><Icon name="bar-chart-3" size={15} /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Rétention des employés</h3>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)' }}>Taux mensuel — 12 derniers mois</p>
          </div>
        </div>
        <div className="chart-tabs">
          {['week','month','year'].map((p) => (
            <div key={p} className={`chart-tab ${p === period ? 'active' : ''}`} onClick={() => onPeriod && onPeriod(p)}>
              {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
            </div>
          ))}
        </div>
      </div>
      <div className="chart-body">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ret-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#D62828" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#D62828" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* grid */}
          {[0, .25, .5, .75, 1].map((t, i) => (
            <line key={i} x1={pl} x2={W - pr} y1={pt + ih * t} y2={pt + ih * t} stroke="hsl(34 30% 88%)" strokeDasharray="3 4" />
          ))}
          {[100, 95, 90, 85, 80].map((v, i) => (
            <text key={v} x={pl - 6} y={pt + (ih * i) / 4 + 4} textAnchor="end" fontSize="10" fill="hsl(20 10% 62%)" fontFamily="var(--font-mono)">{v}%</text>
          ))}
          <path d={areaPath} fill="url(#ret-grad)" />
          <path d={linePath} fill="none" stroke="#D62828" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={xFor(i)} cy={yFor(p.y)} r="3" fill="#fff" stroke="#D62828" strokeWidth="2" />
          ))}
          {labels.map((l, i) => (
            <text key={l} x={xFor(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="hsl(20 12% 45%)" fontWeight="600">{l}</text>
          ))}
        </svg>
      </div>
    </Card>
  );
}

/* ─── Churn gauge (SVG semicircle) ─── */
function ChurnGauge({ value = 6, total = 284 }) {
  const pct = Math.min(100, Math.round((value / total) * 100 * 4)); // exaggerate for visual; 6/284 ≈ 2% raw
  const shown = Math.min(100, pct);
  const r = 68, c = r * Math.PI;
  const offset = c - (shown / 100) * c;
  return (
    <div className="gauge-wrap">
      <div className="gauge">
        <svg viewBox="0 0 170 110" width="170" height="110">
          <defs>
            <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e86060" />
              <stop offset="100%" stopColor="#c41e1e" />
            </linearGradient>
          </defs>
          <path d="M 17 93 A 68 68 0 0 1 153 93" fill="none" stroke="hsl(36 40% 91%)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 17 93 A 68 68 0 0 1 153 93" fill="none" stroke="url(#gauge-grad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset} />
        </svg>
        <div className="gauge-val" style={{ paddingTop: 30 }}>
          <strong>{value}</strong>
          <span>Risque élevé</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', textAlign: 'center', marginTop: 2 }}>
        sur <strong style={{ color: 'var(--fg)' }}>{total}</strong> collaborateurs
      </div>
    </div>
  );
}

function RiskDistribution({ low = 76, mid = 20, high = 4 }) {
  return (
    <div className="risk-dist">
      <div className="risk-dist-head">
        <span>Distribution du risque</span>
        <span>284 employés analysés</span>
      </div>
      <div className="risk-dist-track">
        <div style={{ width: `${low}%`, background: 'hsl(160 84% 28%)' }} />
        <div style={{ width: `${mid}%`, background: 'hsl(25 95% 53%)' }} />
        <div style={{ width: `${high}%`, background: 'hsl(0 68% 50%)' }} />
      </div>
      <div className="risk-dist-legend">
        <span><span className="dot" style={{ background: 'hsl(160 84% 28%)' }} />Faible {low}%</span>
        <span><span className="dot" style={{ background: 'hsl(25 95% 53%)' }} />Modéré {mid}%</span>
        <span><span className="dot" style={{ background: 'hsl(0 68% 50%)' }} />Élevé {high}%</span>
      </div>
    </div>
  );
}

function Timeline({ items }) {
  return (
    <div className="tl">
      {items.map((it) => (
        <div key={it.id} className="tl-item">
          <div className="tl-dot"><Icon name={it.icon} size={13} /></div>
          <div className="tl-body">
            <div className="tl-title">{it.title}</div>
            <div className="tl-sub">{it.sub}</div>
            <div className="tl-time">{it.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  KPICard, LeaveRow, EmployeeRiskCard, QuickAction,
  RetentionChart, ChurnGauge, RiskDistribution, Timeline,
  LEAVE_TYPE_EMOJI, LEAVE_TYPE_LABEL, initials, pickGradient, AVATAR_GRADIENTS,
});
