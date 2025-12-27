'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, doc, getDocs, query, where, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import type { ScheduleEvent, UserProfile } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { cn } from '@/lib/utils';

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
const timeSlots = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`); // 7:00 to 22:00
const gridStartHour = 7;

const memberColors = [
  { bg: 'bg-blue-200', text: 'text-blue-800' },
  { bg: 'bg-pink-200', text: 'text-pink-800' },
  { bg: 'bg-green-200', text: 'text-green-800' },
  { bg: 'bg-purple-200', text: 'text-purple-800' },
  { bg: 'bg-orange-200', text: 'text-orange-800' },
  { bg: 'bg-yellow-200', text: 'text-yellow-800' },
  { bg: 'bg-red-200', text: 'text-red-800' },
  { bg: 'bg-indigo-200', text: 'text-indigo-800' },
];

type MemberWithColor = {
  uid: string;
  name: string;
  color: string;
  textColor: string;
};

const AddActivityDialog = ({ members, onActivityAdded, onClose }: { members: MemberWithColor[], onActivityAdded: () => void, onClose: () => void }) => {
  const [activity, setActivity] = useState('');
  const [day, setDay] = useState<ScheduleEvent['day']>('Lunes');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [userId, setUserId] = useState('');
  
  const firestore = useFirestore();
  const { data: user } = useUser();

  const handleAddActivity = async () => {
    if (!activity || !userId || !user?.familyId || !firestore) return;

    const newActivity: Omit<ScheduleEvent, 'id'> = {
      activity,
      day,
      startTime,
      endTime,
      userId,
      familyId: user.familyId,
    };

    await addDoc(collection(firestore, 'families', user.familyId, 'schedules'), newActivity);
    
    // Reset form
    setActivity('');
    setDay('Lunes');
    setStartTime('09:00');
    setEndTime('10:00');
    setUserId('');
    onActivityAdded();
    onClose();
  };
  
  return (
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Añadir Nueva Actividad</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="activity">Actividad</Label>
                <Input id="activity" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Ej: Clase de piano" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="member">Miembro</Label>
                <Select onValueChange={setUserId} value={userId}>
                    <SelectTrigger><SelectValue placeholder="¿Para quién es la actividad?" /></SelectTrigger>
                    <SelectContent>
                        {members.map(member => (
                            <SelectItem key={member.uid} value={member.uid}>{member.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="day">Día de la semana</Label>
                <Select onValueChange={(v: ScheduleEvent['day']) => setDay(v)} value={day}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="startTime">Empieza</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="endTime">Termina</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
            </div>
        </div>
        <DialogFooter>
            <Button onClick={handleAddActivity} disabled={!activity || !userId}>Añadir</Button>
        </DialogFooter>
    </DialogContent>
  )
}

export default function SchedulesPage() {
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [members, setMembers] = useState<MemberWithColor[]>([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) {
        setIsLoading(false);
        return;
    };

    const fetchMembers = async () => {
        try {
            const familyDoc = await getDoc(doc(firestore, 'families', user.familyId!));
            if (familyDoc.exists()) {
                const memberIds = familyDoc.data().members as string[];
                if (!memberIds || memberIds.length === 0) {
                    setMembers([]);
                    return;
                };
                const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberIds));
                const usersSnap = await getDocs(usersQuery);
                const familyMembers = usersSnap.docs.map((d, index) => {
                  const profile = d.data() as UserProfile;
                  return {
                    uid: profile.uid,
                    name: profile.givenName || profile.displayName || 'Usuario',
                    color: memberColors[index % memberColors.length].bg,
                    textColor: memberColors[index % memberColors.length].text
                  }
                });
                setMembers(familyMembers);
            }
        } catch (error) {
            console.warn("Could not fetch family members, user may not have access.", error);
            setMembers([]);
        }
    };
    
    fetchMembers();

    const eventsQuery = query(collection(firestore, 'families', user.familyId, 'schedules'));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const newEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEvent));
      setScheduleEvents(newEvents);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching schedule events:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const deleteActivity = async (id: string) => {
    if (!firestore || !user?.familyId) return;
    await deleteDoc(doc(firestore, 'families', user.familyId, 'schedules', id));
  };
  
  const parseTimeToMinutes = (time: string | undefined) => {
      if (typeof time !== 'string' || !time.includes(':')) {
        return 0; // Return a default value to prevent crash
      }
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
  }
  
  const minutesToGridRow = (minutes: number) => {
      // The grid starts at 00 minutes. Each 15-minute interval is one grid line.
      // There are 4 intervals per hour. The grid starts at gridStartHour (e.g. 7).
      const totalMinutesFromStart = minutes - (gridStartHour * 60);
      // Add 2 because the first row is the header, and grid lines are 1-based.
      return Math.floor(totalMinutesFromStart / 15) + 2; 
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  if (!user?.familyId) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Horario Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                  <p>Debes unirte a una familia para usar el módulo de horarios.</p>
              </CardContent>
          </Card>
      );
  }


  return (
    <div className="flex flex-col gap-6">
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Horario Semanal</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className='flex flex-wrap gap-x-4 gap-y-2'>
                  {members.map(member => (
                      <div key={member.uid} className='flex items-center gap-2'>
                          <div className={cn('w-4 h-4 rounded-full', member.color)}></div>
                          <span className='text-sm font-medium'>{member.name}</span>
                      </div>
                  ))}
              </div>
              <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                  <DialogTrigger asChild>
                      <Button size="lg">
                          <PlusCircle className="mr-2 h-5 w-5" />
                          Añadir Actividad
                      </Button>
                  </DialogTrigger>
                  <AddActivityDialog members={members} onActivityAdded={() => {}} onClose={() => setFormOpen(false)} />
              </Dialog>
            </div>
         </CardHeader>
         <CardContent>
            <div className="grid grid-cols-[60px_repeat(7,1fr)] grid-rows-[auto_repeat(64,minmax(0,1fr))] overflow-x-auto">
                
                {/* Header Row */}
                <div className="sticky top-0 z-20 bg-background col-start-2 col-span-7 grid grid-cols-7">
                    {days.map(day => (
                        <div key={day} className="p-2 text-center font-semibold border-b border-l">
                            {day}
                        </div>
                    ))}
                </div>

                 {/* Time Gutter and Grid Lines */}
                {Array.from({ length: 16 * 4 + 1 }).map((_, i) => {
                    const hour = gridStartHour + Math.floor(i / 4);
                    const minute = (i % 4) * 15;
                    const isHour = minute === 0;

                    return (
                        <React.Fragment key={`time-line-${i}`}>
                          <div
                            className={cn(
                                "row-start-[" + (i + 2) + "]",
                                "text-right pr-2 text-xs",
                                isHour ? "text-foreground font-medium" : "text-muted-foreground"
                            )}
                            style={{ gridRow: i + 2 }}
                           >
                            {isHour ? `${hour}:00` : ''}
                           </div>
                           <div 
                              className="col-start-2 col-span-7 border-t"
                              style={{ gridRow: i + 2 }}
                           ></div>
                        </React.Fragment>
                    )
                })}
                 {days.map((day, i) => (
                    <div key={day} className="row-start-2 row-span-full border-l" style={{gridColumn: i + 2}}></div>
                 ))}


                 {/* Events */}
                 {scheduleEvents.map(event => {
                    const dayIndex = days.indexOf(event.day);
                    if (dayIndex === -1) return null;

                    const startTimeInMinutes = parseTimeToMinutes(event.startTime);
                    const endTimeInMinutes = parseTimeToMinutes(event.endTime);
                    if (startTimeInMinutes === 0 || endTimeInMinutes === 0 || endTimeInMinutes <= startTimeInMinutes) return null;

                    const startRow = minutesToGridRow(startTimeInMinutes);
                    const endRow = minutesToGridRow(endTimeInMinutes);

                    const memberInfo = members.find(m => m.uid === event.userId);
                    if (!memberInfo) return null;

                    const eventStyle: React.CSSProperties = {
                       gridColumnStart: dayIndex + 2,
                       gridRowStart: startRow,
                       gridRowEnd: endRow
                    };

                    return (
                       <div
                          key={event.id}
                          style={eventStyle}
                          className={cn(
                             'z-10 p-2 m-0.5 rounded-lg shadow-md group overflow-hidden flex flex-col justify-start',
                             memberInfo.color
                          )}
                       >
                          <p className={cn('font-bold text-sm leading-tight', memberInfo.textColor)}>{event.activity}</p>
                          <p className={cn('text-xs leading-tight', memberInfo.textColor)}>{memberInfo.name}</p>
                          <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteActivity(event.id!)}>
                             <Trash2 className="h-4 w-4"/>
                          </Button>
                       </div>
                    )
                 })}

            </div>
         </CardContent>
       </Card>
    </div>
  );
}
