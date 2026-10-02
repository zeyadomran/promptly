using System;
using System.Runtime.InteropServices;

internal static class ProcessAccess
{
    [DllImport("kernel32.dll")] private static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentProcessId();
    [DllImport("kernel32.dll")] private static extern bool GetProcessTimes(IntPtr process, out long created, out long exited, out long kernel, out long user);
    [DllImport("advapi32.dll")] private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll")] private static extern bool GetTokenInformation(IntPtr token, int type, IntPtr buffer, int size, out int returned);
    [DllImport("advapi32.dll")] private static extern bool IsValidSid(IntPtr sid);
    [DllImport("advapi32.dll")] private static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
    [DllImport("advapi32.dll")] private static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);
    internal static readonly int? OwnIntegrity = ReadIntegrity(GetCurrentProcessId(), null);

    internal static bool Allows(int? caller, int? target)
    {
        return caller.HasValue && target.HasValue && caller.Value >= 0 && target.Value >= 0 && target.Value <= caller.Value;
    }

    internal static bool CanRead(uint pid, long started, out int? targetIntegrity)
    {
        targetIntegrity = ReadIntegrity(pid, started);
        return Allows(OwnIntegrity, targetIntegrity);
    }

    internal static int? ReadIntegrity(uint pid, long? expectedStarted)
    {
        // PROCESS_QUERY_LIMITED_INFORMATION and TOKEN_QUERY; never request elevation/UIAccess.
        var process = OpenProcess(0x1000, false, pid);
        if (process == IntPtr.Zero) return null;
        IntPtr token = IntPtr.Zero;
        IntPtr buffer = IntPtr.Zero;
        try
        {
            if (expectedStarted.HasValue)
            {
                long created, exited, kernel, user;
                if (!GetProcessTimes(process, out created, out exited, out kernel, out user) ||
                    DateTime.FromFileTimeUtc(created).Ticks != expectedStarted.Value) return null;
            }
            if (!OpenProcessToken(process, 8, out token)) return null;
            int size;
            GetTokenInformation(token, 25, IntPtr.Zero, 0, out size);
            if (size < IntPtr.Size + 4 || size > 4096) return null;
            buffer = Marshal.AllocHGlobal(size);
            if (!GetTokenInformation(token, 25, buffer, size, out size)) return null;
            var sid = Marshal.ReadIntPtr(buffer);
            if (!IsValidSid(sid)) return null;
            int count = Marshal.ReadByte(GetSidSubAuthorityCount(sid));
            if (count < 1 || count > 15) return null;
            int level = Marshal.ReadInt32(GetSidSubAuthority(sid, (uint)(count - 1)));
            return level >= 0 ? (int?)level : null;
        }
        catch (Exception) { return null; }
        finally
        {
            if (buffer != IntPtr.Zero) Marshal.FreeHGlobal(buffer);
            if (token != IntPtr.Zero) CloseHandle(token);
            CloseHandle(process);
        }
    }
}
