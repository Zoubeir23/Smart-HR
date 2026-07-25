import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  endOfDay,
  getWeek,
} from 'date-fns';
import {
  type CalendarEvent,
  type EventType,
  EVENT_STYLES,
  isSafeUrl,
  buildAllEvents,
} from './calendarEventBuilders';
import { fr } from 'date-fns/locale';
import { leaveService } from '@/services/leaveService';
import { taskService } from '@/services/taskService';
import { trainingService } from '@/services/trainingService';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  User,
  Tag,
  ChevronLeft,
  ChevronRight,
  Video,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CalendarView = 'month' | 'week' | 'day';

const WEEK_DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const LEAVE_STATUS_LABEL: Record<string, string> = { pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé' };
const TASK_STATUS_LABEL: Record<string, string> = { todo: 'À faire', in_progress: 'En cours', in_review: 'En revue', done: 'Terminée' };
const TASK_PRIORITY_LABEL: Record<string, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };
const FILTER_LABELS: Record<EventType, string> = { leave: 'Congés', task: 'Tâches', formation: 'Formations', meeting: 'Réunions' };

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return events.filter((event) => {
    const eventStart = startOfDay(event.start);
    const eventEnd = startOfDay(event.end);
    return (
      isSameDay(eventStart, day) ||
      isSameDay(eventEnd, day) ||
      (eventStart <= dayStart && eventEnd >= dayEnd)
    );
  });
}

// ---------------------------------------------------------------------------
// EventChip
// ---------------------------------------------------------------------------

function EventChip({ event, onClick }: { event: CalendarEvent; onClick: (e: CalendarEvent) => void }) {
  const Icon = event.icon;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      className={cn(
        'w-full text-left rounded border-l-2 px-1.5 py-0.5 text-xs font-medium truncate transition-opacity hover:opacity-75',
        event.bgColor, event.color, event.borderColor,
      )}
    >
      <span className="inline-flex items-center gap-1 min-w-0">
        <Icon className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate">{event.title}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// MonthView — clicking a day navigates to Day view
// ---------------------------------------------------------------------------

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onWeekClick: (day: Date) => void;
}

