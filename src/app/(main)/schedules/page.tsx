'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
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
const timeSlots = Array.from({ length: 16 }, (_, i) => `${i + 7}:00`); // 7am to 10pm

const memberColors = [
  'bg-blue-300', 'bg-pink-300', 'bg-green-300', 'bg-purple-300',
  'bg-orange-300', 'bg-yellow-300', 'bg-red-300', 'bg-indigo-300'
];

type MemberWithColor = {
  uid: string;
  name: string;
  color: string;
  textColor: string;
};

const AddActivityDialog = ({ members, onActivityAdded }: { members: MemberWithColor[], onActivityAdded: () => void }) => {
  const [activity, setActivity] = useState('');
  const [day, setDay] = useState<ScheduleEvent['day']>('Lunes');
  const [startTime, setStartTime] = useState(9);
  const [endTime, setEndTime] = useState(10);
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
    setStartTime(9);
    setEndTime(10);
    setUserId('');
    onActivityAdded();
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
                    <Select onValueChange={(v) => setStartTime(parseInt(v))} value={String(startTime)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                             {Array.from({length: 16}, (_, i) => i + 7).map(h => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="endTime">Termina</Label>
                    <Select onValueChange={(v) => setEndTime(parseInt(v))} value={String(endTime)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Array.from({length: 16}, (_, i) => i + 8).map(h => <SelectItem key={h} value={String(h)}>{h}:00</SelectItem>)}
                        </SelectContent>
                    </Select>
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
  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    // Fetch family members
    const fetchMembers = async () => {
        const familyDoc = await getDoc(doc(firestore, 'families', user.familyId!));
        if (familyDoc.exists()) {
            const memberIds = familyDoc.data().members as string[];
            const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberIds));
            const usersSnap = await getDocs(usersQuery);
            const familyMembers = usersSnap.docs.map((d, index) => {
              const profile = d.data() as UserProfile;
              return {
                uid: profile.uid,
                name: profile.givenName || profile.displayName || 'Usuario',
                color: memberColors[index % memberColors.length],
                textColor: 'text-gray-800'
              }
            });
            setMembers(familyMembers);
        }
    };
    fetchMembers();

    // Subscribe to schedule events
    const eventsQuery = query(collection(firestore, 'families', user.familyId, 'schedules'));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const newEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEvent));
      setScheduleEvents(newEvents);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const deleteActivity = async (id: string) => {
    if (!firestore || !user?.familyId) return;
    await deleteDoc(doc(firestore, 'families', user.familyId, 'schedules', id));
  };


  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-end">
         <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Añadir Actividad
                </Button>
            </DialogTrigger>
            <AddActivityDialog members={members} onActivityAdded={() => setFormOpen(false)} />
        </Dialog>
      </div>

      {members.length > 0 && (
        <div className='flex flex-wrap gap-4'>
            {members.map(member => (
                <div key={member.uid} className='flex items-center gap-2'>
                    <div className={cn('w-4 h-4 rounded-full', member.color)}></div>
                    <span className='text-sm font-medium'>{member.name}</span>
                </div>
            ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[auto_1fr] overflow-auto">
            {/* Time column */}
            <div className="flex flex-col border-r">
                <div className="h-16"></div> {/* Empty corner */}
                {timeSlots.map(time => (
                    <div key={time} className="h-16 flex items-center justify-center p-2 text-xs text-muted-foreground border-t">
                        {time}
                    </div>
                ))}
            </div>

            {/* Schedule grid */}
            <div className="grid grid-cols-7 relative min-w-[800px]">
               {/* Day headers */}
               {days.map(day => (
                    <div key={day} className="h-16 flex items-center justify-center font-semibold border-b text-center p-2">
                        {day}
                    </div>
                ))}

                {/* Grid lines */}
                {days.map((day, dayIndex) => (
                    <div key={day} className={`col-start-${dayIndex + 1} col-span-1 row-start-2 row-span-full grid grid-rows-16`}>
                        {timeSlots.map((_, timeIndex) => (
                             <div key={timeIndex} className={`h-16 border-t ${dayIndex > 0 ? 'border-l' : ''}`}></div>
                        ))}
                    </div>
                ))}

                {/* Events */}
                {scheduleEvents.map((event) => {
                    const dayIndex = days.indexOf(event.day);
                    if (dayIndex === -1) return null;
                    
                    const startRow = event.startTime - 7 + 2; // +2 for header offset, -7 for 7am start
                    const duration = event.endTime - event.startTime;
                    const memberInfo = members.find(m => m.uid === event.userId);

                    if (!memberInfo) return null;

                    return(
                         <div
                            key={event.id}
                            className={cn('absolute flex flex-col p-2 rounded-lg shadow-md group', memberInfo.color)}
                            style={{
                                top: `${(startRow - 2) * 4}rem`, // 4rem = h-16
                                height: `${duration * 4}rem`,
                                left: `calc(${dayIndex / 7 * 100}% + 4px)`,
                                width: `calc(${1/7 * 100}% - 8px)`,
                            }}
                         >
                            <p className={cn('font-bold text-sm', memberInfo.textColor)}>{event.activity}</p>
                            <p className={cn('text-xs', memberInfo.textColor)}>{memberInfo.name}</p>
                            <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteActivity(event.id!)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                         </div>
                    )
                })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
