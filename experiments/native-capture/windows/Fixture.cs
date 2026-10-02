using System;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Interop;
using System.Windows.Threading;

internal static class Fixture
{
    internal static void Run(string[] args)
    {
        FixtureDiagnostics.Stage("fixtureEntered");
        var app = new Application();
        FixtureDiagnostics.Stage("applicationInitialized");
        var box = new RichTextBox { Document = new FlowDocument(new Paragraph(new Run("Promptly fixture selection"))) };
        var window = new Window { Title = "Promptly controlled native fixture", Width = 420, Height = 160, Content = box };
        if (args.Length > 1 && args[1] == "password") window.Content = new PasswordBox { Password = "fixture" };
        FixtureDiagnostics.Stage("uiInitialized");
        window.SourceInitialized += delegate { FixtureDiagnostics.Stage("sourceInitialized"); };
        window.ContentRendered += delegate { FixtureDiagnostics.Stage("shown"); };
        app.DispatcherUnhandledException += delegate(object sender, DispatcherUnhandledExceptionEventArgs error)
        { FixtureDiagnostics.Stage("failed", error.Exception.HResult); };
        window.Loaded += delegate
        {
            FixtureDiagnostics.Stage("loaded");
            if (args.Length < 2 || args[1] != "empty") box.SelectAll();
            ((Control)window.Content).Focus();
            NativeMethods.SetForegroundWindow(new WindowInteropHelper(window).Handle);
            FixtureDiagnostics.Stage("beforeReadiness");
            Console.WriteLine("{\"fixturePid\":" + Process.GetCurrentProcess().Id + "}");
            Console.Out.Flush();
            FixtureDiagnostics.Stage("readinessWritten");
            // Avoid a stranded fixture if its test driver crashes.
            var timeout = new DispatcherTimer { Interval = TimeSpan.FromSeconds(30) };
            timeout.Tick += delegate { window.Close(); };
            timeout.Start();
            FixtureDiagnostics.Stage("timerStarted");
        };
        FixtureDiagnostics.Stage("runEntered");
        app.Run(window);
        FixtureDiagnostics.Stage("runReturned");
    }
}