function MonthView({ currentDate, events, onDayClick, onEventClick, onWeekClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">
      {/* Headers */}
      <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-border">
        <div className="py-2" /> {/* week number col */}
        {WEEK_DAYS_SHORT.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {weeks.map((week) => (
          <div key={week[0].toISOString()} className="grid grid-cols-[40px_repeat(7,1fr)] flex-1 border-b border-border last:border-b-0">
            {/* Week number — click → week view */}
            <button
              onClick={() => onWeekClick(week[0])}
              aria-label={`Voir la semaine ${getWeek(week[0], { weekStartsOn: 1 })}`}
              className="border-r border-border flex items-start justify-center pt-2 text-xs text-muted-foreground hover:bg-accent/40 transition-colors font-medium"
            >
              S{getWeek(week[0], { weekStartsOn: 1 })}
            </button>

            {/* Days */}
            {week.map((day) => {
              const dayEvents = getEventsForDay(events, day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const MAX = 3;
              const visible = dayEvents.slice(0, MAX);
              const hidden = dayEvents.length - MAX;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    'border-r border-border last:border-r-0 p-1 cursor-pointer hover:bg-accent/20 transition-colors min-h-[90px] flex flex-col gap-0.5',
                    !inMonth && 'bg-muted/15',
                  )}
                >
                  <div className="flex justify-end">
                    <span className={cn(
                      'h-6 w-6 flex items-center justify-center rounded-full text-xs font-medium',
                      today && 'bg-primary text-primary-foreground font-bold',
                      !today && inMonth && 'text-foreground',
                      !today && !inMonth && 'text-muted-foreground/50',
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    {visible.map((ev) => <EventChip key={ev.id} event={ev} onClick={onEventClick} />)}
                    {hidden > 0 && (
                      <span className="text-xs text-muted-foreground pl-1 leading-none mt-0.5">
                        +{hidden} autre{hidden > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeekView — clicking a day navigates to Day view
// ---------------------------------------------------------------------------

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function WeekView({ currentDate, events, onDayClick, onEventClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border shrink-0">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className="py-3 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-accent/20 transition-colors"
          >
            <div className="text-xs font-medium text-muted-foreground uppercase">
              {format(day, 'EEE', { locale: fr })}
            </div>
            <div className={cn(
              'mx-auto mt-1 h-8 w-8 flex items-center justify-center rounded-full text-sm font-semibold',
              isToday(day) && 'bg-primary text-primary-foreground',
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Event columns */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 min-h-[350px]">
          {days.map((day) => {
            const dayEvents = getEventsForDay(events, day);
            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={cn(
                  'border-r border-border last:border-r-0 p-2 space-y-1 cursor-pointer hover:bg-accent/10 transition-colors',
                  isToday(day) && 'bg-primary/5',
                )}
              >
                {dayEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground/40 text-center pt-4">—</p>
                )}
                {dayEvents.map((ev) => <EventChip key={ev.id} event={ev} onClick={onEventClick} />)}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayView
// ---------------------------------------------------------------------------

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  const dayEvents = getEventsForDay(events, currentDate);
  const allDay = dayEvents.filter((e) => e.allDay);
  const timed = dayEvents.filter((e) => !e.allDay);

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {allDay.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Toute la journée
            </h3>
            <div className="space-y-2">
              {allDay.map((ev) => {
                const Icon = ev.icon;
                return (
                  <motion.button
                    key={ev.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      'w-full text-left rounded-xl px-4 py-3.5 border-l-4 flex items-center gap-3 hover:opacity-80 transition-opacity',
                      ev.bgColor, ev.color, ev.borderColor,
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="font-medium flex-1">{ev.title}</span>
                    {ev.status && (
                      <span className="text-xs opacity-75 font-normal">
                        {LEAVE_STATUS_LABEL[ev.status] ?? TASK_STATUS_LABEL[ev.status] ?? ev.status}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {timed.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Horaires
            </h3>
            <div className="space-y-2">
              {timed.map((ev) => {
                const Icon = ev.icon;
                return (
                  <motion.button
                    key={ev.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      'w-full text-left rounded-xl px-4 py-3.5 border-l-4 flex items-center gap-3 hover:opacity-80 transition-opacity',
                      ev.bgColor, ev.color, ev.borderColor,
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {format(ev.start, 'HH:mm')} – {format(ev.end, 'HH:mm')}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {dayEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/50">
            <Calendar className="h-14 w-14 mb-4" />
            <p className="text-sm">Aucun événement ce jour</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// EventDetailSheet
// ---------------------------------------------------------------------------

function EventDetailSheet({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  if (!event) return null;
  const Icon = event.icon;
  const extra = event.extra as Record<string, unknown>;

  return (
    <Sheet open={!!event} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span className={cn('p-2 rounded-lg', event.bgColor)}>
              <Icon className={cn('h-5 w-5', event.color)} />
            </span>
            <span>{event.title}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-1">
          <Row icon={Calendar} label="Date">
            {event.allDay
              ? isSameDay(event.start, event.end)
                ? format(event.start, 'EEEE d MMMM yyyy', { locale: fr })
                : `${format(event.start, 'd MMM yyyy', { locale: fr })} → ${format(event.end, 'd MMM yyyy', { locale: fr })}`
              : `${format(event.start, 'd MMM yyyy, HH:mm', { locale: fr })} – ${format(event.end, 'HH:mm', { locale: fr })}`}
          </Row>

          <Row icon={Tag} label="Type">
            <Badge variant="outline" className={cn(event.bgColor, event.color, 'border-0 font-medium')}>
              {FILTER_LABELS[event.type]}
            </Badge>
          </Row>

          {event.status && (
            <Row icon={Clock} label="Statut">
              <span className="text-sm font-medium">
                {LEAVE_STATUS_LABEL[event.status] ?? TASK_STATUS_LABEL[event.status] ?? event.status}
              </span>
            </Row>
          )}

          {event.type === 'leave' && extra && (
            <>
              {extra.employee && (
                <Row icon={User} label="Employé">
                  {(extra.employee as Record<string, unknown>)?.full_name as string ?? '—'}
                </Row>
              )}
              {extra.reason && (
                <div className="rounded-lg bg-muted p-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Motif</p>
                  <p className="text-sm">{extra.reason as string}</p>
                </div>
              )}
            </>
          )}

          {event.type === 'task' && extra && (
            <>
              {extra.priority && (
                <Row icon={Tag} label="Priorité">
                  {TASK_PRIORITY_LABEL[extra.priority as string] ?? extra.priority as string}
                </Row>
              )}
              {extra.description && (
                <div className="rounded-lg bg-muted p-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{extra.description as string}</p>
                </div>
              )}
            </>
          )}

          {event.type === 'formation' && extra && (
            <>
              {extra.instructor && (
                <Row icon={User} label="Formateur">
                  {extra.instructor as string}
                </Row>
              )}
              {extra.description && (
                <div className="rounded-lg bg-muted p-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{extra.description as string}</p>
                </div>
              )}
            </>
          )}

          {event.type === 'meeting' && isSafeUrl(extra?.meeting_link) && (
            <Row icon={Video} label="Zoom">
              <a
                href={extra.meeting_link as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 text-sm"
              >
                Rejoindre la réunion
              </a>
            </Row>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-2 min-w-[100px] shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CalendarPage
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<EventType>>(
    new Set(['leave', 'task', 'formation', 'meeting']),
  );

  // Data fetching
  const { data: leavesData, isError: leavesError } = useQuery({ queryKey: ['cal-leaves'], queryFn: () => leaveService.getAll() });
  const { data: tasksData, isError: tasksError } = useQuery({ queryKey: ['cal-tasks'], queryFn: () => taskService.getAll() });
  const { data: formationsData, isError: formationsError } = useQuery({ queryKey: ['cal-formations'], queryFn: () => trainingService.getFormations() });
  const { data: meetingsData, isError: meetingsError } = useQuery({ queryKey: ['cal-meetings'], queryFn: () => trainingService.getMeetings() });

  const hasError = leavesError || tasksError || formationsError || meetingsError;

  // L'extraction est faite dans le callback : `?? []` crée un nouveau tableau à
  // chaque rendu, donc en dépendre annulerait la mémoïsation (recalcul systématique).
  // Les objets de réponse React Query, eux, restent stables tant que la donnée ne change pas.
  const allEvents = useMemo(() => {
    const leaves: Record<string, unknown>[] = leavesData?.results ?? leavesData ?? [];
    const tasks: Record<string, unknown>[] = tasksData?.results ?? tasksData ?? [];
    const formations: Record<string, unknown>[] = formationsData?.results ?? formationsData ?? [];
    const meetings: Record<string, unknown>[] = meetingsData?.results ?? meetingsData ?? [];
    return buildAllEvents(leaves, tasks, formations, meetings);
  }, [leavesData, tasksData, formationsData, meetingsData]);
  const filteredEvents = useMemo(() => allEvents.filter((e) => activeFilters.has(e.type)), [allEvents, activeFilters]);

  function toggleFilter(type: EventType) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function navigatePrevious() {
    if (view === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (view === 'week') setCurrentDate((d) => addDays(d, -7));
    else setCurrentDate((d) => addDays(d, -1));
  }

  function navigateNext() {
    if (view === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (view === 'week') setCurrentDate((d) => addDays(d, 7));
    else setCurrentDate((d) => addDays(d, 1));
  }

  // Clicking a day navigates to day view
  function handleDayClick(day: Date) {
    setCurrentDate(day);
    setView('day');
  }

  // Clicking a week number navigates to week view
  function handleWeekClick(day: Date) {
    setCurrentDate(day);
    setView('week');
  }

  // Period title shown inline in the header (with small inline arrows)
  const periodTitle = useMemo(() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: fr });
    if (view === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, 'd MMM', { locale: fr })} – ${format(we, 'd MMM yyyy', { locale: fr })}`;
    }
    return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
  }, [currentDate, view]);

  const viewTabs: { key: CalendarView; label: string; icon: React.ElementType }[] = [
    { key: 'month', label: 'Mois', icon: CalendarRange },
    { key: 'week', label: 'Semaine', icon: CalendarDays },
    { key: 'day', label: 'Jour', icon: Calendar },
  ];

  return (
    <>
      <div className="flex flex-col h-full">

        {/* ================================================================ */}
        {/* TOP BAR — view tabs + period title                               */}
        {/* ================================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-border bg-card shrink-0">

          {/* View tabs — the primary navigation */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            {viewTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  view === key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {view === key && (
                  <motion.span
                    layoutId="active-tab-indicator"
                    className="absolute inset-0 rounded-lg bg-background shadow-sm -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Period title with micro inline arrows */}
          <div className="flex items-center gap-1 text-sm">
            <button
              aria-label="Période précédente"
              onClick={navigatePrevious}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="capitalize font-medium text-foreground min-w-[200px] text-center">
              {periodTitle}
            </span>
            <button
              aria-label="Période suivante"
              onClick={navigateNext}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* FILTER CHIPS                                                     */}
        {/* ================================================================ */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-background/60 shrink-0 flex-wrap">
          {(Object.entries(FILTER_LABELS) as [EventType, string][]).map(([type, label]) => {
            const s = EVENT_STYLES[type];
            const active = activeFilters.has(type);
            const Icon = s.icon;
            const count = allEvents.filter((e) => e.type === type).length;
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                aria-label={`${active ? 'Masquer' : 'Afficher'} les ${label.toLowerCase()}`}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  active ? cn(s.bgColor, s.color, 'border-transparent') : 'bg-muted/30 text-muted-foreground border-border/50 opacity-50',
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
                {count > 0 && <span className="ml-0.5 tabular-nums">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* ERROR BANNER                                                     */}
        {/* ================================================================ */}
        {hasError && (
          <div className="mx-5 mt-3 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-2 text-sm text-destructive shrink-0">
            Certaines données n'ont pas pu être chargées. Vérifiez votre connexion ou rechargez la page.
          </div>
        )}

        {/* ================================================================ */}
        {/* CALENDAR BODY                                                    */}
        {/* ================================================================ */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.12 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {view === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onDayClick={handleDayClick}
                  onWeekClick={handleWeekClick}
                  onEventClick={setSelectedEvent}
                />
              )}
              {view === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onDayClick={handleDayClick}
                  onEventClick={setSelectedEvent}
                />
              )}
              {view === 'day' && (
                <DayView
                  currentDate={currentDate}
                  events={filteredEvents}
                  onEventClick={setSelectedEvent}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Note EMPLOYEE */}
        {user?.role === 'EMPLOYEE' && (
          <div className="px-5 py-2 border-t border-border bg-muted/10 shrink-0">
            <p className="text-xs text-muted-foreground">Seuls vos événements personnels sont affichés.</p>
          </div>
        )}
      </div>

      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
