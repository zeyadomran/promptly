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
      <button
        type="button"
        className="confirmation-open"
        aria-label={`${confirmation.status === 'saved' ? 'Saved to Promptly' : 'Already saved'}. Open Promptly.`}
        aria-describedby={`capture-preview-${String(confirmation.version)}`}
        title="Open Promptly"
        disabled={confirmation.phase !== 'visible'}
        onClick={() => {
          window.promptlyConfirmation.activate(confirmation.version);
        }}
      >
        <img className="confirmation-logo logo-light" src={logo} alt="" width="20" height="20" />
        <img className="confirmation-logo logo-dark" src={darkLogo} alt="" width="20" height="20" />
        <span className="confirmation-content">
          <span className="confirmation-heading">
            <strong>
              {confirmation.status === 'saved' ? 'Saved to Promptly' : 'Already saved'}
            </strong>
            <span className="confirmation-time">now</span>
          </span>
          <span
            className="confirmation-preview"
            id={`capture-preview-${String(confirmation.version)}`}
          >
            {confirmation.preview}
          </span>
        </span>
      </button>
    </section>
  );
}
