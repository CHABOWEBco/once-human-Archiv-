using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

public static class JmaOverlayNative
{
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X, Y; }

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    private const int GWL_STYLE = -16;
    private const long WS_CAPTION = 0x00C00000L;
    private const long WS_THICKFRAME = 0x00040000L;
    private const long WS_MINIMIZEBOX = 0x00020000L;
    private const long WS_MAXIMIZEBOX = 0x00010000L;
    private const long WS_SYSMENU = 0x00080000L;
    private const uint SWP_NOSENDCHANGING = 0x0400;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const uint SWP_FRAMECHANGED = 0x0020;
    private const uint SWP_SHOWWINDOW = 0x0040;
    private const int SW_HIDE = 0;
    private const int SW_SHOW = 5;
    private const int SW_RESTORE = 9;
    private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    private static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    private static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);
    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);
    [DllImport("user32.dll")]
    private static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
    private static extern int GetWindowLong32(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
    private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
    private static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr")]
    private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

    public static void EnablePerMonitorDpi()
    {
        try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { }
    }

    private static long GetStyle(IntPtr hWnd)
    {
        return IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, GWL_STYLE).ToInt64() : GetWindowLong32(hWnd, GWL_STYLE);
    }

    private static void SetStyle(IntPtr hWnd, long value)
    {
        if (IntPtr.Size == 8) SetWindowLongPtr64(hWnd, GWL_STYLE, new IntPtr(value));
        else SetWindowLong32(hWnd, GWL_STYLE, unchecked((int)value));
    }

    private static string WindowTitle(IntPtr hWnd)
    {
        int length = GetWindowTextLength(hWnd);
        if (length <= 0) return string.Empty;
        var text = new StringBuilder(length + 1);
        GetWindowText(hWnd, text, text.Capacity);
        return text.ToString();
    }

    private static long ClientArea(IntPtr hWnd)
    {
        RECT rect;
        return GetClientRect(hWnd, out rect) ? Math.Max(0L, (long)(rect.Right - rect.Left) * (rect.Bottom - rect.Top)) : 0L;
    }

    public static IntPtr FindOnceHumanWindow()
    {
        IntPtr best = IntPtr.Zero;
        long bestArea = 0;
        EnumWindows((hWnd, _) =>
        {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            string processName = string.Empty;
            try { processName = Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant(); } catch { return true; }
            string title = WindowTitle(hWnd);
            bool processMatch = processName == "oncehuman" || processName == "once_human" || processName == "oncehuman-win64-shipping";
            bool titleMatch = title.IndexOf("Once Human", StringComparison.OrdinalIgnoreCase) >= 0 && title.IndexOf("Archiv", StringComparison.OrdinalIgnoreCase) < 0 && processName != "msedge";
            if (!processMatch && !titleMatch) return true;
            long area = ClientArea(hWnd);
            if (area > bestArea) { best = hWnd; bestArea = area; }
            return true;
        }, IntPtr.Zero);
        return best;
    }

    public static IntPtr FindEdgeOverlayWindow(int preferredProcessId)
    {
        IntPtr preferred = IntPtr.Zero;
        IntPtr best = IntPtr.Zero;
        long bestArea = 0;
        EnumWindows((hWnd, _) =>
        {
            if (!IsWindowVisible(hWnd)) return true;
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            string processName = string.Empty;
            try { processName = Process.GetProcessById((int)pid).ProcessName; } catch { return true; }
            if (!processName.Equals("msedge", StringComparison.OrdinalIgnoreCase)) return true;
            string title = WindowTitle(hWnd);
            if (title.IndexOf("Once Human Archiv", StringComparison.OrdinalIgnoreCase) < 0) return true;
            if ((int)pid == preferredProcessId) { preferred = hWnd; return true; }
            long area = ClientArea(hWnd);
            if (area > bestArea) { best = hWnd; bestArea = area; }
            return true;
        }, IntPtr.Zero);
        return preferred != IntPtr.Zero ? preferred : best;
    }

    public static bool TryGetClientBounds(IntPtr hWnd, out RECT bounds)
    {
        bounds = new RECT();
        if (hWnd == IntPtr.Zero || !IsWindow(hWnd)) return false;
        RECT client;
        if (!GetClientRect(hWnd, out client)) return false;
        var point = new POINT { X = client.Left, Y = client.Top };
        if (!ClientToScreen(hWnd, ref point)) return false;
        bounds.Left = point.X;
        bounds.Top = point.Y;
        bounds.Right = point.X + Math.Max(1, client.Right - client.Left);
        bounds.Bottom = point.Y + Math.Max(1, client.Bottom - client.Top);
        return true;
    }

    public static void PrepareOverlay(IntPtr hWnd)
    {
        if (hWnd == IntPtr.Zero || !IsWindow(hWnd)) return;
        long style = GetStyle(hWnd);
        style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU);
        SetStyle(hWnd, style);
        SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_FRAMECHANGED | SWP_NOSENDCHANGING);
    }

    public static void PlaceOverlay(IntPtr hWnd, int x, int y, int width, int height, bool activate)
    {
        if (hWnd == IntPtr.Zero || !IsWindow(hWnd)) return;
        if (activate) ShowWindow(hWnd, SW_RESTORE);
        uint flags = SWP_SHOWWINDOW | SWP_NOSENDCHANGING | (activate ? 0u : SWP_NOACTIVATE);
        SetWindowPos(hWnd, HWND_TOPMOST, x, y, Math.Max(320, width), Math.Max(240, height), flags);
        if (activate) SetForegroundWindow(hWnd);
    }

    public static void HideOverlay(IntPtr hWnd)
    {
        if (hWnd != IntPtr.Zero && IsWindow(hWnd)) ShowWindow(hWnd, SW_HIDE);
    }

    public static void ShowOverlay(IntPtr hWnd)
    {
        if (hWnd != IntPtr.Zero && IsWindow(hWnd)) { ShowWindow(hWnd, SW_SHOW); SetForegroundWindow(hWnd); }
    }

    public static void FocusWindow(IntPtr hWnd)
    {
        if (hWnd != IntPtr.Zero && IsWindow(hWnd)) SetForegroundWindow(hWnd);
    }

    public static bool IsAlive(IntPtr hWnd) => hWnd != IntPtr.Zero && IsWindow(hWnd);
    public static bool KeyDown(int virtualKey) => (GetAsyncKeyState(virtualKey) & 0x8000) != 0;
}
