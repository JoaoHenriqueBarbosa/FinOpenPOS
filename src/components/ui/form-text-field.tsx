import { Label } from "./label";
import { Input } from "./input";

/** Minimal field interface compatible with TanStack Form field API. */
interface FieldLike {
  state: { value: string };
  handleChange: (value: string) => void;
}

/** Reusable form field wrapper: Label + Input with space-y-2 layout. */
export function FormTextField({
  field,
  label,
  ...inputProps
}: {
  field: FieldLike;
  label: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} {...inputProps} />
    </div>
  );
}
