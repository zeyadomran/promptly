using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

// Node's Windows spawn cannot resolve an extensionless image. This owned test
// launcher starts the literal sibling image and shuts it down on stdin EOF.
internal static class ExtensionlessFixture
{
    internal static void Run()
    {
        var image = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "fixture-no-suffix");
        using (var child = Process.Start(new ProcessStartInfo(image, "selected") {
            UseShellExecute = false, RedirectStandardOutput = true
        }))
        {
            var lifetime = new Thread(delegate() {
                while (Console.Read() != -1) { }
                try { child.Kill(); }
                catch (InvalidOperationException) { }
            });
            lifetime.IsBackground = true;
            lifetime.Start();
            string line;
            while ((line = child.StandardOutput.ReadLine()) != null)
                Console.WriteLine(line.TrimEnd('}') + ",\"launcherPid\":" + Process.GetCurrentProcess().Id + "}");
            child.WaitForExit();
        }
    }
}
