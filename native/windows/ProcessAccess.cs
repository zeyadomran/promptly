using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

internal static class ProcessAccess
{
    [DllImport("kernel32.dll")] private static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentProcessId();
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder name, ref int size);
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

    internal static string ImageBasename(uint pid, long started)
    {
        var process = OpenProcess(0x1000, false, pid);
        if (process == IntPtr.Zero) return null;
        try
        {
            if (!MatchesCreation(process, started)) return null;
            var path = new StringBuilder(32768);
            int size = path.Capacity;
            if (!QueryFullProcessImageName(process, 0, path, ref size)) return null;
            var basename = Path.GetFileName(path.ToString());
            return basename != "." && basename != ".." &&
                Regex.IsMatch(basename, @"\A[\p{L}\p{N}._ -]{1,255}\z") ? basename : null;
        }
        catch (Exception) { return null; }
        finally { CloseHandle(process); }
    }

    private static bool MatchesCreation(IntPtr process, long started)
    {
        long created, exited, kernel, user;
        return GetProcessTimes(process, out created, out exited, out kernel, out user) &&
            DateTime.FromFileTimeUtc(created).Ticks == started;
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
                if (!MatchesCreation(process, expectedStarted.Value)) return null;
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
