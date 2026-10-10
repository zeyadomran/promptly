using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

/** Metadata only: one candidate and the target from the latest entry into Promptly. */
internal sealed class ForegroundTracker : IDisposable
{
    private const uint SnapshotMessage = 0x8001;
    private readonly uint ownPid;
    private readonly Thread thread;
    private readonly ManualResetEventSlim ready = new ManualResetEventSlim(false);
    private readonly object requests = new object();
    private readonly ForegroundMethods.EventCallback callback;
    private Snapshot pending;
    private SourceIdentity candidate, target;
    private bool wasOwn;
    private volatile bool closing, running;
    private uint threadId;
    private int serial;
    private sealed class Snapshot
    {
        internal int Id;
        internal bool Done;
        internal SourceIdentity Target;
    }

    internal ForegroundTracker(uint pid)
    {
        ownPid = pid;
        callback = OnForeground;
        thread = new Thread(Loop) { IsBackground = true, Name = "Promptly foreground metadata" };
        thread.Start();
        ready.Wait(50);
    }

    internal SourceIdentity Read(uint pid)
    {
        if (pid != ownPid) throw new ArgumentException();
        if (!running || closing) return null;
        var request = new Snapshot { Id = Interlocked.Increment(ref serial) };
        if (request.Id <= 0) return null;
        lock (requests)
        {
            if (pending != null) return null;
            pending = request;
            var elapsed = Stopwatch.StartNew();
            if (ForegroundMethods.PostThreadMessage(threadId, SnapshotMessage,
                new UIntPtr((uint)request.Id), IntPtr.Zero))
                while (!request.Done && !closing && elapsed.ElapsedMilliseconds < 75)
                    Monitor.Wait(requests, (int)Math.Max(0, 75 - elapsed.ElapsedMilliseconds));
            if (pending == request) pending = null;
            return closing || !request.Done ? null : request.Target;
        }
    }

    private void OnForeground(IntPtr hook, uint kind, IntPtr window,
        int objectId, int childId, uint eventThread, uint eventTime)
    {
        if (!closing) Observe(window);
    }

    private void Observe(IntPtr window)
    {
        uint pid;
        NativeMethods.GetWindowThreadProcessId(window, out pid);
        if (pid == ownPid)
        {
            if (!wasOwn) target = candidate;
            wasOwn = true;
            return;
        }
        wasOwn = false;
        try { candidate = SourceIdentity.RecordWindow(window, ownPid, false); }
        catch (Exception) { candidate = null; }
    }

    private void CompleteSnapshot(int id)
    {
        Snapshot request;
        lock (requests)
        {
            if (pending == null || pending.Id != id) return;
            request = pending;
            pending = null;
        }
        if (request == null) return;
        try
        {
            // Same-thread snapshot follows the queued foreground events; no after-focus window guess.
            Observe(NativeMethods.GetForegroundWindow());
            request.Target = wasOwn && target != null && target.Valid(false) &&
                SourceIdentity.Resolve(target.Token) == target ? target : null;
        }
        catch (Exception) { request.Target = null; }
        finally
        {
            lock (requests) { request.Done = true; Monitor.PulseAll(requests); }
        }
    }

    private void Loop()
    {
        var rooted = GCHandle.Alloc(callback);
        IntPtr hook = IntPtr.Zero;
        try
        {
            threadId = ForegroundMethods.GetCurrentThreadId();
            ForegroundMethods.Message message;
            ForegroundMethods.PeekMessage(out message, IntPtr.Zero, 0, 0, 0);
            // EVENT_SYSTEM_FOREGROUND only, OUTOFCONTEXT: no injection into observed applications.
            hook = ForegroundMethods.SetWinEventHook(3, 3, IntPtr.Zero, callback, 0, 0, 0);
            if (hook == IntPtr.Zero) return;
            Observe(NativeMethods.GetForegroundWindow());
            running = true;
            ready.Set();
            while (!closing && ForegroundMethods.GetMessage(out message, IntPtr.Zero, 0, 0) > 0)
            {
                if (message.Kind == SnapshotMessage) CompleteSnapshot((int)message.WParam.ToUInt32());
                else ForegroundMethods.DispatchMessage(ref message);
            }
        }
        catch (Exception) { }
        finally
        {
            running = false;
            if (hook != IntPtr.Zero) ForegroundMethods.UnhookWinEvent(hook);
            rooted.Free();
            ready.Set();
            RetireRequest();
        }
    }

    private void RetireRequest()
    {
        lock (requests)
        {
            Monitor.PulseAll(requests);
            pending = null;
        }
    }

    public void Dispose()
    {
        closing = true;
        RetireRequest();
        if (threadId != 0) ForegroundMethods.PostThreadMessage(threadId, 0x0012, UIntPtr.Zero, IntPtr.Zero);
        if (thread.Join(100)) ready.Dispose();
    }
}
