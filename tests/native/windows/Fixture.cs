using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Automation.Peers;
using System.Windows.Interop;
using System.Windows.Threading;

internal sealed class SelectionControl : Control
{
    internal string Mode;
    internal Window Window;
    protected override AutomationPeer OnCreateAutomationPeer() { return new SelectionPeer(this); }
}

internal static class Fixture
{
    [DllImport("user32.dll")] internal static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] internal static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [STAThread]
    private static void Main(string[] args)
    {
        var mode = args.Length == 0 ? "selected" : args[0];
        var app = new Application();
        var window = new Window { Title = "Promptly owned production fixture", Width = 500, Height = 180 };
        var control = new SelectionControl { Mode = mode, Window = window, Focusable = true };
        window.Content = control;
        window.Loaded += delegate
        {
            window.Activate();
            control.Focus();
            SetForegroundWindow(new WindowInteropHelper(window).Handle);
            var level = ProcessAccess.ReadIntegrity((uint)Process.GetCurrentProcess().Id, null);
            Console.WriteLine("{\"fixturePid\":" + Process.GetCurrentProcess().Id + ",\"integrityLevel\":" +
                (level.HasValue ? level.Value.ToString() : "null") + "}");
            var timeout = new DispatcherTimer { Interval = TimeSpan.FromSeconds(60) };
            timeout.Tick += delegate { app.Shutdown(); };
            timeout.Start();
        };
        app.Run(window);
    }
}
