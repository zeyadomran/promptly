using System;
using System.Collections.Generic;
using System.Text;
using System.Web.Script.Serialization;

internal static class Transport
{
    internal const int SelectionUnits = 1048576;
    // Every UTF-16 unit can require six ASCII bytes (\uXXXX), plus bounded metadata.
    internal const int FrameBytes = SelectionUnits * 6 + 65536;
    internal static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = FrameBytes };
    private static readonly object OutputLock = new object();

    internal static void Emit(object response)
    {
        lock (OutputLock)
        {
            string line;
            try
            {
                line = Json.Serialize(response);
                if (Encoding.UTF8.GetByteCount(line) > FrameBytes) throw new ArgumentException();
            }
            catch (Exception)
            {
                var dictionary = response as Dictionary<string, object>;
                object id = dictionary != null && dictionary.ContainsKey("id") ? dictionary["id"] : "invalid";
                line = Json.Serialize(new { v = 1, id = id, status = "selectionTooLarge" });
            }
            Console.WriteLine(line);
        }
    }

    internal static Dictionary<string, object> Fixture(Dictionary<string, object> request)
    {
        object value;
        if (!request.TryGetValue("units", out value) || !(value is int) || (int)value < 0)
            return Capture.Result("invalidRequest");
        int units = (int)value;
        if (units > SelectionUnits) return Capture.Result("selectionTooLarge");
        string pattern = request.ContainsKey("pattern") ? request["pattern"] as string : null;
        string text;
        if (pattern == "quotes") text = new string('"', units);
        else if (pattern == "controls") text = new string('\u0001', units);
        else if (pattern == "unicode") text = new string('\u96EA', units);
        else if (pattern == "emoji") text = new StringBuilder().Insert(0, "\uD83D\uDE00", units / 2).Append(units % 2 == 0 ? "" : "\u96EA").ToString();
        else return Capture.Result("invalidRequest");
        return new Dictionary<string, object> { { "status", "ok" }, { "text", text }, { "characterCount", units } };
    }
}
