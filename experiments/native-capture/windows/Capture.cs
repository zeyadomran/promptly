using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Windows.Automation;

internal static class Capture
{
    internal static Dictionary<string, object> Result(string status)
    {
        return new Dictionary<string, object> { { "status", status } };
    }

    internal static Dictionary<string, object> Read(int expectedPid, bool includeText)
    {
        var timer = Stopwatch.StartNew();
        var window = NativeMethods.GetForegroundWindow();
        uint pid;
        NativeMethods.GetWindowThreadProcessId(window, out pid);
        var result = Result("unsupported");
        try
        {
            if (window == IntPtr.Zero || (expectedPid != 0 && pid != expectedPid))
                return Result("foregroundChanged");
            var process = Process.GetProcessById((int)pid);
            result["source"] = new { pid = pid, name = process.ProcessName, id = process.ProcessName + ".exe" };
            var focused = AutomationElement.FocusedElement;
            if (focused == null || focused.Current.ProcessId != pid)
                result["status"] = "foregroundChanged";
            else if (focused.Current.IsPassword)
                result["status"] = "secureInput";
            else
            {
                object provider;
                if (focused.TryGetCurrentPattern(TextPattern.Pattern, out provider))
                {
                    var ranges = ((TextPattern)provider).GetSelection();
                    var parts = new List<string>();
                    foreach (var range in ranges)
                    {
                        // One extra character distinguishes a full selection from truncation.
                        var part = range.GetText(Transport.SelectionUnits + 1);
                        if (part.Length > Transport.SelectionUnits) return Result("selectionTooLarge");
                        parts.Add(part);
                    }
                    var text = String.Join("\n", parts);
                    if (text.Length > Transport.SelectionUnits) return Result("selectionTooLarge");
                    result["status"] = String.IsNullOrWhiteSpace(text) ? "empty" : "ok";
                    result["characterCount"] = text.Length;
                    if (includeText && (string)result["status"] == "ok") result["text"] = text;
                }
            }
            if (NativeMethods.GetForegroundWindow() != window)
            {
                result.Remove("text");
                result["status"] = "foregroundChanged";
            }
        }
        catch (UnauthorizedAccessException) { result = Result("permissionDenied"); }
        catch (ElementNotAvailableException) { result = Result("foregroundChanged"); }
        catch (Exception) { result = Result("providerError"); }
        result["elapsedMs"] = timer.Elapsed.TotalMilliseconds;
        return result;
    }

    internal static Dictionary<string, object> ClipboardMetadata()
    {
        var before = NativeMethods.GetClipboardSequenceNumber();
        var owner = NativeMethods.GetClipboardOwner();
        uint ownerPid;
        NativeMethods.GetWindowThreadProcessId(owner, out ownerPid);
        var result = Result("clipboardBusy");
        if (!NativeMethods.OpenClipboard(IntPtr.Zero)) return result;
        try
        {
            var formats = new List<uint>();
            uint format = 0;
            while ((format = NativeMethods.EnumClipboardFormats(format)) != 0) formats.Add(format);
            result = Result("ok");
            result["formats"] = formats;
            result["ownerPid"] = ownerPid;
            result["counterBefore"] = before;
            result["counterAfter"] = NativeMethods.GetClipboardSequenceNumber();
            result["faithfulSnapshot"] = false;
        }
        finally { NativeMethods.CloseClipboard(); }
        return result;
    }
}
