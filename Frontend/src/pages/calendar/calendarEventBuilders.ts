import { parseISO } from 'date-fns';

export type EventType = 'leave' | 'task' | 'formation' | 'meeting';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: EventType;
  status?: string;
  allDay: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  extra?: Record<string, unknown>;
}

// Validates that a URL uses only http/https schemes to prevent javascript: XSS
export function isSafeUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

import {
  Palmtree,
  CheckSquare,
  GraduationCap,
  Video,
} from 'lucide-react';

export const EVENT_STYLES: Record<EventType, {
  color: string; bgColor: string; borderColor: string; icon: React.ElementType;
}> = {
  leave: { color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40', borderColor: 'border-l-blue-500', icon: Palmtree },
  task: { color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40', borderColor: 'border-l-purple-500', icon: CheckSquare },
  formation: { color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40', borderColor: 'border-l-orange-500', icon: GraduationCap },
  meeting: { color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-100 dark:bg-teal-900/40', borderColor: 'border-l-teal-500', icon: Video },
};

export function buildLeaveEvents(leaves: Record<string, unknown>[]): CalendarEvent[] {
  return leaves
    .filter((leave) => leave.start_date && leave.end_date)
    .map((leave) => ({
      id: `leave-${leave.id}`,
      title: `Congé — ${(leave.employee as Record<string, unknown>)?.full_name ?? 'Employé'}`,
      start: parseISO(leave.start_date as string),
      end: parseISO(leave.end_date as string),
      type: 'leave' as EventType,
      status: leave.status as string,
      allDay: true,
      ...EVENT_STYLES.leave,
      extra: leave,
    }));
}

export function buildTaskEvents(tasks: Record<string, unknown>[]): CalendarEvent[] {
  return tasks
    .filter((task) => task.due_date)
    .map((task) => {
      const date = parseISO(task.due_date as string);
      return {
        id: `task-${task.id}`,
        title: task.title as string,
        start: date,
        end: date,
        type: 'task' as EventType,
        status: task.status as string,
        allDay: true,
        ...EVENT_STYLES.task,
        extra: task,
      };
    });
}

export function buildFormationEvents(formations: Record<string, unknown>[]): CalendarEvent[] {
  return formations
    .filter((f) => f.start_date)
    .map((f) => ({
      id: `formation-${f.id}`,
      title: f.title as string,
      start: parseISO(f.start_date as string),
      end: parseISO(f.end_date as string),
      type: 'formation' as EventType,
      allDay: false,
      ...EVENT_STYLES.formation,
      extra: f,
    }));
}

export function buildMeetingEvents(meetings: Record<string, unknown>[]): CalendarEvent[] {
  return meetings
    .filter((m) => m.start_time)
    .map((m) => ({
      id: `meeting-${m.id}`,
      title: m.title as string,
      start: parseISO(m.start_time as string),
      end: parseISO(m.end_time as string),
      type: 'meeting' as EventType,
      status: m.status as string,
      allDay: false,
      ...EVENT_STYLES.meeting,
      extra: m,
    }));
}

export function buildAllEvents(
  leaves: Record<string, unknown>[],
  tasks: Record<string, unknown>[],
  formations: Record<string, unknown>[],
  meetings: Record<string, unknown>[],
): CalendarEvent[] {
  return [
    ...buildLeaveEvents(leaves),
    ...buildTaskEvents(tasks),
    ...buildFormationEvents(formations),
    ...buildMeetingEvents(meetings),
  ];
}
