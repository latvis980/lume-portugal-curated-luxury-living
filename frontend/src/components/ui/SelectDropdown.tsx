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
    <div className="relative">
      {label && (
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground font-body">
          {label}
        </p>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground font-body outline-none transition focus:border-foreground/30"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
