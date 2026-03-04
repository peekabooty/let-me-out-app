import { CalendarView } from '../../components/calendar/CalendarView';

export function CalendarPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Calendario</h1>
      <CalendarView />
    </div>
  );
}
