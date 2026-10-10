using System;
using System.Collections.Generic;

internal sealed class ForegroundSession : IDisposable
{
    private uint ownPid;
    private ForegroundTracker tracker;

    internal uint Configure(Dictionary<string, object> request, bool required = false)
    {
        object value;
        if (!request.TryGetValue("excludePid", out value))
        {
            if (required) throw new ArgumentException();
            return 0;
        }
        if (!(value is int) || (int)value < 1) throw new ArgumentException();
        uint pid = (uint)(int)value;
        if (tracker != null && ownPid != pid) throw new ArgumentException();
        if (tracker == null) { ownPid = pid; tracker = new ForegroundTracker(pid); }
        return pid;
    }

    internal Dictionary<string, object> Foreground(Dictionary<string, object> request)
    {
        uint pid = Configure(request);
        var window = NativeMethods.GetForegroundWindow();
        uint foregroundPid;
        NativeMethods.GetWindowThreadProcessId(window, out foregroundPid);
        var identity = SourceIdentity.RecordWindow(window, pid, true);
        var result = identity == null ? Protocol.Result("foregroundChanged") : identity.Result("ok");
        if (identity == null && pid != 0 && foregroundPid == pid) result["ownForeground"] = true;
        if (identity != null) result["bounds"] = identity.Bounds();
        if (identity != null) result["windowHandle"] = identity.Window.ToInt64().ToString("x16");
        return result;
    }

    internal Dictionary<string, object> ActivationTarget(Dictionary<string, object> request)
    {
        uint pid = Configure(request, true);
        var identity = tracker.Read(pid);
        return identity == null ? Protocol.Result("foregroundChanged") : identity.Result("ok");
    }

    public void Dispose() { if (tracker != null) tracker.Dispose(); }
}
