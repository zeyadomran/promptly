using System;
using System.Threading;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Automation.Peers;
using System.Windows.Automation.Provider;
using System.Windows.Interop;

internal sealed class SelectionPeer : FrameworkElementAutomationPeer, ITextProvider
{
    private readonly SelectionControl Control;
    internal SelectionPeer(SelectionControl control) : base(control) { Control = control; }
    protected override string GetClassNameCore() { return "PromptlySelectionFixture"; }
    protected override AutomationControlType GetAutomationControlTypeCore() { return AutomationControlType.Edit; }
    protected override bool IsPasswordCore() { return Control.Mode == "password"; }
    public override object GetPattern(PatternInterface pattern)
    {
        return pattern == PatternInterface.Text && Control.Mode != "unsupported" ? this : base.GetPattern(pattern);
    }
    public ITextRangeProvider[] GetSelection()
    {
        if (Control.Mode == "denied") throw new UnauthorizedAccessException();
        if (Control.Mode == "error") throw new InvalidOperationException("Owned fixture provider failure");
        if (Control.Mode == "slow") Thread.Sleep(10000);
        if (Control.Mode == "changed")
        {
            Control.RaceWindow.Activate();
            Fixture.SetForegroundWindow(new WindowInteropHelper(Control.RaceWindow).Handle);
        }
        if (Control.Mode == "empty") return new[] { new TextRange("") };
        if (Control.Mode == "disjoint") return new[] { new TextRange("first 雪"), new TextRange("🙂\r\nsecond") };
        if (Control.Mode == "oversized") return new[] { new TextRange(new string('x', 1048577)) };
        if (Control.Mode == "max") return new[] { new TextRange(new string('\u0001', 1048576)) };
        return new[] { new TextRange("  Promptly 雪🙂\r\n\"fixture\"\tend  ") };
    }
    public ITextRangeProvider DocumentRange { get { throw new NotSupportedException(); } }
    public SupportedTextSelection SupportedTextSelection { get { return SupportedTextSelection.Multiple; } }
    public ITextRangeProvider[] GetVisibleRanges() { throw new NotSupportedException(); }
    public ITextRangeProvider RangeFromChild(IRawElementProviderSimple child) { throw new NotSupportedException(); }
    public ITextRangeProvider RangeFromPoint(Point point) { throw new NotSupportedException(); }
}
