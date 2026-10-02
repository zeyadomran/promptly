using System;
using System.Windows.Automation;
using System.Windows.Automation.Provider;
using System.Windows.Automation.Text;

internal sealed class TextRange : ITextRangeProvider
{
    private readonly string Text;
    internal TextRange(string text) { Text = text; }
    public string GetText(int maxLength) { return maxLength < 0 ? Text : Text.Substring(0, Math.Min(maxLength, Text.Length)); }
    public ITextRangeProvider Clone() { return new TextRange(Text); }
    public bool Compare(ITextRangeProvider range) { return Object.ReferenceEquals(this, range); }
    public int CompareEndpoints(TextPatternRangeEndpoint endpoint, ITextRangeProvider range, TextPatternRangeEndpoint target) { return 0; }
    public void ExpandToEnclosingUnit(TextUnit unit) { throw new NotSupportedException(); }
    public ITextRangeProvider FindAttribute(int attribute, object value, bool backward) { throw new NotSupportedException(); }
    public ITextRangeProvider FindText(string text, bool backward, bool ignoreCase) { throw new NotSupportedException(); }
    public object GetAttributeValue(int attribute) { return AutomationElement.NotSupported; }
    public double[] GetBoundingRectangles() { return new double[0]; }
    public IRawElementProviderSimple GetEnclosingElement() { throw new NotSupportedException(); }
    public int Move(TextUnit unit, int count) { throw new NotSupportedException(); }
    public int MoveEndpointByUnit(TextPatternRangeEndpoint endpoint, TextUnit unit, int count) { throw new NotSupportedException(); }
    public void MoveEndpointByRange(TextPatternRangeEndpoint endpoint, ITextRangeProvider range, TextPatternRangeEndpoint target) { throw new NotSupportedException(); }
    public void Select() { throw new NotSupportedException(); }
    public void AddToSelection() { throw new NotSupportedException(); }
    public void RemoveFromSelection() { throw new NotSupportedException(); }
    public void ScrollIntoView(bool alignToTop) { throw new NotSupportedException(); }
    public IRawElementProviderSimple[] GetChildren() { return new IRawElementProviderSimple[0]; }
}
