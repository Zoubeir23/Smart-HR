/* ─── Lucide icon helper ─── */
/* Thin wrapper so <Icon name="users" /> works like lucide-react.
   Uses the Lucide global loaded from CDN in index.html. */

function Icon({ name, size = 16, className = '', style = {}, color }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.setAttribute('data-lucide', name);
      window.lucide.createIcons({
        attrs: { width: size, height: size, stroke: color || 'currentColor' },
        nameAttr: 'data-lucide',
      });
    }
  }, [name, size, color]);
  return <i ref={ref} data-lucide={name} className={className} style={{ width: size, height: size, display: 'inline-flex', ...style }} />;
}

Object.assign(window, { Icon });
