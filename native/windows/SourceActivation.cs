using System;
using System.Diagnostics;
using System.Threading;

internal static class SourceActivation
{
    internal static string Validate(SourceIdentity identity)
    {
        if (identity == null || !identity.Valid(false)) return "foregroundChanged";
        int? targetIntegrity;
        return ProcessAccess.CanRead(identity.Pid, identity.Started, out targetIntegrity)
            ? "ok" : "permissionDenied";
    }

    internal static string Activate(SourceIdentity identity)
    {
        string status = Validate(identity);
        if (status != "ok") return status;
        if (NativeMethods.IsIconic(identity.Window))
        {
            if (!NativeMethods.ShowWindowAsync(identity.Window, 9)) return "activationDenied";
            var timer = Stopwatch.StartNew();
            while (NativeMethods.IsIconic(identity.Window) && timer.ElapsedMilliseconds < 60)
                Thread.Sleep(1);
        }
        status = Validate(identity);
        if (status != "ok") return status;
        return !NativeMethods.IsIconic(identity.Window) &&
            NativeMethods.SetForegroundWindow(identity.Window) && identity.Valid(true) &&
            !NativeMethods.IsIconic(identity.Window) ? "ok" : "activationDenied";
    }
}
