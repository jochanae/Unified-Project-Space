import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { FormField, FormFieldType } from '@/types/funnelhub';

interface FormFieldEditorProps {
  value?: string;
  onChange: (json: string) => void;
}

/** Lightweight editor for opt-in extra fields. Stores JSON-encoded FormField[]. */
export function FormFieldEditor({ value, onChange }: FormFieldEditorProps) {
  const fields: FormField[] = useMemo(() => {
    if (!value) return [];
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
  }, [value]);

  const update = (next: FormField[]) => onChange(JSON.stringify(next));

  const addField = () => {
    update([
      ...fields,
      { id: `f_${Date.now()}`, type: 'text', label: 'New Field', required: false },
    ]);
  };

  const patch = (id: string, p: Partial<FormField>) =>
    update(fields.map(f => (f.id === id ? { ...f, ...p } : f)));

  const remove = (id: string) => update(fields.filter(f => f.id !== id));

  return (
    <div className="space-y-2 border-t border-border/30 pt-3 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Extra Form Fields</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addField}>
          <Plus className="h-3 w-3" /> Add field
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground/70">No additional fields. Email is collected by default.</p>
      )}
      {fields.map(f => (
        <div key={f.id} className="rounded-lg border border-border/40 p-2 space-y-2 bg-card/30">
          <div className="flex gap-2 items-center">
            <Input
              value={f.label}
              onChange={e => patch(f.id, { label: e.target.value })}
              placeholder="Label"
              className="h-8 text-xs flex-1"
            />
            <Select value={f.type} onValueChange={(v) => patch(f.id, { type: v as FormFieldType })}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(f.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {(f.type === 'select' || f.type === 'radio') && (
            <Input
              value={f.options || ''}
              onChange={e => patch(f.id, { options: e.target.value })}
              placeholder="Options (comma separated)"
              className="h-8 text-xs"
            />
          )}
          {f.type === 'text' && (
            <Input
              value={f.placeholder || ''}
              onChange={e => patch(f.id, { placeholder: e.target.value })}
              placeholder="Placeholder"
              className="h-8 text-xs"
            />
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={!!f.required}
              onCheckedChange={(c) => patch(f.id, { required: !!c })}
            />
            Required
          </label>
        </div>
      ))}
    </div>
  );
}
