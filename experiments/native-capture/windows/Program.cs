using System;
using System.Collections.Generic;
using System.Text;
using System.Web.Script.Serialization;

internal static class Program
{
    private static readonly object OutputLock = new object();
    private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 2097152 };
    private static void Emit(object response)
    {
        lock (OutputLock) Console.WriteLine(Json.Serialize(response));
    }

    [STAThread]
    private static void Main(string[] args)
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        if (args.Length > 0 && args[0] == "--fixture") { Fixture.Run(args); return; }
        using (var hook = new KeyboardHook(Emit))
        {
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                string id = "invalid";
                Dictionary<string, object> result;
                try
                {
                    if (line.Length > 4096) throw new ArgumentException();
                    var request = Json.Deserialize<Dictionary<string, object>>(line);
                    id = (string)request["id"];
                    if (id.Length > 128 || Convert.ToInt32(request["v"]) != 1) throw new ArgumentException();
                    string command = (string)request["command"];
                    if (command == "stop") { Emit(new { v = 1, id = id, status = "ok" }); break; }
                    if (command == "capabilities")
                        result = new Dictionary<string, object> { { "status", "ok" }, { "platform", "win32" },
                            { "selection", "UIAutomation.TextPattern" }, { "clipboardFallback", false },
                            { "hook", "WH_KEYBOARD_LL" }, { "inputMonitoring", false },
                            { "runtime", Environment.Version.ToString() } };
                    else if (command == "capture")
                        result = Capture.Read(request.ContainsKey("expectedPid") ? Convert.ToInt32(request["expectedPid"]) : 0,
                            request.ContainsKey("includeText") && Convert.ToBoolean(request["includeText"]));
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
                Emit(result);
            }
        }
    }
}
