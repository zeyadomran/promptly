import { Info, TriangleAlert } from 'lucide-react';

import type { CaptureToast } from '../../shared/contracts/capture-toast';
import logo from '../assets/brand/logo.svg';
import darkLogo from '../assets/brand/logo-on-dark.svg';

export function CaptureToastContent({ confirmation }: { confirmation: CaptureToast }) {
  const title =
    confirmation.status === 'failed'
      ? 'Capture not confirmed'
      : confirmation.status === 'saved'
        ? 'Saved to Promptly'
        : 'Already saved';

  return (
    <section
      className="confirmation"
      data-phase={confirmation.phase}
      data-status={confirmation.status}
      role="status"
      aria-live="polite"
      key={confirmation.version}
    >
      <button
        type="button"
        className="confirmation-open"
        aria-label={`${title}. Open Promptly.`}
        aria-describedby={`capture-preview-${String(confirmation.version)}`}
        title="Open Promptly"
        disabled={confirmation.phase !== 'visible'}
        onClick={() => {
          window.promptlyConfirmation.activate(confirmation.version);
        }}
      >
        {confirmation.status === 'saved' ? (
          <>
            <img
              className="confirmation-logo logo-light"
              src={logo}
              alt=""
              width="20"
              height="20"
            />
            <img
              className="confirmation-logo logo-dark"
              src={darkLogo}
              alt=""
              width="20"
              height="20"
            />
          </>
        ) : confirmation.status === 'failed' ? (
          <TriangleAlert
            className="confirmation-status confirmation-failed"
            aria-hidden="true"
            size={16}
          />
        ) : (
          <Info className="confirmation-status" aria-hidden="true" size={16} />
        )}
        <span className="confirmation-content">
          <span className="confirmation-heading">
            <strong>{title}</strong>
            <span className="confirmation-time">now</span>
          </span>
          <span
            className="confirmation-preview"
            id={`capture-preview-${String(confirmation.version)}`}
          >
            {confirmation.status === 'duplicate'
              ? 'This exact text is in your library.'
              : confirmation.preview}
          </span>
        </span>
      </button>
    </section>
  );
}
