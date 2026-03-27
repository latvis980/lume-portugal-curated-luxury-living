// frontend/src/components/ui/SelectDropdown.tsx
import { ChevronDown } from "lucide-react";

interface SelectDropdownProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}

export function SelectDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Any",
}: SelectDropdownProps) {
  return (
    <div>
      {label && (
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-body">
          {label}
        </p>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-sm border border-border bg-background px-3 pr-8 text-xs text-foreground font-body outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
      </div>
    </div>
  );
}
