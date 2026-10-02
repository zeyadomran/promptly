using System;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Automation.Peers;
using System.Windows.Automation.Provider;

internal sealed class SelectionPeer : FrameworkElementAutomationPeer, ITextProvider
{
    private readonly SelectionControl Control;
    internal SelectionPeer(SelectionControl control) : base(control) { Control = control; }
    protected override string GetClassNameCore() { return "PromptlySelectionFixture"; }
    protected override AutomationControlType GetAutomationControlTypeCore() { return AutomationControlType.Edit; }
    protected override bool IsPasswordCore() { return false; }
    public override object GetPattern(PatternInterface pattern)
    {
        return pattern == PatternInterface.Text ? this : base.GetPattern(pattern);
    }
    public ITextRangeProvider[] GetSelection()
    {
        return new[] { new TextRange("  Promptly 雪🙂\r\n\"fixture\"\tend  ") };
    }
    public ITextRangeProvider DocumentRange { get { throw new NotSupportedException(); } }
    public SupportedTextSelection SupportedTextSelection { get { return SupportedTextSelection.Multiple; } }
    public ITextRangeProvider[] GetVisibleRanges() { throw new NotSupportedException(); }
    public ITextRangeProvider RangeFromChild(IRawElementProviderSimple child) { throw new NotSupportedException(); }
    public ITextRangeProvider RangeFromPoint(Point point) { throw new NotSupportedException(); }
}
