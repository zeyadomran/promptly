using System;
using System.Diagnostics;

internal static class AccessPolicy
{
    private static void Main()
    {
        if (!ProcessAccess.Allows(8192, 8192) || !ProcessAccess.Allows(12288, 8192) ||
            ProcessAccess.Allows(8192, 12288) || ProcessAccess.Allows(null, 8192) ||
            ProcessAccess.Allows(8192, null) || ProcessAccess.Allows(-1, 0) || ProcessAccess.Allows(0, -1))
            throw new InvalidOperationException("Relative integrity policy failed");
        using (var process = Process.GetCurrentProcess())
        {
            var started = process.StartTime.ToUniversalTime().Ticks;
            var pid = (uint)process.Id;
            var own = ProcessAccess.ReadIntegrity(pid, started);
            if (!own.HasValue || own != ProcessAccess.OwnIntegrity ||
                ProcessAccess.ReadIntegrity(pid, started + 1).HasValue ||
                ProcessAccess.ReadIntegrity(Int32.MaxValue, null).HasValue ||
                ProcessAccess.ImageBasename(pid, started) != "access-policy.exe" ||
                ProcessAccess.ImageBasename(pid, started + 1) != null ||
                ProcessAccess.ImageBasename(Int32.MaxValue, started) != null)
                throw new InvalidOperationException("Native identity/token binding failed");
            Console.WriteLine("{\"integrityLevel\":" + own.Value + ",\"policyVerified\":true,\"staleCreationRejected\":true}");
        }
    }
}
