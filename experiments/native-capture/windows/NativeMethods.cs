using System;
using System.Runtime.InteropServices;

internal static class NativeMethods
{
    internal delegate IntPtr HookCallback(int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll")] internal static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] internal static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll")] internal static extern uint GetClipboardSequenceNumber();
    [DllImport("user32.dll")] internal static extern IntPtr GetClipboardOwner();
    [DllImport("user32.dll")] internal static extern bool OpenClipboard(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool CloseClipboard();
    [DllImport("user32.dll")] internal static extern uint EnumClipboardFormats(uint format);
    [DllImport("user32.dll")] internal static extern IntPtr SetWindowsHookEx(int type, HookCallback callback, IntPtr module, uint thread);
    [DllImport("user32.dll")] internal static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] internal static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] internal static extern IntPtr GetModuleHandle(string name);
    [DllImport("user32.dll")] internal static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] internal static extern bool UnregisterHotKey(IntPtr window, int id);
    [DllImport("user32.dll")] internal static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool PostThreadMessage(uint thread, uint message, IntPtr wparam, IntPtr lparam);
    [DllImport("kernel32.dll")] internal static extern uint GetCurrentThreadId();
}
