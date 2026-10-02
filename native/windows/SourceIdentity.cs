using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Text.RegularExpressions;

internal sealed class SourceIdentity
{
    internal IntPtr Window;
    internal uint Pid;
    internal long Started;
    internal string Token;
    internal object Source;
    private static readonly Dictionary<string, SourceIdentity> Identities = new Dictionary<string, SourceIdentity>();
    private static readonly Queue<string> Order = new Queue<string>();

    internal static SourceIdentity Record()
    {
        var window = NativeMethods.GetForegroundWindow();
        uint pid;
        NativeMethods.GetWindowThreadProcessId(window, out pid);
        if (window == IntPtr.Zero || pid == 0 || pid > Int32.MaxValue) return null;
        try { return RecordProcess(window, pid); }
        catch (ArgumentException) { return null; }
        catch (InvalidOperationException) { return null; }
        catch (Win32Exception error)
        {
            if (error.NativeErrorCode == 5) throw new UnauthorizedAccessException();
            return null;
        }
    }

    private static SourceIdentity RecordProcess(IntPtr window, uint pid)
    {
        using (var process = Process.GetProcessById((int)pid))
        {
            var identity = new SourceIdentity { Window = window, Pid = pid,
                Started = process.StartTime.ToUniversalTime().Ticks, Token = Guid.NewGuid().ToString("N") };
            try
            {
                var name = process.ProcessName;
                var basename = ProcessAccess.ImageBasename(pid, identity.Started);
                if (basename != null && Regex.IsMatch(name, @"\A[\p{L}\p{N}._ -]{1,255}\z"))
                    identity.Source = new { pid = pid, name = name, id = basename };
            }
            catch (Exception) { identity.Source = null; }
            if (!identity.Valid(true)) return null;
            Identities.Add(identity.Token, identity);
            Order.Enqueue(identity.Token);
            while (Order.Count > 32) Identities.Remove(Order.Dequeue());
            return identity;
        }
    }

    internal static SourceIdentity Resolve(string token)
    {
        SourceIdentity identity;
        return token != null && Identities.TryGetValue(token, out identity) ? identity : null;
    }

    internal bool Valid(bool foreground)
    {
        try
        {
            uint currentPid;
            NativeMethods.GetWindowThreadProcessId(Window, out currentPid);
            if (!NativeMethods.IsWindow(Window) || currentPid != Pid) return false;
            using (var process = Process.GetProcessById((int)Pid))
                if (process.HasExited || process.StartTime.ToUniversalTime().Ticks != Started) return false;
            return !foreground || NativeMethods.GetForegroundWindow() == Window;
        }
        catch (Exception) { return false; }
    }

    internal Dictionary<string, object> Result(string status)
    {
        return new Dictionary<string, object> { { "status", status }, { "identity", Token }, { "source", Source } };
    }

    internal object Bounds()
    {
        NativeMethods.Rectangle bounds;
        // DWMWA_EXTENDED_FRAME_BOUNDS is in physical screen coordinates, not DPI-virtualized.
        if (!Valid(true) || NativeMethods.DwmGetWindowAttribute(Window, 9, out bounds, 16) != 0) return null;
        long width = (long)bounds.Right - bounds.Left, height = (long)bounds.Bottom - bounds.Top;
        if (width <= 0 || height <= 0 || width > Int32.MaxValue || height > Int32.MaxValue) return null;
        return new { x = bounds.Left, y = bounds.Top, width = (int)width, height = (int)height };
    }
}
