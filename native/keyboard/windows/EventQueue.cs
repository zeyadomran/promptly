using System;
using System.Collections.Generic;
using System.Threading;

internal sealed class EventQueue
{
    private readonly Queue<string> pending = new Queue<string>();
    private readonly object gate = new object();
    internal void Offer(string frame, double time)
    {
        lock (gate)
        {
            if (pending.Count >= 64)
            {
                pending.Clear();
                pending.Enqueue("{\"kind\":\"reset\",\"timeMs\":" + KeyboardEvents.Number(time) + "}");
            }
            else pending.Enqueue(frame);
            Monitor.Pulse(gate);
        }
    }
    internal void Write()
    {
        try
        {
            while (true)
            {
                string frame;
                lock (gate)
                {
                    while (pending.Count == 0) Monitor.Wait(gate);
                    frame = pending.Dequeue();
                }
                // Slow stdout never runs under the callback/queue lock.
                Console.Out.WriteLine(frame);
                Console.Out.Flush();
            }
        }
        catch (Exception) { Environment.Exit(0); }
    }
}
