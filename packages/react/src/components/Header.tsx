import type { HeaderProps } from '../types.js';

export function Header({ title, organization, className }: HeaderProps) {
  return (
    <div className={`logseal-header ${className || ''}`}>
      <h2 className="logseal-header__title">{title}</h2>
      {organization && (
        <p className="logseal-header__org">{organization}</p>
      )}
    </div>
  );
}
