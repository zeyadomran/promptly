using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

internal sealed class KeyboardHook : IDisposable
{
    private readonly Action<object> emit;
    private readonly HashSet<int> held = new HashSet<int>();
    private readonly NativeMethods.HookCallback callback;
    private IntPtr handle;
    private uint threadId;
    internal KeyboardHook(Action<object> emit) { this.emit = emit; callback = OnKey; }

    internal bool Start()
    {
        if (handle != IntPtr.Zero) return true;
        var ready = new ManualResetEvent(false);
        var thread = new Thread(delegate()
        {
            threadId = NativeMethods.GetCurrentThreadId();
            // Ensure the thread message queue exists before acknowledging startup.
            using (var dispatcher = new Control())
            {
                var unused = dispatcher.Handle;
                handle = NativeMethods.SetWindowsHookEx(13, callback, NativeMethods.GetModuleHandle(null), 0);
                ready.Set();
                if (handle != IntPtr.Zero) Application.Run();
                if (handle != IntPtr.Zero) NativeMethods.UnhookWindowsHookEx(handle);
                handle = IntPtr.Zero;
            }
        });
        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        ready.WaitOne(2000);
        return handle != IntPtr.Zero;
    }

    private IntPtr OnKey(int code, IntPtr message, IntPtr data)
    {
        if (code >= 0)
        {
            int key = Marshal.ReadInt32(data);
            // Ignore injected events; no key names/characters are emitted for normal keys.
            int flags = Marshal.ReadInt32(data, 8);
            if ((flags & 0x10) == 0)
            {
                bool down = message.ToInt64() == 0x100 || message.ToInt64() == 0x104;
                bool repeat = down && !held.Add(key);
                if (!down) held.Remove(key);
                string modifier = key == 0xA0 || key == 0xA1 ? "shift" :
                    key == 0xA2 || key == 0xA3 ? "control" :
                    key == 0xA4 || key == 0xA5 ? "alt" :
                    key == 0x5B || key == 0x5C ? "meta" : "other";
                emit(new { v = 1, type = "key", modifier = modifier, down = down,
                    repeat = repeat, timestampMs = (double)Environment.TickCount });
            }
        }
        return NativeMethods.CallNextHookEx(handle, code, message, data);
    }

    public void Dispose()
    {
        if (threadId != 0) NativeMethods.PostThreadMessage(threadId, 0x12, IntPtr.Zero, IntPtr.Zero);
    }
}
