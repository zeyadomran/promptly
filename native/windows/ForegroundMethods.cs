using System;
using System.Runtime.InteropServices;

internal static class ForegroundMethods
{
    internal delegate void EventCallback(IntPtr hook, uint kind, IntPtr window,
        int objectId, int childId, uint eventThread, uint eventTime);
    [StructLayout(LayoutKind.Sequential)]
    internal struct Message
    {
        internal IntPtr Window;
        internal uint Kind;
        internal UIntPtr WParam;
        internal IntPtr LParam;
        internal uint Time;
        internal int X, Y;
        internal uint Private;
    }
    [DllImport("user32.dll")]
    internal static extern IntPtr SetWinEventHook(uint minimum, uint maximum, IntPtr module,
        EventCallback callback, uint processId, uint threadId, uint flags);
    [DllImport("user32.dll")] internal static extern bool UnhookWinEvent(IntPtr hook);
    [DllImport("user32.dll")]
    internal static extern int GetMessage(out Message message, IntPtr window, uint minimum, uint maximum);
    [DllImport("user32.dll")]
    internal static extern bool PeekMessage(out Message message, IntPtr window, uint minimum, uint maximum, uint remove);
    [DllImport("user32.dll")]
    internal static extern IntPtr DispatchMessage(ref Message message);
    [DllImport("user32.dll")]
    internal static extern bool PostThreadMessage(uint thread, uint message, UIntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll")] internal static extern uint GetCurrentThreadId();
}
