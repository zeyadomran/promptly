export function GuideStep() {
  return (
    <div className="onboarding-step-body onboarding-guide">
      <h1 tabIndex={-1}>
        Three steps.
        <br />
        <span>About a minute.</span>
      </h1>
      <ol>
        <li>
          <span>01</span>
          <strong>Pick your shortcut</strong>
          <p>Double-tap Shift, or any combination.</p>
        </li>
        <li>
          <span>02</span>
          <strong>Save your first snippet</strong>
          <p>Select a sample prompt and capture it.</p>
        </li>
        <li>
          <span>03</span>
          <strong>Make it yours</strong>
          <p>Theme, startup and window size.</p>
        </li>
      </ol>
    </div>
  );
}
