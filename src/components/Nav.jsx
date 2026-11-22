import { Icon, Logo } from './ui.jsx';

const LINKS = [
  { id: 'home', href: '#/', icon: 'home', label: 'Home' },
  { id: 'invoices', href: '#/invoices', icon: 'invoice', label: 'Invoices' },
  { id: 'new' },
  { id: 'clients', href: '#/clients', icon: 'users', label: 'Clients' },
  { id: 'settings', href: '#/settings', icon: 'settings', label: 'Settings' },
];

export default function Nav({ active, onCreate }) {
  return (
    <nav className="nav no-print" aria-label="Main">
      <a href="#/" className="nav-brand" aria-label="KovaBill home">
        <Logo tile={false} tone="dark" size={40} />
      </a>
      <ul>
        {LINKS.map((l) =>
          l.id === 'new' ? (
            <li key="new" className="nav-fab-wrap">
              <button className="nav-fab" onClick={onCreate} title="New invoice (N)">
                <Icon name="plus" size={24} />
                <span className="sr-only">New invoice</span>
              </button>
            </li>
          ) : (
            <li key={l.id}>
              <a href={l.href} className="nav-link" aria-current={active === l.id ? 'page' : undefined}>
                <Icon name={l.icon} size={22} strokeWidth={active === l.id ? 2.2 : 1.7} />
                <span className="nav-label">{l.label}</span>
              </a>
            </li>
          )
        )}
      </ul>
    </nav>
  );
}
