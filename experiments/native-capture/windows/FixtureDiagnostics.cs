using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;

// Owned fixture startup only. Never include exception messages, titles or selection text.
internal static class FixtureDiagnostics
{
    private static readonly Stopwatch Started = Stopwatch.StartNew();

    internal static void Stage(string stage, int? hresult = null)
    {
        string elapsed = Started.Elapsed.TotalMilliseconds.ToString(CultureInfo.InvariantCulture);
        string error = hresult.HasValue ? ",\"hresult\":" + hresult.Value.ToString(CultureInfo.InvariantCulture) : "";
        try
        {
            Console.Error.WriteLine("{\"kind\":\"owned-fixture-stage\",\"stage\":\"" + stage +
                "\",\"elapsedMs\":" + elapsed + error + "}");
            Console.Error.Flush();
        }
        catch (IOException) { }
        catch (ObjectDisposedException) { }
    }
}
