using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class Program
{
    private static readonly Stopwatch Clock = Stopwatch.StartNew();
    private static readonly EventQueue Output = new EventQueue();
    private static readonly NativeMethods.HookCallback Callback = OnKey;
    private static KeyboardEvents events;
    private static IntPtr hook;
    [STAThread] private static void Main()
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        NativeMethods.Message message;
        NativeMethods.PeekMessage(out message, IntPtr.Zero, 0, 0, 0);
        uint thread = NativeMethods.GetCurrentThreadId();
        int mask = 0;
        foreach (int key in new[] { 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C })
            if ((NativeMethods.GetAsyncKeyState(key) & 0x8000) != 0) mask |= KeyboardEvents.Bit(key);
        events = new KeyboardEvents(mask);
        hook = NativeMethods.SetWindowsHookEx(13, Callback, NativeMethods.GetModuleHandle(null), 0);
        Output.Offer("{\"kind\":\"ready\",\"installed\":" + (hook != IntPtr.Zero ? "true" : "false") + ",\"mask\":" + mask + ",\"timeMs\":" + KeyboardEvents.Number(Clock.Elapsed.TotalMilliseconds) + "}", Clock.Elapsed.TotalMilliseconds);
        new Thread(Output.Write) { IsBackground = true }.Start();
        new Thread(delegate()
        {
            try { while (Console.In.ReadLine() != null) { } } catch (Exception) { }
            NativeMethods.PostThreadMessage(thread, 0x12, UIntPtr.Zero, IntPtr.Zero);
        }) { IsBackground = true }.Start();
        try { while (NativeMethods.GetMessage(out message, IntPtr.Zero, 0, 0) > 0) { } }
        finally { if (hook != IntPtr.Zero) NativeMethods.UnhookWindowsHookEx(hook); }
        GC.KeepAlive(Callback);
    }
    private static IntPtr OnKey(int code, IntPtr message, IntPtr data)
    {
        if (code >= 0 && (message.ToInt64() == 0x100 || message.ToInt64() == 0x101 || message.ToInt64() == 0x104 || message.ToInt64() == 0x105))
        {
            bool down = message.ToInt64() == 0x100 || message.ToInt64() == 0x104;
            Output.Offer(events.Read(Marshal.ReadInt32(data), down, (Marshal.ReadInt32(data, 8) & 0x10) != 0, Clock.Elapsed.TotalMilliseconds), Clock.Elapsed.TotalMilliseconds);
        }
        return NativeMethods.CallNextHookEx(hook, code, message, data);
    }
}
