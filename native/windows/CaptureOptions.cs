using System;
using System.Collections.Generic;

internal sealed class CaptureOptions
{
    internal int ExpectedPid;
    internal bool IncludeText;
    internal string Identity;

    internal static CaptureOptions Parse(Dictionary<string, object> request)
    {
        var options = new CaptureOptions();
        object value;
        if (request.TryGetValue("expectedPid", out value))
        {
            if (!(value is int) || (int)value < 1) throw new ArgumentException();
            options.ExpectedPid = (int)value;
        }
        if (request.TryGetValue("includeText", out value))
        {
            if (!(value is bool)) throw new ArgumentException();
            options.IncludeText = (bool)value;
        }
        if (request.TryGetValue("identity", out value))
        {
            options.Identity = value as string;
            if (options.Identity == null || options.Identity.Length != 32) throw new ArgumentException();
        }
        return options;
    }
}
