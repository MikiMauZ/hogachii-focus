'use client';

import {
  Calendar,
  CloudSun,
  HeartPulse,
  Settings2,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { collection, query, limit, onSnapshot, where, doc, addDoc, updateDoc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import type { Event, ShoppingItem, Task, Timer, Alarm, Transaction, Budget } from '@/lib/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ResponsiveGridLayout = WidthProvider(Responsive);

type WidgetKeys =
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
  | 'alarm';

const widgetConfigList = [
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
  ],
};

const initialVisibleWidgets: WidgetKeys[] = [
  'welcome', 'tasks', 'events', 'shopping', 'budget', 'weather', 'appointments', 'menu', 'time', 'timer', 'alarm'
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


export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetKeys[]>(initialVisibleWidgets);
  const [layouts, setLayouts] = useState<ReactGridLayout.Layouts>(initialLayouts);
  const { data: user } = useUser();
  const firestore = useFirestore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newShoppingItem, setNewShoppingItem] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Effect to load state from localStorage on client-side mount
  useEffect(() => {
    setIsClient(true);
    try {
      const savedVisibleJSON = localStorage.getItem(WIDGET_CONFIG_KEY);
      const savedLayoutsJSON = localStorage.getItem(LAYOUT_CONFIG_KEY);
      
      const savedVisible = savedVisibleJSON ? JSON.parse(savedVisibleJSON) : initialVisibleWidgets;
      
      // Filter out any IDs that are no longer valid widgets
      const validVisible = savedVisible.filter((id: WidgetKeys) => widgetConfigList.some(w => w.id === id));
      setVisibleWidgets(validVisible);
      
      if (savedLayoutsJSON) {
        const savedLayouts = JSON.parse(savedLayoutsJSON);
        if (savedLayouts.lg && Array.isArray(savedLayouts.lg)) {
           // Ensure all visible widgets have a layout
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
        return;
    };

    const familyId = user.familyId;

    // Fetch Tasks
    const tasksQuery = query(collection(firestore, 'families', familyId, 'tasks'), where('completed', '==', false), limit(5));
    const tasksUnsub = onSnapshot(tasksQuery, snapshot => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    // Fetch Events
    const eventsQuery = query(collection(firestore, 'families', familyId, 'events'), where('date', '>=', new Date()), orderBy('date', 'asc'), limit(2));
    const eventsUnsub = onSnapshot(eventsQuery, snapshot => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Event)));
    });

    // Fetch Shopping Items
    const shoppingQuery = query(collection(firestore, 'families', user.familyId, 'shoppingItems'), where('purchased', '==', false), limit(5));
    const shoppingUnsub = onSnapshot(shoppingQuery, snapshot => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
        const sortedItems = items.sort((a,b) => a.name.localeCompare(b.name));
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


    return () => {
        tasksUnsub();
        eventsUnsub();
        shoppingUnsub();
        transUnsub();
        budgetsUnsub();
    }
  }, [firestore, user]);


  const handleWidgetToggle = (widgetId: WidgetKeys, checked: boolean) => {
    setVisibleWidgets((prevVisible) => {
      const newVisible = checked
        ? [...prevVisible, widgetId]
        : prevVisible.filter((id) => id !== widgetId);

      // Also adjust layouts
      setLayouts(prevLayouts => {
        const newLg = newVisible.map(id => {
          // Find existing or initial layout
          return prevLayouts.lg?.find(l => l.i === id) 
                 || initialLayouts.lg.find(l => l.i === id)
                 || widgetConfigList.find(w => w.id === id)?.defaultLayout as any;
        }).filter(Boolean); // Filter out any null/undefined layouts

        return { ...prevLayouts, lg: newLg };
      });

      return newVisible;
    });
  };
  
  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    if (!firestore || !user?.familyId || !taskId) return;
    const taskRef = doc(firestore, 'families', user.familyId, 'tasks', taskId);
    await updateDoc(taskRef, { completed: !currentStatus });
  };
  
  const handleToggleShoppingItemPurchased = async (itemId: string, currentStatus: boolean) => {
    if (!firestore || !user?.familyId || !itemId) return;
    const itemRef = doc(firestore, 'families', user.familyId, 'shoppingItems', itemId);
    await updateDoc(itemRef, { purchased: !currentStatus });
  };
  
  const handleAddNewShoppingItem = async () => {
    if (newShoppingItem.trim() === '' || !firestore || !user?.familyId) return;
    const newItemObject: Omit<ShoppingItem, 'id'> = {
      name: newShoppingItem.trim(),
      category: 'Otros', // Default category
      purchased: false,
      familyId: user.familyId
    };
    await addDoc(collection(firestore, 'families', user.familyId, 'shoppingItems'), newItemObject);
    setNewShoppingItem('');
  };


  const onLayoutChange = (_: any, newLayouts: ReactGridLayout.Layouts) => {
     if (isClient) {
      // Only update if the layout has actually changed to prevent loops
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
            {tasks.length > 0 ? tasks.map(task => (
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
        <CardHeader>
          <CardTitle className="text-xl font-bold">Próximos Eventos</CardTitle>
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
                    de un presupuesto total de {totalBudget.toFixed(2)}€
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
          <Button variant="outline" className="w-full">
            Ver menú completo
          </Button>
        </CardFooter>
        <DraggableHandle />
      </Card>
    ),
    time: <TimeWidget />,
    timer: <TimerWidget />,
    alarm: <AlarmWidget />,
  };
  
    if (!user) {
    return <div>Cargando...</div>;
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
       <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white/90">Dashboard</h1>
            <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">Personalizar Dashboard</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                <SheetTitle>Personalizar Dashboard</SheetTitle>
                <SheetDescription>
                    Activa o desactiva los widgets que quieres ver.
                </SheetDescription>
                </SheetHeader>
                <div className="grid gap-6 py-4">
                {widgetConfigList.map((widget) => (
                    <div key={widget.id} className="grid grid-cols-3 items-center gap-4">
                    <Label
                        htmlFor={`${widget.id}-switch`}
                        className="col-span-2 flex flex-col gap-1"
                    >
                        <span>{widget.label}</span>
                    </Label>
                    <div className="flex items-center justify-end">
                        <Switch
                        id={`${widget.id}-switch`}
                        checked={visibleWidgets.includes(widget.id)}
                        onCheckedChange={(checked) =>
                            handleWidgetToggle(widget.id, checked)
                        }
                        />
                    </div>
                    </div>
                ))}
                </div>
            </SheetContent>
            </Sheet>
        </div>

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
