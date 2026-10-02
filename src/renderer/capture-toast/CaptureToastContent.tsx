import type { CaptureToast } from '../../shared/contracts/capture-toast';
import logo from '../assets/brand/logo.svg';
import darkLogo from '../assets/brand/logo-on-dark.svg';

export function CaptureToastContent({ confirmation }: { confirmation: CaptureToast }) {
  return (
    <section
      className="confirmation"
      data-phase={confirmation.phase}
      role="status"
      aria-live="polite"
      key={confirmation.version}
    >
      <img className="confirmation-logo logo-light" src={logo} alt="" width="20" height="20" />
      <img className="confirmation-logo logo-dark" src={darkLogo} alt="" width="20" height="20" />
      <div className="confirmation-content">
        <div className="confirmation-heading">
          <strong>{confirmation.status === 'saved' ? 'Saved to Promptly' : 'Already saved'}</strong>
          <span className="confirmation-time">now</span>
        </div>
        <p>{confirmation.preview}</p>
      </div>
    </section>
  );
}
