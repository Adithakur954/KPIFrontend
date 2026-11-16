/** Shared page title/action layout. Keep source controls in the actions slot. */
export default function PageHeading({ title, description, eyebrow, icon, actions, className = "" }) {
  const Icon = icon;
  return (
    <header className={`portal-page-heading ${className}`}>
      <div className="portal-heading-inner">
        <div className="portal-heading-copy">
          {Icon && <div className="portal-heading-icon"><Icon size={24} aria-hidden="true" /></div>}
          <div>{eyebrow && <p className="portal-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="portal-heading-description">{description}</p>}</div>
        </div>
        {actions && <div className="portal-heading-actions">{actions}</div>}
      </div>
    </header>
  );
}
