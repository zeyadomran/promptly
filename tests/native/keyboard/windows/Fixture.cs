using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;

internal sealed class BlockedWriter : TextWriter
{
    internal readonly ManualResetEvent Entered = new ManualResetEvent(false);
    internal readonly ManualResetEvent Release = new ManualResetEvent(false);
    internal readonly ManualResetEvent ResetSeen = new ManualResetEvent(false);
    public override Encoding Encoding { get { return Encoding.UTF8; } }
    public override void WriteLine(string value)
    {
        Entered.Set(); Release.WaitOne();
        if (value.Contains("\"reset\"")) ResetSeen.Set();
    }
}
internal static class Fixture
{
    private static void Main()
    {
        var events = new KeyboardEvents(0);
        foreach (int key in new[] { 0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0x5B, 0x5C })
        {
            Console.WriteLine(events.Read(key, true, false, 10));
            Console.WriteLine(events.Read(key, false, false, 20));
        }
        Console.WriteLine(events.Read(0xA0, true, false, 30));
        Console.WriteLine(events.Read(0xA1, true, false, 40));
        Console.WriteLine(events.Read(0xA0, false, false, 50));
        Console.WriteLine(events.Read(0xA1, false, false, 60));
        Console.WriteLine(events.Read(0xA0, true, false, 70));
        Console.WriteLine(events.Read(0xA0, true, false, 80));
        Console.WriteLine(events.Read(0x41, true, false, 90));
        Console.WriteLine(events.Read(0xA0, true, true, 100));
        var stdout = Console.Out;
        var writer = new BlockedWriter();
        Console.SetOut(writer);
        var queue = new EventQueue();
        new Thread(queue.Write) { IsBackground = true }.Start();
        queue.Offer("blocked", 0);
        if (!writer.Entered.WaitOne(2000)) throw new Exception("Queue fixture failed");
        var clock = Stopwatch.StartNew();
        for (int index = 0; index < 10000; index++) queue.Offer("event", index);
        clock.Stop();
        writer.Release.Set();
        if (!writer.ResetSeen.WaitOne(2000)) throw new Exception("Overflow reset missing");
        stdout.WriteLine("{\"backpressure\":true,\"elapsedMs\":" + KeyboardEvents.Number(clock.Elapsed.TotalMilliseconds) + "}");
    }
}
