'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc, query, Timestamp, where, orderBy, limit, updateDoc } from 'firebase/firestore';
import type { Event as CalendarEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

const eventTypeColors: Record<CalendarEvent['type'], string> = {
  medical: 'bg-red-200 text-red-800 border-red-300',
  school: 'bg-blue-200 text-blue-800 border-blue-300',
  personal: 'bg-green-200 text-green-800 border-green-300',
  work: 'bg-orange-200 text-orange-800 border-orange-300',
};

const eventTypeEmoji: Record<CalendarEvent['type'], string> = {
    medical: '🏥',
    school: '📚',
    personal: '🎉',
    work: '💼',
};


export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [eventData, setEventData] = useState<{title: string, time: string, date: Date | undefined, type: CalendarEvent['type']}>({
    title: '',
    time: '',
    date: new Date(),
    type: 'personal',
  });
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isClient, setIsClient] = useState(false);

  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const eventsQuery = query(
        collection(firestore, 'families', user.familyId, 'events'),
        where('date', '>=', start),
        where('date', '<=', end)
    );

    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        const newEvents = snapshot.docs.map(doc => {
            const data = doc.data();
            const date = data.date ? (data.date as Timestamp).toDate() : new Date();
            return {
                id: doc.id,
                ...data,
                date: date,
            } as CalendarEvent;
        });
        setEvents(newEvents);
    });

    const today = startOfToday();
    const upcomingQuery = query(
        collection(firestore, 'families', user.familyId, 'events'),
        where('date', '>=', today),
        orderBy('date', 'asc'),
        limit(5)
    );
    const upcomingUnsubscribe = onSnapshot(upcomingQuery, (snapshot) => {
        const newUpcomingEvents = snapshot.docs.map(doc => {
             const data = doc.data();
             return {
                 id: doc.id,
                 ...data,
                 date: (data.date as Timestamp).toDate(),
             } as CalendarEvent;
        });
        setUpcomingEvents(newUpcomingEvents);
    });

    return () => {
        unsubscribe();
        upcomingUnsubscribe();
    };

  }, [firestore, user, currentDate]);


  const handleSaveEvent = async () => {
    if (!eventData.title || !eventData.date || !eventData.time || !firestore || !user?.familyId) return;
    
    if (editingEvent) {
        // Update existing event
        const eventRef = doc(firestore, 'families', user.familyId, 'events', editingEvent.id!);
        await updateDoc(eventRef, {
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            type: eventData.type,
        });
    } else {
        // Add new event
        const newEvent: Omit<CalendarEvent, 'id'> = {
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          type: eventData.type,
          familyId: user.familyId
        };
        await addDoc(collection(firestore, 'families', user.familyId, 'events'), newEvent);
    }
    
    setFormOpen(false);
    setEditingEvent(null);
  };

  const deleteEvent = async (id: string) => {
    if (!firestore || !user?.familyId || !id) return;
    await deleteDoc(doc(firestore, 'families', user.familyId, 'events', id));
  };
  
  const eventsByDay = useMemo(() => events.reduce((acc, event) => {
    const day = format(event.date, 'yyyy-MM-dd');
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>), [events]);
  
  const openAddEventDialog = useCallback((date: Date) => {
    setEditingEvent(null);
    setEventData({ title: '', time: '', date: date, type: 'personal' });
    setFormOpen(true);
  }, []);
  
  const openEditEventDialog = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setEventData({
        title: event.title,
        time: event.time,
        date: event.date,
        type: event.type,
    });
    setFormOpen(true);
  }, []);


  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const startingDayIndex = useMemo(() => {
    const start = startOfMonth(currentDate);
    // getDay returns 0 for Sunday, 1 for Monday, etc. We want Monday to be 0.
    return (getDay(start) + 6) % 7;
  }, [currentDate]);

  const weekdays = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold capitalize">
                    {format(currentDate, "MMMM yyyy", { locale: es })}
                </h2>
                 <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setFormOpen(isOpen); if (!isOpen) setEditingEvent(null); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openAddEventDialog(new Date())}>
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Añadir Evento
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>{editingEvent ? 'Editar Evento' : 'Añadir Nuevo Evento'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Título del Evento</Label>
                            <Input
                            id="title"
                            value={eventData.title}
                            onChange={(e) => setEventData({...eventData, title: e.target.value})}
                            placeholder="Ej: Cena con amigos"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date">Fecha</Label>
                            <Input
                            id="date"
                            type="date"
                            value={eventData.date ? format(eventData.date, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setEventData({...eventData, date: e.target.value ? new Date(e.target.value.replace(/-/g, '/')) : undefined})}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="time">Hora</Label>
                            <Input
                            id="time"
                            type="time"
                            value={eventData.time}
                            onChange={(e) => setEventData({...eventData, time: e.target.value})}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type">Tipo de Evento</Label>
                            <Select
                            onValueChange={(value: CalendarEvent['type']) =>
                                setEventData({...eventData, type: value})
                            }
                            value={eventData.type}
                            >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="personal">🎉 Personal</SelectItem>
                                <SelectItem value="medical">🏥 Médico</SelectItem>
                                <SelectItem value="school">📚 Escolar</SelectItem>
                                <SelectItem value="work">💼 Trabajo</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                        </div>
                        <Button onClick={handleSaveEvent}>{editingEvent ? 'Guardar Cambios' : 'Añadir Evento'}</Button>
                    </DialogContent>
                </Dialog>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                      Hoy
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
          </div>
          
          <div className="grid grid-cols-7 border-t border-l">
            {weekdays.map(day => (
                <div key={day} className="text-center font-bold p-2 capitalize text-muted-foreground border-r border-b text-sm">
                    {day}
                </div>
            ))}
            
            {Array.from({ length: startingDayIndex }).map((_, index) => (
                <div key={`empty-${index}`} className="border-r border-b bg-muted/50"></div>
            ))}
            
            {daysInMonth.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay[dayKey] || [];
                return (
                    <div 
                        key={dayKey} 
                        className="relative h-40 border-r border-b p-2 flex flex-col group hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => openAddEventDialog(day)}
                    >
                        <span className={cn("font-semibold", format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && 'bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center')}>{format(day, 'd')}</span>
                        <div className="flex-grow overflow-y-auto mt-1 space-y-1">
                           {dayEvents.sort((a,b) => a.time.localeCompare(b.time)).map(event => (
                               <div key={event.id} className={cn("text-xs p-1 rounded-md border w-full", eventTypeColors[event.type])}>
                                   <p className="font-bold truncate">{event.title}</p>
                                   <p>{event.time}</p>
                               </div>
                           ))}
                        </div>
                    </div>
                );
            })}

             {Array.from({ length: Math.max(0, 42 - daysInMonth.length - startingDayIndex) }).map((_, index) => (
                <div key={`empty-end-${index}`} className="border-r border-b bg-muted/50"></div>
            ))}
          </div>

        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Próximos Eventos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{eventTypeEmoji[event.type]}</span>
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(event.date, "EEEE, d 'de' MMMM", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2 text-right'>
                    <p className="font-bold text-lg">{event.time}</p>
                    <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8" onClick={() => openEditEventDialog(event)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteEvent(event.id!)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No hay eventos próximos.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
