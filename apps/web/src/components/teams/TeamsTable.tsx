import type { Team } from '@repo/types';

interface TeamsTableProps {
  teams: Team[];
}

function getContrastTextColor(hexColor: string): string {
  const color = hexColor.replace('#', '');
  const red = Number.parseInt(color.slice(0, 2), 16);
  const green = Number.parseInt(color.slice(2, 4), 16);
  const blue = Number.parseInt(color.slice(4, 6), 16);

  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.55 ? '#111827' : '#F9FAFB';
}

export function TeamsTable({ teams }: TeamsTableProps) {
  if (teams.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No hay equipos registrados.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Color</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr
              key={team.id}
              className={
                index % 2 === 0 ? 'bg-card text-foreground' : 'bg-muted/40 text-foreground'
              }
            >
              <td className="px-4 py-3 font-medium">{team.name}</td>
              <td className="px-4 py-3">
                <div className="inline-flex items-center gap-2">
                  <span
                    className="rounded-md px-2 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: team.color,
                      color: getContrastTextColor(team.color),
                    }}
                  >
                    {team.color.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">Color del equipo</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
