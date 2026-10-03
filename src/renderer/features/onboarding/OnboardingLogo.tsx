export function OnboardingLogo() {
  return (
    <svg
      className="onboarding-logo"
      width="64"
      height="64"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Promptly"
    >
      <rect width="64" height="64" rx="15" fill="#09090b" />
      <rect
        className="onboarding-logo-first"
        x="13"
        y="16"
        width="18"
        height="24"
        rx="5"
        fill="#71717a"
      />
      <rect
        className="onboarding-logo-second"
        x="34"
        y="22"
        width="18"
        height="24"
        rx="5"
        fill="#ecc237"
      />
    </svg>
  );
}
