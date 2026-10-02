using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

internal static class Protocol
{
    internal const int SelectionUnits = 1048576;
    internal const int FrameBytes = SelectionUnits * 6 + 65536;
    internal static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = FrameBytes };

    internal static Dictionary<string, object> Result(string status)
    {
        return new Dictionary<string, object> { { "status", status } };
    }

    internal static string Read(Stream input)
    {
        using (var frame = new MemoryStream())
        {
            int value;
            while ((value = input.ReadByte()) != -1)
            {
                if (value == 10) return new UTF8Encoding(false, true).GetString(frame.ToArray());
                if (frame.Length >= 4096) throw new InvalidDataException();
                frame.WriteByte((byte)value);
            }
            // Partial EOF frames are invalid, never interpreted as a command.
            if (frame.Length != 0) throw new InvalidDataException();
            return null;
        }
    }

    internal static void Emit(Dictionary<string, object> response, string id)
    {
        response["v"] = 1;
        response["id"] = id;
        string line;
        try
        {
            line = Json.Serialize(response);
            if (Encoding.UTF8.GetByteCount(line) > FrameBytes) throw new ArgumentException();
        }
        catch (Exception) { line = Json.Serialize(new { v = 1, id = id, status = "selectionTooLarge" }); }
        Console.WriteLine(line);
    }

    internal static Dictionary<string, object> Parse(string line)
    {
        var request = Json.Deserialize<Dictionary<string, object>>(line);
        if (request == null || !request.ContainsKey("id") || !(request["id"] is string) ||
            ((string)request["id"]).Length < 1 || ((string)request["id"]).Length > 128 ||
            !request.ContainsKey("v") || !(request["v"] is int) || (int)request["v"] != 1 ||
            !request.ContainsKey("command") || !(request["command"] is string)) throw new ArgumentException();
        return request;
    }
}
