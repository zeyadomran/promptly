using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

internal static class ShortcutDriver
{
    [StructLayout(LayoutKind.Sequential)] private struct Keyboard { internal ushort key; internal ushort scan; internal uint flags; internal uint time; internal UIntPtr extra; }
    [StructLayout(LayoutKind.Explicit)] private struct Payload { [FieldOffset(0)] internal Keyboard keyboard; [FieldOffset(0)] internal Mouse mouse; }
    [StructLayout(LayoutKind.Sequential)] private struct Mouse { internal int x; internal int y; internal uint data; internal uint flags; internal uint time; internal UIntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] private struct Input { internal uint type; internal Payload payload; }
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll")] private static extern uint SendInput(uint count, Input[] input, int size);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr window);
    private static Input Key(ushort key, bool up) { return new Input { type = 1, payload = new Payload { keyboard = new Keyboard { key = key, flags = up ? 2U : 0U } } }; }
    [STAThread] private static int Main(string[] arguments)
    {
        uint expected;
        long handle;
        if (arguments.Length != 3 || !uint.TryParse(arguments[0], out expected) || !Int64.TryParse(arguments[1], out handle)) return 1;
        uint owner;
        GetWindowThreadProcessId(new IntPtr(handle), out owner);
        if (owner != expected) return 2;
        ushort key = arguments[2] == "open" ? (ushort)0x79 : arguments[2] == "pin" ? (ushort)0x7A : arguments[2] == "capture" ? (ushort)0x7B : (ushort)0;
        if (key == 0) return 3;
        string result = "activationDenied";
        bool injected = false;
        using (var window = new Form { Text = "Promptly owned shortcut driver", Width = 240, Height = 100 })
        {
            window.Shown += delegate
            {
                window.BeginInvoke((Action)delegate
                {
                    window.Activate();
                    SetForegroundWindow(window.Handle);
                    var clock = Stopwatch.StartNew();
                    var timer = new Timer { Interval = 10 };
                    timer.Tick += delegate
                    {
                        uint foreground;
                        GetWindowThreadProcessId(GetForegroundWindow(), out foreground);
                        // The shortcut must work while this separately owned fixture has focus.
                        if (foreground == (uint)Process.GetCurrentProcess().Id)
                        {
                            timer.Stop(); timer.Dispose();
                            var inputs = new[] { Key(0xA2, false), Key(0xA4, false), Key(key, false), Key(key, true), Key(0xA4, true), Key(0xA2, true) };
                            uint delivered = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(Input)));
                            injected = delivered > 0;
                            result = delivered == inputs.Length ? "sent" : "inputDenied";
                            window.Close();
                        }
                        else if (clock.ElapsedMilliseconds >= 2000) { timer.Stop(); timer.Dispose(); window.Close(); }
                    };
                    timer.Start();
                });
            };
            Application.Run(window);
        }
        Console.WriteLine("{\"status\":\"" + result + "\",\"ownedForeground\":" + (result != "activationDenied" ? "true" : "false") + ",\"keysInjected\":" + (injected ? "true" : "false") + "}");
        return 0;
    }
}
