/* ═══════════════════════════════════════
   Primitive components: Button, Badge, Card, Input, Pill, Eyebrow
   ═══════════════════════════════════════ */

function Button({ variant = 'primary', size = 'md', icon, iconRight, children, onClick, disabled, type = 'button', style, title }) {
  const cls = `btn btn-${variant} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''}`;
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type} style={style} title={title}>
      {icon && <Icon name={icon} size={size === 'lg' ? 17 : 15} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 17 : 15} />}
    </button>
  );
}

function Badge({ variant = 'outline', children, icon }) {
  return (
    <span className={`badge badge-${variant}`}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

function Card({ children, className = '', onClick, style }) {
  return <div className={`card ${className}`} onClick={onClick} style={style}>{children}</div>;
}

function CardHead({ icon, title, subtitle, action }) {
  return (
    <div className="card-head">
      <div className="card-head-title">
        {icon && <div className="card-head-ico"><Icon name={icon} size={15} /></div>}
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function CardBody({ children, style }) {
  return <div className="card-body" style={style}>{children}</div>;
}

function Input({ icon, placeholder, type = 'text', value, onChange, label, rightSlot }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <div className="field-wrap">
        {icon && <Icon name={icon} size={15} className="field-ico" />}
        <input
          type={type}
          className={icon ? 'input' : 'input input-plain'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        {rightSlot}
      </div>
    </div>
  );
}

function Eyebrow({ children }) { return <span className="eyebrow">{children}</span>; }
function Pill({ icon, children }) { return <span className="pill">{icon && <Icon name={icon} size={12} />}{children}</span>; }

Object.assign(window, { Button, Badge, Card, CardHead, CardBody, Input, Eyebrow, Pill });
