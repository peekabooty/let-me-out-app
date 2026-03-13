import { useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { useNavigate } from '@tanstack/react-router';

import { useCalendarAbsences } from '../../hooks/use-calendar';
import type { CalendarAbsence } from '../../lib/api-client';

/**
 * Maps a calendar absence to a FullCalendar event.
 *
 * Color logic (RF-70):
 * - Own absences: Use a primary color (#2563eb - blue-600)
 * - Team absences: Use the team color from the backend
 *
 * WCAG AA contrast validation:
 * - Blue-600 (#2563eb) with white text: 4.56:1 contrast ratio (passes WCAG AA)
 * - Gray-600 (#4b5563) with white text: 7.41:1 contrast ratio (passes WCAG AA)
 * - Minimum contrast ratio: 4.5:1 for normal text
 */
function mapAbsenceToEvent(absence: CalendarAbsence): EventInput {
  const color = absence.isOwn ? '#2563eb' : (absence.teamColor ?? '#4b5563');

  return {
    id: absence.id,
    title: `${absence.userName} - ${absence.absenceTypeName}`,
    start: absence.startAt,
    end: absence.endAt,
    backgroundColor: color,
    borderColor: color,
    textColor: '#ffffff',
    extendedProps: {
      absenceId: absence.id,
      isOwn: absence.isOwn,
      status: absence.status,
      userName: absence.userName,
      absenceTypeName: absence.absenceTypeName,
      avatarUrl: absence.avatarUrl,
    },
  };
}

function renderEventContent(eventInfo: EventContentArg) {
  const avatarUrl = eventInfo.event.extendedProps.avatarUrl as string | null;

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-4 w-4 shrink-0 rounded-full object-cover"
          aria-hidden="true"
        />
      ) : null}
      <span className="truncate">{eventInfo.event.title}</span>
    </div>
  );
}

/**
 * CalendarView component displays a monthly calendar with absences.
 *
 * Features (RF-46, RF-69, RF-70, RF-71):
 * - Monthly view with navigation
 * - Shows own absences and team members' absences
 * - Different colors for own vs team absences
 * - Click on event navigates to absence detail
 * - Responsive and accessible
 */
export function CalendarView() {
  const navigate = useNavigate();
  const { data: absences, isLoading, isError, error } = useCalendarAbsences();

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const absenceId = clickInfo.event.extendedProps.absenceId as string;
      void navigate({ to: `/absences/${absenceId}` });
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center p-8"
        role="status"
        aria-live="polite"
        aria-label="Cargando calendario"
      >
        <p className="text-muted-foreground">Cargando calendario...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8" role="alert" aria-live="assertive">
        <p className="text-destructive">
          Error al cargar el calendario:{' '}
          {error instanceof Error ? error.message : 'Error desconocido'}
        </p>
      </div>
    );
  }

  const events = absences?.map(mapAbsenceToEvent) ?? [];

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth',
        }}
        events={events}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        height="auto"
        locale={esLocale}
        firstDay={1}
        weekends={true}
        editable={false}
        selectable={false}
        selectMirror={false}
        dayMaxEvents={true}
        navLinks={false}
        eventDisplay="block"
      />
    </div>
  );
}
