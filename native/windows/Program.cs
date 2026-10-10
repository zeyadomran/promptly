using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;

internal static class Program
{
    [MTAThread]
    private static void Main()
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        var startup = Stopwatch.StartNew();
        double warmupMs = 0;
        bool warmupReady = false;
        try { warmupMs = SelectionReader.Warmup(); warmupReady = true; }
        catch (Exception) { }
        using (var input = Console.OpenStandardInput())
        {
            while (true)
            {
                string line;
                try { line = Protocol.Read(input); }
                catch (Exception) { return; }
                if (line == null) return;
                string id = "invalid";
                var result = Protocol.Result("invalidRequest");
                bool stop = false;
                try
                {
                    var request = Protocol.Parse(line);
                    id = (string)request["id"];
                    var command = (string)request["command"];
                    foreach (var key in request.Keys)
                        if (key != "v" && key != "id" && key != "command" &&
                            !(command == "capture" && (key == "expectedPid" || key == "includeText" || key == "identity")) &&
                            !(command == "foreground" && key == "excludePid") &&
                            !((command == "activate" || command == "validate") && key == "identity")) throw new ArgumentException();
                    if (command == "capabilities")
                        result = new Dictionary<string, object> { { "status", "ok" }, { "platform", "win32" },
                            { "selection", "UIAutomation.TextPattern" }, { "warmupReady", warmupReady },
                            { "warmupMs", warmupMs }, { "startupMs", startup.Elapsed.TotalMilliseconds },
                            { "integrityLevel", ProcessAccess.OwnIntegrity } };
                    else if (command == "capture") result = SelectionReader.Read(CaptureOptions.Parse(request));
                    else if (command == "foreground")
                    {
                        object excluded;
                        uint excludedPid = 0;
                        if (request.TryGetValue("excludePid", out excluded))
                        {
                            if (!(excluded is int) || (int)excluded < 1) throw new ArgumentException();
                            excludedPid = (uint)(int)excluded;
                        }
                        var identity = SourceIdentity.Record(excludedPid);
                        result = identity == null ? Protocol.Result("foregroundChanged") : identity.Result("ok");
                        if (identity != null) result["bounds"] = identity.Bounds();
                        if (identity != null) result["windowHandle"] = identity.Window.ToInt64().ToString("x16");
                    }
                    else if (command == "activate" || command == "validate")
                    {
                        object token;
                        if (!request.TryGetValue("identity", out token) || !(token is string) || ((string)token).Length != 32)
                            throw new ArgumentException();
                        var identity = SourceIdentity.Resolve((string)token);
                        result = Protocol.Result(command == "validate" ? SourceActivation.Validate(identity) : SourceActivation.Activate(identity));
                    }
                    else if (command == "stop") { result = Protocol.Result("ok"); stop = true; }
                }
                catch (UnauthorizedAccessException) { result = Protocol.Result("permissionDenied"); }
                catch (Exception) { result = Protocol.Result("invalidRequest"); }
                Protocol.Emit(result, id);
                if (stop) return;
            }
        }
    }
}
