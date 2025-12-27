'use client';

import {
  Calendar,
  CloudSun,
  HeartPulse,
  ShoppingCart,
  UtensilsCrossed,
  Clock,
  Timer as TimerIcon,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  PlusCircle,
  Bell,
  Check,
  Move,
  DollarSign,
  Loader2,
  Smile,
  BookOpen,
  X,
  Target,
  Flame,
  Zap,
  BatteryMedium,
  BatteryFull,
  BatteryLow,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, limit, onSnapshot, where, doc, addDoc, updateDoc, deleteDoc, orderBy, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import type { Event, ShoppingItem, Task, Timer, Alarm, Transaction, Budget, UserProfile, Reward } from '@/lib/types';
import Link from 'next/link';
import { format, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import DashboardSettings from '@/components/dashboard/dashboard-settings';
import { useDashboardSettings } from '@/components/dashboard/dashboard-settings-store';
import { useDashboardStore } from '@/stores/dashboard-store';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


const ResponsiveGridLayout = WidthProvider(Responsive);

const POINTS_MAP: Record<Task['energy'], number> = {
  Verde: 5,
  Amarillo: 10,
  Rojo: 15,
};
const LEVEL_THRESHOLD = 100;

export type WidgetKeys =
  | 'welcome'
  | 'budget'
  | 'weather'
  | 'tasks'
  | 'events'
  | 'shopping'
  | 'appointments'
  | 'menu'
  | 'time'
  | 'timer'
  | 'alarm'
  | 'hogachii';

export const widgetConfigList = [
  { id: 'welcome', label: 'Bienvenida', defaultLayout: { w: 2, h: 2, minW: 2 } },
  { id: 'tasks', label: 'Tareas', defaultLayout: { w: 2, h: 4, minW: 2, minH: 3 } },
  { id: 'events', label: 'Eventos', defaultLayout: { w: 1, h: 4, minW: 1, minH: 3 } },
  { id: 'shopping', label: 'Compras', defaultLayout: { w: 1, h: 4, minW: 1, minH: 3 } },
  { id: 'budget', label: 'Presupuesto', defaultLayout: { w: 1, h: 2, minW: 1, minH: 2 } },
  { id: 'weather', label: 'Clima', defaultLayout: { w: 1, h: 2, minW: 1, minH: 2 } },
  { id: 'appointments', label: 'Citas Médicas', defaultLayout: { w: 1, h: 2, minW: 1, minH: 2 } },
  { id: 'menu', label: 'Menú', defaultLayout: { w: 1, h: 3, minW: 1, minH: 3 } },
  { id: 'time', label: 'Hora Actual', defaultLayout: { w: 1, h: 2, minW: 1, minH: 2 } },
  { id: 'timer', label: 'Temporizadores', defaultLayout: { w: 2, h: 4, minW: 2, minH: 3 } },
  { id: 'alarm', label: 'Alarmas', defaultLayout: { w: 2, h: 4, minW: 2, minH: 3 } },
  { id: 'hogachii', label: 'Hogachii Blog', defaultLayout: { w: 1, h: 2, minW: 1, minH: 2 } },
];

const initialLayouts = {
  lg: [
    { i: 'welcome', x: 0, y: 0, w: 2, h: 2, minW: 2 },
    { i: 'tasks', x: 0, y: 2, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'events', x: 2, y: 2, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'shopping', x: 3, y: 2, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'budget', x: 2, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'weather', x: 3, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'appointments', x: 0, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'menu', x: 1, y: 6, w: 1, h: 3, minW: 1, minH: 3 },
    { i: 'time', x: 2, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
    { i: 'timer', x: 2, y: 8, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'alarm', x: 0, y: 9, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'hogachii', x: 3, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
  ],
};

const initialVisibleWidgets: WidgetKeys[] = [
  'welcome', 'tasks', 'events', 'shopping', 'budget', 'weather', 'time', 'timer', 'alarm', 'hogachii'
];

const WIDGET_CONFIG_KEY = 'dashboardWidgetConfig';
const LAYOUT_CONFIG_KEY = 'dashboardLayoutConfig';

const DraggableHandle = () => (
  <div className="react-grid-drag-handle absolute top-3 right-3 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
    <Move className="h-4 w-4" />
  </div>
);

// Time Widget Component
const TimeWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <Card className="h-full bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Hora Actual</CardTitle>
        <Clock className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
          {format(currentTime, 'HH:mm')}
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {format(currentTime, "eeee, d 'de' MMMM", { locale: es })}
        </p>
      </CardContent>
       <DraggableHandle />
    </Card>
  );
};


const TimerWidget = () => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newTimerName, setNewTimerName] = useState('');
  const [newTimerMinutes, setNewTimerMinutes] = useState('10');
  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const timersQuery = query(collection(firestore, 'families', user.familyId, 'timers'));
    const unsubscribe = onSnapshot(timersQuery, snapshot => {
      setTimers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Timer)));
    });

    return () => unsubscribe();
  }, [firestore, user]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      timers.forEach(timer => {
        if (timer.isActive && timer.remainingTime > 0) {
          const newRemainingTime = timer.remainingTime - 1;
          const timerRef = doc(firestore!, 'families', user!.familyId!, 'timers', timer.id);
          updateDoc(timerRef, { remainingTime: newRemainingTime });
          
          if (newRemainingTime === 0) {
            updateDoc(timerRef, { isActive: false });
            // Consider a more robust notification system
            // const audio = new Audio('/alarm.mp3');
            // audio.play().catch(e => console.error("Error playing audio:", e));
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers, firestore, user]);

  const toggleTimer = (id: string) => {
    const timer = timers.find(t => t.id === id);
    if (!timer || !firestore || !user?.familyId) return;
    const timerRef = doc(firestore, 'families', user.familyId, 'timers', id);
    updateDoc(timerRef, { isActive: !timer.isActive });
  };

  const resetTimer = (id: string) => {
    const timer = timers.find(t => t.id === id);
    if (!timer || !firestore || !user?.familyId) return;
    const timerRef = doc(firestore, 'families', user.familyId, 'timers', id);
    updateDoc(timerRef, { remainingTime: timer.duration, isActive: false });
  };

  const deleteTimer = (id: string) => {
    if (!firestore || !user?.familyId) return;
    const timerRef = doc(firestore, 'families', user.familyId, 'timers', id);
    deleteDoc(timerRef);
  };
  
  const handleAddTimer = async () => {
    if (!firestore || !user?.familyId || !user?.uid) return;
    const name = newTimerName.trim() || `Temporizador #${timers.length + 1}`;
    const durationInSeconds = parseInt(newTimerMinutes, 10) * 60;
    if (isNaN(durationInSeconds) || durationInSeconds <= 0) return;

    const newTimer: Omit<Timer, 'id'> = {
      name,
      duration: durationInSeconds,
      remainingTime: durationInSeconds,
      isActive: false,
      familyId: user.familyId,
      userId: user.uid,
    };
    await addDoc(collection(firestore, 'families', user.familyId, 'timers'), newTimer);
    setNewTimerName('');
    setNewTimerMinutes('10');
    setAddDialogOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold">Temporizadores</CardTitle>
          <CardDescription>Gestiona tus bloques de tiempo.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="outline">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Nuevo Temporizador</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="timer-name">Nombre (opcional)</Label>
                        <Input id="timer-name" value={newTimerName} onChange={e => setNewTimerName(e.target.value)} placeholder="Ej: Estudiar, Descanso..."/>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="timer-duration">Duración (minutos)</Label>
                        <Input id="timer-duration" type="number" value={newTimerMinutes} onChange={e => setNewTimerMinutes(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddTimer}>Añadir</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 overflow-y-auto">
        {timers.length > 0 ? timers.map(timer => {
            const progress = (timer.duration - timer.remainingTime) / timer.duration * 100;
            return (
              <div key={timer.id} className="flex items-center justify-between p-4 rounded-lg border bg-background/50">
                 <div className="relative h-20 w-20">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                        <circle className="text-gray-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                        <circle
                            className="text-primary"
                            strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 42}`}
                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="42"
                            cx="50"
                            cy="50"
                            style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%'}}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-2xl font-bold tabular-nums">{formatTime(timer.remainingTime)}</p>
                    </div>
                 </div>
                 <p className="font-semibold flex-1 ml-4">{timer.name}</p>
                <div className="flex items-center gap-1">
                     <Button onClick={() => toggleTimer(timer.id)} size="icon" variant={timer.isActive ? 'secondary' : 'default'} className="w-10 h-10 rounded-full">
                        {timer.isActive ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
                    </Button>
                     <Button onClick={() => resetTimer(timer.id)} size="icon" variant="ghost" className="w-10 h-10 rounded-full">
                        <RotateCcw className="h-5 w-5"/>
                    </Button>
                    <Button onClick={() => deleteTimer(timer.id)} size="icon" variant="ghost" className="text-destructive w-10 h-10 rounded-full">
                        <Trash2 className="h-5 w-5"/>
                    </Button>
                </div>
              </div>
            )
        }) : (
            <div className="text-center text-muted-foreground pt-10">
                <TimerIcon className="h-12 w-12 mx-auto mb-2 opacity-50"/>
                <p className="font-semibold">No hay temporizadores.</p>
                <p className="text-sm">Añade uno para empezar.</p>
            </div>
        )}
      </CardContent>
       <DraggableHandle />
    </Card>
  );
};


const AlarmWidget = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newAlarmName, setNewAlarmName] = useState('');
  const [newAlarmTime, setNewAlarmTime] = useState('');
  const triggeredAlarms = useRef<Set<string>>(new Set());
  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const alarmsQuery = query(collection(firestore, 'families', user.familyId, 'alarms'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(alarmsQuery, snapshot => {
      setAlarms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alarm)));
    });

    return () => unsubscribe();
  }, [firestore, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = format(new Date(), 'HH:mm');
      alarms.forEach(alarm => {
        if (alarm.isActive && alarm.time === now && !triggeredAlarms.current.has(alarm.id)) {
          // const audio = new Audio('/alarm.mp3');
          // audio.play().catch(e => console.error("Error playing audio:", e));
          triggeredAlarms.current.add(alarm.id); 
        } else if (alarm.time !== now && triggeredAlarms.current.has(alarm.id)) {
          // Reset for the next day
          triggeredAlarms.current.delete(alarm.id);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms]);
  
  const handleAddAlarm = async () => {
    if (!newAlarmTime || !firestore || !user?.familyId || !user?.uid) return;
    const name = newAlarmName.trim() || `Alarma ${newAlarmTime}`;
    const newAlarm: Omit<Alarm, 'id'> = {
      name,
      time: newAlarmTime,
      isActive: true,
      familyId: user.familyId,
      userId: user.uid,
    };
    await addDoc(collection(firestore, 'families', user.familyId, 'alarms'), newAlarm);
    setNewAlarmName('');
    setNewAlarmTime('');
    setAddDialogOpen(false);
  };

  const toggleAlarm = (id: string) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm || !firestore || !user?.familyId) return;
    const alarmRef = doc(firestore, 'families', user.familyId, 'alarms', id);
    updateDoc(alarmRef, { isActive: !alarm.isActive });
  };

  const deleteAlarm = (id: string) => {
    if (!firestore || !user?.familyId) return;
    const alarmRef = doc(firestore, 'families', user.familyId, 'alarms', id);
    deleteDoc(alarmRef);
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold">Alarmas</CardTitle>
          <CardDescription>Configura tus avisos diarios.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="outline">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Nueva Alarma</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="alarm-name">Nombre (opcional)</Label>
                        <Input id="alarm-name" value={newAlarmName} onChange={e => setNewAlarmName(e.target.value)} placeholder="Ej: Despertador, Tomar pastilla..."/>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="alarm-time">Hora</Label>
                        <Input id="alarm-time" type="time" value={newAlarmTime} onChange={e => setNewAlarmTime(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddAlarm}>Añadir</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 overflow-y-auto">
        {alarms.length > 0 ? alarms.map(alarm => (
          <div key={alarm.id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
             <div>
                <p className="text-4xl font-bold">{alarm.time}</p>
                <p className="text-sm text-muted-foreground">{alarm.name}</p>
            </div>
            <div className="flex items-center gap-4">
                <Switch
                  checked={alarm.isActive}
                  onCheckedChange={() => toggleAlarm(alarm.id)}
                />
                <Button onClick={() => deleteAlarm(alarm.id)} size="icon" variant="ghost" className="text-destructive w-10 h-10 rounded-full">
                    <Trash2 className="h-5 w-5"/>
                </Button>
            </div>
          </div>
        )) : (
            <div className="text-center text-muted-foreground pt-10">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50"/>
                <p className="font-semibold">No hay alarmas configuradas.</p>
                <p className="text-sm">Añade una para empezar.</p>
            </div>
        )}
      </CardContent>
       <DraggableHandle />
    </Card>
  );
};

const HogachiiWidget = () => {
  return (
    <Card className="h-full bg-gradient-to-br from-accent to-purple-500 text-accent-foreground flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-2xl font-black flex items-center gap-2">
            <Smile className="h-8 w-8" />
            Hogachii
        </CardTitle>
        <CardDescription className="text-purple-200">
            Consejos e ideas para tu familia.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild variant="secondary" className="w-full">
            <Link href="/blog">
                <BookOpen className="mr-2 h-4 w-4" />
                Ir al Blog
            </Link>
        </Button>
      </CardFooter>
      <DraggableHandle />
    </Card>
  );
};

const FocusMode = ({
    member,
    tasks,
    rewards,
    onExit,
    onCompleteTask
}: {
    member: UserProfile;
    tasks: Task[];
    rewards: Reward[];
    onExit: () => void;
    onCompleteTask: (task: Task) => void;
}) => {
    const [selectedEnergy, setSelectedEnergy] = useState<Task['energy'] | null>(null);

    const level = member.level || 1;
    const points = member.points || 0;
    const pointsForNextLevel = (level * LEVEL_THRESHOLD) - points;
    const progressToNextLevel = (points - ((level - 1) * LEVEL_THRESHOLD)) / LEVEL_THRESHOLD * 100;

    const focusTasks = useMemo(() => {
        if (!selectedEnergy) return [];
        return tasks.filter(t => t.energy === selectedEnergy).slice(0, 3);
    }, [tasks, selectedEnergy]);

    const nextReward = rewards
      .filter(r => r.pointsCost > points)
      .sort((a, b) => a.pointsCost - b.pointsCost)[0];

    const rewardProgress = nextReward ? (points / nextReward.pointsCost) * 100 : 0;

    const EnergySelector = () => (
        <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">¿Cuánta energía tienes hoy?</h2>
            <p className="text-muted-foreground text-lg mb-8">Elige un nivel para ver tus misiones recomendadas.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card className="p-8 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedEnergy('Rojo')}>
                    <CardHeader>
                        <BatteryFull className="h-16 w-16 mx-auto text-red-500"/>
                        <CardTitle className="text-2xl mt-4">Mucha Energía</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Para las tareas más difíciles y urgentes.</p>
                    </CardContent>
                </Card>
                <Card className="p-8 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedEnergy('Amarillo')}>
                     <CardHeader>
                        <BatteryMedium className="h-16 w-16 mx-auto text-yellow-500"/>
                        <CardTitle className="text-2xl mt-4">Energía Normal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Para las tareas habituales del día a día.</p>
                    </CardContent>
                </Card>
                <Card className="p-8 text-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedEnergy('Verde')}>
                     <CardHeader>
                        <BatteryLow className="h-16 w-16 mx-auto text-green-500"/>
                        <CardTitle className="text-2xl mt-4">Poca Energía</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Para tareas rápidas y sencillas.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-background z-50 p-8 flex flex-col animate-in fade-in-50">
            {/* 1. Banner */}
            <div className="relative text-center bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 rounded-3xl p-8 mb-8 text-white">
                <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-background text-6xl">
                    <AvatarFallback className="bg-transparent">{member.avatar || '👤'}</AvatarFallback>
                </Avatar>
                <h1 className="text-5xl font-extrabold">¡Hola, {member.givenName}!</h1>
                <div className="flex justify-center items-center gap-6 mt-4 text-lg font-semibold">
                    <span>{points} Puntos</span>
                    <span>•</span>
                    <span>Nivel {level}</span>
                    <span>•</span>
                    <span className="flex items-center">{member.streak || 0} <Flame className="ml-1 h-5 w-5 text-orange-300"/></span>
                </div>
                 <div className="w-full max-w-md mx-auto mt-4">
                    <Progress value={progressToNextLevel} className="h-4"/>
                    <p className="text-sm mt-1">Te faltan {pointsForNextLevel} puntos para el Nivel {level + 1}</p>
                </div>
            </div>

            {!selectedEnergy ? <EnergySelector /> : (
                <>
                    {/* 2. Title */}
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold">🎯 Tus misiones de hoy ({selectedEnergy})</h2>
                        <p className="text-muted-foreground text-lg">Enfócate en estas. El resto puede esperar.</p>
                         <Button variant="link" onClick={() => setSelectedEnergy(null)}>Elegir otra energía</Button>
                    </div>

                    {/* 3 & 4. Tasks */}
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-8">
                        {focusTasks.length > 0 ? focusTasks.map(task => (
                            <Card key={task.id} className={cn(
                                "flex flex-col p-6 min-h-[200px] border-4",
                                {'border-red-500': task.energy === 'Rojo'},
                                {'border-yellow-500': task.energy === 'Amarillo'},
                                {'border-green-500': task.energy === 'Verde'},
                            )}>
                                <CardHeader className="p-0">
                                     <Badge variant="outline" className={cn(
                                        "w-fit text-base",
                                        {'border-red-500 text-red-500': task.energy === 'Rojo'},
                                        {'border-yellow-500 text-yellow-500': task.energy === 'Amarillo'},
                                        {'border-green-500 text-green-500': task.energy === 'Verde'},
                                     )}>{task.energy === 'Rojo' ? 'Urgente' : task.energy === 'Amarillo' ? 'Normal' : 'Rápida'}</Badge>
                                     <CardTitle className="text-4xl font-bold pt-2">{task.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow p-0 mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn('h-4 w-4 rounded-full', {
                                            'bg-red-500': task.energy === 'Rojo',
                                            'bg-yellow-500': task.energy === 'Amarillo',
                                            'bg-green-500': task.energy === 'Verde'
                                        })}></span>
                                        <span className="text-lg font-medium">{task.energy}</span>
                                    </div>
                                    <p className="text-lg font-bold">+{POINTS_MAP[task.energy]} pts</p>
                                </CardContent>
                                <CardFooter className="p-0 mt-auto">
                                    <Button className="w-full h-16 text-2xl font-bold" onClick={() => onCompleteTask(task)}>
                                        ¡HECHO! (+{POINTS_MAP[task.energy]} pts)
                                    </Button>
                                </CardFooter>
                            </Card>
                        )) : (
                             <div className="col-span-1 md:col-span-3 text-center flex flex-col items-center justify-center h-full">
                                <h3 className="text-5xl font-bold">¡Todo completado para esta energía! 🏆</h3>
                                <p className="text-2xl text-muted-foreground mt-2">Eres increíble. ¡Prueba con otro nivel de energía o a disfrutar del día!</p>
                            </div>
                        )}
                    </div>
                    
                    {/* 5. Reward Widget */}
                     {nextReward && (
                        <div className="grid md:grid-cols-3 gap-8 mt-8">
                          <div/>
                            <Card className="bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300 md:col-span-1">
                                <CardContent className="p-6 text-center">
                                    <p className="text-6xl mb-2">{nextReward.emoji}</p>
                                    <p className="font-semibold text-lg">Próxima Recompensa:</p>
                                    <p className="font-bold text-xl text-yellow-800 dark:text-yellow-300">{nextReward.name}</p>
                                     <p className="text-sm mt-2">Te faltan {nextReward.pointsCost - points} puntos</p>
                                     <Progress value={rewardProgress} className="mt-2 h-3" />
                                </CardContent>
                            </Card>
                          <div/>
                        </div>
                    )}
                </>
            )}

            {/* 6. Exit button */}
            <div className="mt-8 text-center">
                <Button variant="ghost" size="lg" className="text-xl" onClick={onExit}>
                    <X className="mr-2 h-6 w-6"/>
                    Salir del modo enfoque
                </Button>
            </div>
        </div>
    )
}

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetKeys[]>(initialVisibleWidgets);
  const [layouts, setLayouts] = useState<ReactGridLayout.Layouts>(initialLayouts);
  const { data: user, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const { selectedMemberId, familyMembers, setFamilyMembers, setSelectedMemberId } = useDashboardStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  
  const [allUpcomingEvents, setAllUpcomingEvents] = useState<Event[]>([]);
  const [isEventsModalOpen, setEventsModalOpen] = useState(false);

  const { isSettingsOpen, setSettingsOpen } = useDashboardSettings();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  // Effect to load state from localStorage on client-side mount
  useEffect(() => {
    setIsClient(true);
    try {
      const savedVisibleJSON = localStorage.getItem(WIDGET_CONFIG_KEY);
      const savedLayoutsJSON = localStorage.getItem(LAYOUT_CONFIG_KEY);
      
      const savedVisible = savedVisibleJSON ? JSON.parse(savedVisibleJSON) : initialVisibleWidgets;
      
      const validVisible = savedVisible.filter((id: WidgetKeys) => widgetConfigList.some(w => w.id === id));
      setVisibleWidgets(validVisible);
      
      if (savedLayoutsJSON) {
        const savedLayouts = JSON.parse(savedLayoutsJSON);
        if (savedLayouts.lg && Array.isArray(savedLayouts.lg)) {
           const finalLg = validVisible.map((id: WidgetKeys) => {
             const savedLayout = savedLayouts.lg.find((l: any) => l.i === id);
             const defaultLayout = widgetConfigList.find(w => w.id === id)?.defaultLayout;
             const initialLayout = initialLayouts.lg.find(l => l.i === id);
             return { ...initialLayout, ...defaultLayout, ...savedLayout, i: id };
           });
           setLayouts({ ...initialLayouts, lg: finalLg });
        } else {
           setLayouts(initialLayouts);
        }
      } else {
        setLayouts(initialLayouts);
      }
    } catch (error) {
      console.error("Failed to parse from localStorage, falling back to defaults.", error);
      setVisibleWidgets(initialVisibleWidgets);
      setLayouts(initialLayouts);
    }
  }, []);

  // Effect to save state to localStorage whenever it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(visibleWidgets));
      localStorage.setItem(LAYOUT_CONFIG_KEY, JSON.stringify(layouts));
    }
  }, [visibleWidgets, layouts, isClient]);


  useEffect(() => {
    if (!firestore || !user?.familyId) {
        setTasks([]);
        setEvents([]);
        setShoppingItems([]);
        setTransactions([]);
        setBudgets([]);
        setAllUpcomingEvents([]);
        setFamilyMembers([]);
        setRewards([]);
        return;
    };

    const familyId = user.familyId;

    // Fetch Family Members
    const fetchMembers = async () => {
        const familyDoc = await getDocs(query(collection(firestore, 'users'), where('familyId', '==', familyId)));
        const members = familyDoc.docs.map(doc => doc.data() as UserProfile);
        setFamilyMembers(members);
    };
    fetchMembers();


    // Fetch Tasks
    const tasksQuery = query(collection(firestore, 'families', familyId, 'tasks'));
    const tasksUnsub = onSnapshot(tasksQuery, snapshot => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    // Fetch Events (widget + modal)
    const eventsQuery = query(
      collection(firestore, 'families', familyId, 'events'), 
      where('date', '>=', startOfToday()), 
      orderBy('date', 'asc'), 
      limit(10)
    );
    const eventsUnsub = onSnapshot(eventsQuery, snapshot => {
        const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Event));
        fetchedEvents.sort((a, b) => {
            const dateComparison = a.date.getTime() - b.date.getTime();
            if (dateComparison !== 0) return dateComparison;
            return a.time.localeCompare(b.time);
        });
        setAllUpcomingEvents(fetchedEvents);
        setEvents(fetchedEvents.slice(0, 2));
    });

    // Fetch Shopping Items
    const shoppingQuery = query(collection(firestore, 'families', user.familyId, 'shoppingItems'), where('purchased', '==', false));
    const shoppingUnsub = onSnapshot(shoppingQuery, snapshot => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
        const sortedItems = items.sort((a,b) => a.name.localeCompare(b.name)).slice(0, 5);
        setShoppingItems(sortedItems);
    });

     // Fetch Transactions
    const transQuery = query(collection(firestore, 'families', familyId, 'transactions'));
    const transUnsub = onSnapshot(transQuery, snap => {
        setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()} as Transaction)));
    });
    
    // Fetch Budgets
    const budgetsQuery = query(collection(firestore, 'families', familyId, 'budgets'));
    const budgetsUnsub = onSnapshot(budgetsQuery, snap => {
        setBudgets(snap.docs.map(d => ({id: d.id, ...d.data()} as Budget)));
    });

    // Fetch Rewards
    const rewardsQuery = query(collection(firestore, 'families', familyId, 'rewards'), orderBy('pointsCost'));
    const rewardsUnsub = onSnapshot(rewardsQuery, snapshot => {
        setRewards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward)));
    });


    return () => {
        tasksUnsub();
        eventsUnsub();
        shoppingUnsub();
        transUnsub();
        budgetsUnsub();
        rewardsUnsub();
    }
  }, [firestore, user, setFamilyMembers]);


  const handleWidgetToggle = (widgetId: WidgetKeys, checked: boolean) => {
    setVisibleWidgets((prevVisible) => {
      const newVisible = checked
        ? [...prevVisible, widgetId]
        : prevVisible.filter((id) => id !== widgetId);

      setLayouts(prevLayouts => {
        const newLg = newVisible.map(id => {
          return prevLayouts.lg?.find(l => l.i === id) 
                 || initialLayouts.lg.find(l => l.i === id)
                 || widgetConfigList.find(w => w.id === id)?.defaultLayout as any;
        }).filter(Boolean);

        return { ...prevLayouts, lg: newLg };
      });

      return newVisible;
    });
  };
  
  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean, memberId?: string) => {
    if (!firestore || !user?.familyId || !taskId) return;
    const taskRef = doc(firestore, 'families', user.familyId, 'tasks', taskId);
    await updateDoc(taskRef, { completed: !currentStatus });
  };

  const handleCompleteTaskFromFocusMode = async (task: Task) => {
      if (!firestore || !task.userId) return;

      const pointsToAdd = POINTS_MAP[task.energy] || 0;
      const member = familyMembers.find(m => m.uid === task.userId);
      if (!member) return;

      const batch = writeBatch(firestore);

      const taskRef = doc(firestore, 'families', user!.familyId!, 'tasks', task.id!);
      batch.update(taskRef, { completed: true });

      const memberRef = doc(firestore, 'users', member.uid);
      const newPoints = (member.points || 0) + pointsToAdd;
      const newStreak = (member.streak || 0) + 1;
      const newLevel = Math.floor(newPoints / LEVEL_THRESHOLD) + 1;

      batch.update(memberRef, {
        points: newPoints,
        streak: newStreak,
        level: newLevel,
      });

      await batch.commit();

      toast({
        title: `¡Misión Cumplida, ${member.givenName}!`,
        description: `Has ganado ${pointsToAdd} puntos. ¡Sigue así!`,
      });
  }
  
  const handleToggleShoppingItemPurchased = async (itemId: string, currentStatus: boolean) => {
    if (!firestore || !user?.familyId || !itemId) return;
    const itemRef = doc(firestore, 'families', user.familyId, 'shoppingItems', itemId);
    await updateDoc(itemRef, { purchased: !currentStatus });
  };
  
  const handleAddNewShoppingItem = async () => {
    if (newShoppingItem.trim() === '' || !firestore || !user?.familyId) return;
    const newItemObject: Omit<ShoppingItem, 'id'> = {
      name: newShoppingItem.trim(),
      category: 'Otros',
      purchased: false,
      familyId: user.familyId
    };
    await addDoc(collection(firestore, 'families', user.familyId, 'shoppingItems'), newItemObject);
    setNewShoppingItem('');
  };


  const onLayoutChange = (_: any, newLayouts: ReactGridLayout.Layouts) => {
     if (isClient) {
      if (JSON.stringify(newLayouts.lg) !== JSON.stringify(layouts.lg)) {
        setLayouts(newLayouts);
      }
    }
  };

  const { monthlyExpenses, totalBudget } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = transactions.filter(t => (t.date as Timestamp).toDate() >= startOfMonth);
    
    const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0);

    return { monthlyExpenses, totalBudget };
  }, [transactions, budgets]);

  const selectedMemberProfile = useMemo(() => {
      if (!selectedMemberId) return null;
      return familyMembers.find(m => m.uid === selectedMemberId);
  }, [selectedMemberId, familyMembers]);

  const selectedMemberTasks = useMemo(() => {
      if (!selectedMemberId) return [];
      return tasks.filter(t => t.userId === selectedMemberId && !t.completed);
  }, [selectedMemberId, tasks]);


  const widgetComponents: Record<WidgetKeys, React.ReactNode> = {
    welcome: (
      <Card className="h-full bg-gradient-to-br from-purple-500 to-blue-500 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl font-extrabold">¡Hola, {user?.givenName || user?.displayName?.split(' ')[0] || 'Usuario'}! 👋</CardTitle>
          <CardDescription className="max-w-lg text-balance leading-relaxed text-purple-200">
            Aquí tienes un resumen de tu hogar. Todo está diseñado para darte
            claridad y enfoque.
          </CardDescription>
        </CardHeader>
        <CardFooter>
            <Link href="/tasks">
                 <Button className="bg-white/90 text-purple-600 font-bold hover:bg-white transition-all duration-300 transform hover:scale-105 shadow-md">Crear Nueva Tarea</Button>
            </Link>
        </CardFooter>
         <DraggableHandle />
      </Card>
    ),
    tasks: (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Tareas Pendientes</CardTitle>
          <CardDescription>
            Estas son las próximas tareas para la familia.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 flex-grow overflow-y-auto pb-4">
            {tasks.filter(t => !t.completed).length > 0 ? tasks.filter(t => !t.completed).slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3">
                    <Checkbox
                        id={`task-widget-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTaskCompletion(task.id!, task.completed)}
                        className="h-5 w-5"
                    />
                    <label
                      htmlFor={`task-widget-${task.id}`}
                      className={cn(
                        "flex-1 text-base font-medium cursor-pointer",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </label>
                    <Badge 
                       variant={task.completed ? "outline" : "secondary"}
                       className={cn('font-bold',!task.completed && {
                         'bg-red-100 text-red-800 border-red-300': task.energy === 'Rojo',
                         'bg-yellow-100 text-yellow-800 border-yellow-300': task.energy === 'Amarillo',
                         'bg-green-100 text-green-800 border-green-300': task.energy === 'Verde',
                       })}
                    >
                        {task.energy}
                    </Badge>
                </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Check className="h-16 w-16 text-green-500 mb-4" />
                  <p className="font-semibold text-lg">¡Todo en orden!</p>
                  <p>No hay tareas pendientes.</p>
              </div>
            )}
        </CardContent>
         <CardFooter>
            <Link href="/tasks" className="w-full">
                <Button variant="outline" className="w-full">Ver todas las tareas</Button>
            </Link>
        </CardFooter>
        <DraggableHandle />
      </Card>
    ),
     events: (
      <Card className="h-full">
        <Dialog open={isEventsModalOpen} onOpenChange={setEventsModalOpen}>
          <CardHeader>
            <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto justify-start text-xl font-bold">
                    Próximos Eventos
                </Button>
            </DialogTrigger>
          </CardHeader>
          <CardContent className="grid gap-6">
              {events.length > 0 ? events.map(event => (
                <div key={event.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">{event.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {format(event.date, "eeee, d 'de' MMMM", {locale: es})}, {event.time}
                    </p>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm text-center py-8">No hay eventos próximos.</p>}
          </CardContent>
          <DialogContent className="max-w-lg">
              <DialogHeader>
                  <DialogTitle>Próximos 10 Eventos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                 {allUpcomingEvents.length > 0 ? allUpcomingEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-4 p-2 rounded-lg">
                      <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-base">{event.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {format(event.date, "eeee, d 'de' MMMM", {locale: es})}, {event.time}
                        </p>
                      </div>
                    </div>
                 )) : <p className="text-muted-foreground text-sm text-center py-8">No hay eventos próximos.</p>}
              </div>
          </DialogContent>
        </Dialog>
        <DraggableHandle />
      </Card>
    ),
    shopping: (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Lista de Compra</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 flex-grow overflow-y-auto">
            {shoppingItems.length > 0 ? shoppingItems.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                    <Checkbox
                        id={`shopping-widget-${item.id}`}
                        checked={item.purchased}
                        onCheckedChange={() => handleToggleShoppingItemPurchased(item.id!, item.purchased)}
                        className="h-5 w-5"
                    />
                     <label
                      htmlFor={`shopping-widget-${item.id}`}
                      className={cn(
                        "flex-1 text-base font-medium cursor-pointer",
                        item.purchased && "line-through text-muted-foreground"
                      )}
                    >
                      {item.name}
                    </label>
                </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <ShoppingCart className="h-16 w-16 text-green-500 mb-4" />
                  <p className="font-semibold text-lg">¡Lista vacía!</p>
                  <p>Añade algo desde abajo.</p>
              </div>
            )}
        </CardContent>
        <CardFooter className="p-2 border-t mt-auto">
          <div className="flex w-full items-center gap-2">
            <Input
              placeholder="Añadir..."
              value={newShoppingItem}
              onChange={(e) => setNewShoppingItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewShoppingItem()}
              className="h-10 text-base"
            />
            <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleAddNewShoppingItem}>
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        </CardFooter>
        <DraggableHandle />
      </Card>
    ),
    budget: (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardDescription>Gastos del Mes</CardDescription>
                <CardTitle className="text-3xl font-extrabold">{monthlyExpenses.toFixed(2)}€</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-muted-foreground">
                   {totalBudget > 0 ? `de un presupuesto de ${totalBudget.toFixed(2)}€` : 'Sin presupuesto configurado'}
                </div>
            </CardContent>
            <CardFooter>
                <Progress value={totalBudget > 0 ? (monthlyExpenses / totalBudget) * 100 : 0} />
            </CardFooter>
            <DraggableHandle />
        </Card>
    ),
      weather: (
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold">Clima</CardTitle>
            <CloudSun className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-black">22°</div>
            <p className="text-sm text-muted-foreground">Soleado en Madrid</p>
          </CardContent>
          <DraggableHandle />
        </Card>
      ),
    appointments: (
       <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Citas Médicas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 rounded-lg bg-destructive/10 p-3">
              <HeartPulse className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-semibold">Pediatra - Hijo</p>
              <p className="text-sm text-muted-foreground">
                Mañana, 10:00 AM
              </p>
            </div>
          </div>
        </CardContent>
        <DraggableHandle />
      </Card>
    ),
    menu: (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Menú de Hoy</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow grid gap-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-lg bg-accent p-3">
              <UtensilsCrossed className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comida</p>
              <p className="font-semibold">Lentejas con chorizo</p>
            </div>
          </div>
           <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-lg bg-accent p-3">
              <UtensilsCrossed className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cena</p>
              <p className="font-semibold">Crema de calabacín</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <Link href="/menu" className="w-full">
                <Button variant="outline" className="w-full">Ver menú completo</Button>
            </Link>
        </CardFooter>
        <DraggableHandle />
      </Card>
    ),
    time: <TimeWidget />,
    timer: <TimerWidget />,
    alarm: <AlarmWidget />,
    hogachii: <HogachiiWidget />,
  };
  
    if (isUserLoading || !user) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!user.familyId) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Card className="max-w-md p-8 bg-white/90 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">¡Bienvenido a Hogachii!</CardTitle>
                    <CardDescription>Para empezar, necesitas unirte a una familia o crear una. Así podrás compartir calendarios, tareas y mucho más.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/profile">
                        <Button size="lg" className="w-full">Ir a mi perfil para configurar mi familia</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
  }

  if (selectedMemberProfile) {
      return (
          <FocusMode
              member={selectedMemberProfile}
              tasks={selectedMemberTasks}
              rewards={rewards}
              onExit={() => setSelectedMemberId(null)}
              onCompleteTask={handleCompleteTaskFromFocusMode}
          />
      );
  }

  const renderableWidgets = visibleWidgets
    .map(widgetId => {
      const layout = layouts.lg?.find(l => l.i === widgetId);
      
      if (!layout) {
        return null;
      }
      
      return (
          <div key={widgetId} data-grid={layout}>
            {widgetComponents[widgetId]}
          </div>
      );
  }).filter(Boolean);


  return (
    <div className="flex flex-col gap-8">
      <DashboardSettings 
        isOpen={isSettingsOpen}
        onOpenChange={setSettingsOpen}
        visibleWidgets={visibleWidgets}
        onWidgetToggle={handleWidgetToggle}
      />
       {isClient && (
        <ResponsiveGridLayout
          layouts={layouts}
          onLayoutChange={onLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={100}
          draggableHandle=".react-grid-drag-handle"
          isDraggable={true} 
          isResizable={true}
          className="layout"
        >
          {renderableWidgets}
        </ResponsiveGridLayout>
       )}
    </div>
  );
}
