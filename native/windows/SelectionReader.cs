using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using System.Windows.Automation;

internal static class SelectionReader
{
    internal static double Warmup()
    {
        var timer = Stopwatch.StartNew();
        // Initializes UIA/COM and its service without inspecting focused or selected text.
        var rootPid = AutomationElement.RootElement.Current.ProcessId;
        GC.KeepAlive(rootPid);
        return timer.Elapsed.TotalMilliseconds;
    }

    internal static Dictionary<string, object> Read(CaptureOptions options)
    {
        var timer = Stopwatch.StartNew();
        var result = Protocol.Result("providerError");
        SourceIdentity identity = null;
        try
        {
            identity = options.Identity == null ? SourceIdentity.Record() : SourceIdentity.Resolve(options.Identity);
            if (identity == null || !identity.Valid(true) ||
                (options.ExpectedPid != 0 && identity.Pid != options.ExpectedPid))
                return Protocol.Result("foregroundChanged");
            result = identity.Result("unsupported");
            int? targetIntegrity;
            bool allowed = ProcessAccess.CanRead(identity.Pid, identity.Started, out targetIntegrity);
            result["targetIntegrityLevel"] = targetIntegrity;
            if (!allowed) result["status"] = "permissionDenied";
            else
            {
                var focused = AutomationElement.FocusedElement;
                if (focused == null || focused.Current.ProcessId != identity.Pid)
                    result["status"] = "foregroundChanged";
                else if (focused.Current.IsPassword) result["status"] = "secureInput";
                else
                {
                    object provider;
                    if (focused.TryGetCurrentPattern(TextPattern.Pattern, out provider))
                    {
                        var ranges = ((TextPattern)provider).GetSelection();
                        if (ranges.Length > 4096) return Protocol.Result("selectionTooLarge");
                        var text = new StringBuilder();
                        int index = 0;
                        foreach (var range in ranges)
                        {
                            // Provider order, with a literal LF between ranges; never trim or normalize.
                            if (index++ > 0) text.Append('\n');
                            int remaining = Protocol.SelectionUnits - text.Length;
                            if (remaining < 0) return Protocol.Result("selectionTooLarge");
                            var part = range.GetText(remaining + 1);
                            if (part.Length > remaining) return Protocol.Result("selectionTooLarge");
                            text.Append(part);
                        }
                        result["status"] = text.Length == 0 ? "empty" : "ok";
                        result["characterCount"] = text.Length;
                        if (options.IncludeText && text.Length > 0) result["text"] = text.ToString();
                    }
                }
            }
        }
        catch (UnauthorizedAccessException) { result = Protocol.Result("permissionDenied"); }
        catch (ElementNotAvailableException) { result = Protocol.Result("foregroundChanged"); }
        catch (Exception) { result = Protocol.Result("providerError"); }
        if (identity != null && !identity.Valid(true)) result = Protocol.Result("foregroundChanged");
        result["elapsedMs"] = timer.Elapsed.TotalMilliseconds;
        return result;
    }
}
