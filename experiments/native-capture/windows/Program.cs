using System;
using System.Collections.Generic;
using System.Text;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        bool ownedFixture = args.Length > 0 && args[0] == "--fixture";
        if (ownedFixture) FixtureDiagnostics.Stage("mainEntered");
        Console.OutputEncoding = new UTF8Encoding(false);
        if (ownedFixture)
        {
            try { Fixture.Run(args); }
            catch (Exception error) { FixtureDiagnostics.Stage("failed", error.HResult); Environment.ExitCode = 1; }
            return;
        }
        bool fixtures = args.Length > 0 && args[0] == "--protocol-fixtures";
        int nativeReads = 0;
        using (var hook = new KeyboardHook(Transport.Emit))
        {
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                string id = "invalid";
                Dictionary<string, object> result;
                try
                {
                    if (line.Length > 4096) throw new ArgumentException();
                    var request = Transport.Json.Deserialize<Dictionary<string, object>>(line);
                    id = (string)request["id"];
                    if (id.Length > 128 || !(request["v"] is int) || (int)request["v"] != 1) throw new ArgumentException();
                    string command = (string)request["command"];
                    if (command == "stop") { Transport.Emit(new { v = 1, id = id, status = "ok" }); break; }
                    if (command == "capabilities")
                        result = new Dictionary<string, object> { { "status", "ok" }, { "platform", "win32" },
                            { "selection", "UIAutomation.TextPattern" }, { "clipboardFallback", false },
                            { "hook", "WH_KEYBOARD_LL" }, { "inputMonitoring", false },
                            { "runtime", Environment.Version.ToString() } };
                    else if (command == "capture")
                    {
                        var options = CaptureOptions.Parse(request);
                        nativeReads++;
                        result = Capture.Read(options.ExpectedPid, options.IncludeText);
                    }
                    else if (command == "fixturePayload" && fixtures) result = Transport.Fixture(request);
                    else if (command == "fixtureStats" && fixtures)
                        result = new Dictionary<string, object> { { "status", "ok" }, { "nativeReads", nativeReads } };
                    else if (command == "fixtureOptions" && fixtures)
                    {
                        var options = CaptureOptions.Parse(request);
                        result = new Dictionary<string, object> { { "status", "ok" },
                            { "expectedPid", options.ExpectedPid }, { "includeText", options.IncludeText } };
                    }
                    else if (command == "clipboardMetadata") result = Capture.ClipboardMetadata();
                    else if (command == "fallback")
                    {
                        result = Capture.Result("unsupported");
                        result["reason"] = "faithful-all-format-snapshot-unproven";
                        result["clipboardMutated"] = false;
                        result["keysInjected"] = false;
                    }
                    else if (command == "hookStart") result = Capture.Result(hook.Start() ? "ok" : "permissionDenied");
                    else if (command == "probeAltSpace")
                    {
                        bool available = NativeMethods.RegisterHotKey(IntPtr.Zero, 7123, 1, 0x20);
                        if (available) NativeMethods.UnregisterHotKey(IntPtr.Zero, 7123);
                        result = Capture.Result(available ? "ok" : "shortcutUnavailable");
                        result["registrationOnly"] = true;
                    }
                    else result = Capture.Result("invalidRequest");
                }
                catch (Exception) { result = Capture.Result("invalidRequest"); }
                result["v"] = 1;
                result["id"] = id;
                Transport.Emit(result);
            }
        }
    }
}
