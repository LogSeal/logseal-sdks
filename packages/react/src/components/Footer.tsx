import type { FooterProps } from '../types.js';

export function Footer({ className }: FooterProps) {
  return (
    <div className={`logseal-footer ${className || ''}`}>
      <span className="logseal-footer__text">
        Powered by <strong>LogSeal</strong>
      </span>
    </div>
  );
}
