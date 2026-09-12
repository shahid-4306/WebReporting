import React from "react";
import { Moon, Sun, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useTheme, ACCENT_LIST } from "@/hooks/useTheme";

export default function ThemeSwitcher() {
  const { mode, accent, setMode, setAccent } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Theme" className="no-print">
          <Palette className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 no-print">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("light")}
              >
                <Sun className="w-4 h-4 mr-1" /> Light
              </Button>
              <Button
                variant={mode === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("dark")}
              >
                <Moon className="w-4 h-4 mr-1" /> Dark
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Accent color</p>
            <div className="grid grid-cols-2 gap-2">
              {ACCENT_LIST.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAccent(a.key)}
                  className={
                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors " +
                    (accent === a.key
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:bg-accent")
                  }
                >
                  <span className="w-4 h-4 rounded-full border border-border" style={{ background: a.color }} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}