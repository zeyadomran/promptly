import type { ReactNode } from 'react';

export function ShortcutGroup({
  title,
  description,
  status,
  children
}: {
  title: string;
  description?: string;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="shortcut-group" aria-label={title}>
      <div className="shortcut-group-heading">
        <h2>{title}</h2>
        {description !== undefined && <span>{description}</span>}
        {status !== undefined && <div className="shortcut-group-status">{status}</div>}
      </div>
      <div className="settings-card shortcut-card">{children}</div>
    </section>
  );
}
