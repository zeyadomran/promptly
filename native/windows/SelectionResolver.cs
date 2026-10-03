using System;
using System.Collections.Generic;
using System.Windows.Automation;

internal static class SelectionResolver
{
    // Chromium editors can have deeply nested accessible groups. Keep ownership discovery bounded.
    private const int MaximumAncestorDepth = 64;

    internal static TextPattern Resolve(SourceIdentity identity, out AutomationElement focused, out string status)
    {
        focused = AutomationElement.FocusedElement;
        status = "unsupported";
        if (focused == null) { status = "foregroundChanged"; return null; }
        var window = AutomationElement.FromHandle(identity.Window);
        var chain = new List<AutomationElement>();
        var node = focused;
        bool owned = false;
        // Only the focus-to-window chain, never children, siblings, desktop or document text.
        for (int depth = 0; node != null && depth < MaximumAncestorDepth; depth++)
        {
            var current = node.Current;
            if (current.ProcessId != identity.Pid) { status = "foregroundChanged"; return null; }
            if (current.IsPassword) { status = "secureInput"; return null; }
            if (current.NativeWindowHandle != 0 &&
                NativeMethods.GetAncestor(new IntPtr(current.NativeWindowHandle), 2) != identity.Window)
            { status = "foregroundChanged"; return null; }
            chain.Add(node);
            if (node.Equals(window)) { owned = true; break; }
            node = TreeWalker.RawViewWalker.GetParent(node);
        }
        if (!owned || !identity.Valid(true)) return null;
        foreach (var candidate in chain)
        {
            object provider;
            if (!candidate.TryGetCurrentPattern(TextPattern.Pattern, out provider)) continue;
            var pattern = (TextPattern)provider;
            // The ancestor must identify the actual focused descendant as its text child.
            if (!candidate.Equals(focused))
            {
                try { if (pattern.RangeFromChild(focused) == null) return null; }
                catch (ArgumentException) { return null; }
                catch (NotSupportedException) { return null; }
            }
            status = "ok";
            return pattern;
        }
        return null;
    }

    internal static bool StillFocused(AutomationElement focused)
    {
        try { return focused != null && !focused.Current.IsPassword && focused.Equals(AutomationElement.FocusedElement); }
        catch (Exception) { return false; }
    }
}
