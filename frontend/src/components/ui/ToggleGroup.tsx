// frontend/src/components/ui/ToggleGroup.tsx

interface ToggleGroupProps {
  label: string;
  options: (string | number)[];
  value: string;
  onChange: (v: string) => void;
  /** Optional: map raw value to display label */
  formatOption?: (v: string) => string;
}

export function ToggleGroup({
  label,
  options,
  value,
  onChange,
  formatOption,
}: ToggleGroupProps) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground font-body">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const v = String(opt);
          const active = value === v;
          const display = formatOption ? formatOption(v) : v === "0" ? "Studio" : v;
          return (
            <button
              key={v}
              onClick={() => onChange(active ? "" : v)}
              className={`rounded-full border px-3 py-1 text-xs font-medium font-body transition-all ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {display}
            </button>
          );
        })}
        <button
          onClick={() => onChange("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium font-body transition-all ${
            value === ""
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground hover:border-foreground/40"
          }`}
        >
          Any
        </button>
      </div>
    </div>
  );
}
