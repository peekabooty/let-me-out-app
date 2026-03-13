import { Check } from 'lucide-react';
import { Theme } from '@repo/types';

import { useUpdateTheme } from '../../hooks/use-users';
import { useThemeStore } from '../../store/theme.store';
import { THEME_DEFINITIONS } from '../../themes/theme-definitions';
import { Button } from '@/components/ui/button';

export function ThemeSelector() {
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const mutation = useUpdateTheme();

  const handleSelect = async (theme: Theme) => {
    const previousTheme = currentTheme;

    setTheme(theme);

    try {
      await mutation.mutateAsync(theme);
    } catch {
      setTheme(previousTheme);
    }
  };

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Selector de tema" className="grid grid-cols-2 gap-2">
        {THEME_DEFINITIONS.map((themeDefinition) => {
          const isActive = currentTheme === themeDefinition.value;

          return (
            <Button
              key={themeDefinition.value}
              type="button"
              variant="outline"
              role="radio"
              aria-checked={isActive}
              aria-label={themeDefinition.label}
              onClick={() => void handleSelect(themeDefinition.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void handleSelect(themeDefinition.value);
                }
              }}
              disabled={mutation.isPending}
              className={`rounded-md border p-3 text-left transition-colors ${isActive ? 'border-primary bg-accent/40' : 'border-border hover:bg-accent/30'}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{themeDefinition.label}</span>
                {isActive && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              </div>
              <div className="flex items-center gap-2">
                {themeDefinition.preview.map((color) => (
                  <span
                    key={color}
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </Button>
          );
        })}
      </div>

      {mutation.isError && (
        <p role="status" className="text-sm text-destructive">
          No se pudo guardar la preferencia de tema. Se restauró el tema anterior.
        </p>
      )}
    </div>
  );
}
