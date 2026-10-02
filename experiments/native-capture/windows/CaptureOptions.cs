using System;
using System.Collections.Generic;

internal sealed class CaptureOptions
{
    internal int ExpectedPid;
    internal bool IncludeText;

    internal static CaptureOptions Parse(Dictionary<string, object> request)
    {
        var options = new CaptureOptions();
        object value;
        if (request.TryGetValue("expectedPid", out value))
        {
            // No coercion: null, booleans, strings, decimals and oversized integers fail.
            if (!(value is int) || (int)value < 1) throw new ArgumentException();
            options.ExpectedPid = (int)value;
        }
        if (request.TryGetValue("includeText", out value))
        {
            if (!(value is bool)) throw new ArgumentException();
            options.IncludeText = (bool)value;
        }
        return options;
    }
}
