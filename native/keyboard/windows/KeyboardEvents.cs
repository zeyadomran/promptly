using System.Globalization;

internal sealed class KeyboardEvents
{
    internal int Mask { get; private set; }
    internal KeyboardEvents(int initialMask) { Mask = initialMask; }
    internal static string Number(double value) { return value.ToString("R", CultureInfo.InvariantCulture); }
    internal static int Bit(int key)
    {
        switch (key)
        {
            case 0xA0: return 1; case 0xA1: return 2;
            case 0xA2: return 4; case 0xA3: return 8;
            case 0xA4: return 16; case 0xA5: return 32;
            case 0x5B: return 64; case 0x5C: return 128;
            default: return 0;
        }
    }
    internal string Read(int key, bool down, bool injected, double time)
    {
        // Injected and ordinary keys cancel; neither their codes nor characters leave this process.
        int bit = Bit(key);
        if (injected || bit == 0)
            return "{\"kind\":\"cancel\",\"timeMs\":" + Number(time) + "}";
        bool repeat = down && (Mask & bit) != 0;
        Mask = down ? Mask | bit : Mask & ~bit;
        return "{\"kind\":\"modifiers\",\"mask\":" + Mask + ",\"repeat\":" + (repeat ? "true" : "false") + ",\"timeMs\":" + Number(time) + "}";
    }
}
