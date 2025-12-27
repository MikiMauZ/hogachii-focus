'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Check, Undo, Pencil, Trash2, Repeat, Calendar, Sun, Moon } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import type { Task, Routine, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { isSameDay, isSameWeek, startOfDay, startOfWeek } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const energyColorMap: { [key: string]: { bg: string, text: string, border: string } } = {
  Verde: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  Amarillo: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  Rojo: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

const TaskDialog = ({ open, onOpenChange, onTaskSaved, taskToEdit }: { open: boolean, onOpenChange: (open: boolean) => void, onTaskSaved: () => void, taskToEdit: Task | null }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [energy, setEnergy] = useState<Task['energy']>('Amarillo');
    const firestore = useFirestore();
    const { data: user } = useUser();

    useEffect(() => {
        if (taskToEdit) {
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setEnergy(taskToEdit.energy);
        } else {
            setTitle('');
            setDescription('');
            setEnergy('Amarillo');
        }
    }, [taskToEdit, open]);

    const handleSaveTask = async () => {
        if (!title.trim() || !firestore || !user?.familyId) return;

        const taskData = {
            title: title.trim(),
            description: description.trim(),
            energy,
            completed: taskToEdit ? taskToEdit.completed : false,
            userId: user.uid,
            familyId: user.familyId,
        };

        if (taskToEdit) {
            await updateDoc(doc(firestore, 'families', user.familyId, 'tasks', taskToEdit.id!), taskData);
        } else {
            await addDoc(collection(firestore, 'families', user.familyId, 'tasks'), taskData);
        }
        
        onTaskSaved();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{taskToEdit ? 'Editar Tarea' : 'Crear Nueva Tarea'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="title">Título</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Añade más detalles..." />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="energy">Nivel de Energía</Label>
                    <Select onValueChange={(value: Task['energy']) => setEnergy(value)} value={energy}>
                        <SelectTrigger id="energy">
                            <SelectValue placeholder="Selecciona la energía necesaria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Verde">Verde (Poca energía)</SelectItem>
                            <SelectItem value="Amarillo">Amarillo (Energía media)</SelectItem>
                            <SelectItem value="Rojo">Rojo (Mucha energía)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSaveTask}>{taskToEdit ? 'Guardar Cambios' : 'Añadir Tarea'}</Button>
            </DialogFooter>
        </DialogContent>
    );
};

const RoutineDialog = ({ open, onOpenChange, onRoutineSaved, routineToEdit, members }: { open: boolean, onOpenChange: (open: boolean) => void, onRoutineSaved: () => void, routineToEdit: Routine | null, members: UserProfile[] }) => {
    const [title, setTitle] = useState('');
    const [recurrence, setRecurrence] = useState<'daily' | 'weekly'>('daily');
    const [userId, setUserId] = useState('');
    const [checklist, setChecklist] = useState([{ text: '', completed: false }]);
    const firestore = useFirestore();
    const { data: user } = useUser();

    useEffect(() => {
        if (routineToEdit) {
            setTitle(routineToEdit.title);
            setRecurrence(routineToEdit.recurrence);
            setUserId(routineToEdit.userId);
            setChecklist(routineToEdit.checklist.length > 0 ? routineToEdit.checklist : [{ text: '', completed: false }]);
        } else {
            setTitle('');
            setRecurrence('daily');
            setUserId('');
            setChecklist([{ text: '', completed: false }]);
        }
    }, [routineToEdit, open]);

    const handleChecklistItemChange = (index: number, value: string) => {
        const newChecklist = [...checklist];
        newChecklist[index].text = value;
        setChecklist(newChecklist);
    };

    const addChecklistItem = () => {
        setChecklist([...checklist, { text: '', completed: false }]);
    };
    
    const removeChecklistItem = (index: number) => {
        const newChecklist = checklist.filter((_, i) => i !== index);
        setChecklist(newChecklist);
    };

    const handleSaveRoutine = async () => {
        if (!title.trim() || !userId || !firestore || !user?.familyId) return;

        const filteredChecklist = checklist.filter(item => item.text.trim() !== '');
        if (filteredChecklist.length === 0) {
            // Optionally, show a toast or error message
            return;
        }

        const routineData: Omit<Routine, 'id'> = {
            title: title.trim(),
            recurrence,
            userId,
            familyId: user.familyId,
            checklist: filteredChecklist.map(item => ({ text: item.text, completed: routineToEdit ? item.completed : false })),
            lastReset: routineToEdit ? routineToEdit.lastReset : Timestamp.now(),
        };

        if (routineToEdit) {
            await updateDoc(doc(firestore, 'families', user.familyId, 'routines', routineToEdit.id!), routineData);
        } else {
            await addDoc(collection(firestore, 'families', user.familyId, 'routines'), routineData);
        }
        
        onRoutineSaved();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{routineToEdit ? 'Editar Rutina' : 'Crear Nueva Rutina'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="routine-title">Título de la Rutina</Label>
                    <Input id="routine-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Rutina de Mañana" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="routine-recurrence">Recurrencia</Label>
                        <Select onValueChange={(value: 'daily' | 'weekly') => setRecurrence(value)} value={recurrence}>
                            <SelectTrigger id="routine-recurrence"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Diaria</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="routine-member">Asignar a</Label>
                        <Select onValueChange={setUserId} value={userId}>
                            <SelectTrigger id="routine-member"><SelectValue placeholder="Seleccionar miembro" /></SelectTrigger>
                            <SelectContent>
                                {members.map(member => <SelectItem key={member.uid} value={member.uid}>{member.displayName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label>Sub-tareas de la Rutina</Label>
                    <div className="space-y-2">
                        {checklist.map((item, index) => (
                             <div key={index} className="flex items-center gap-2">
                                <Input value={item.text} onChange={(e) => handleChecklistItemChange(index, e.target.value)} placeholder={`Tarea ${index + 1}`} />
                                <Button variant="ghost" size="icon" onClick={() => removeChecklistItem(index)} disabled={checklist.length === 1 && item.text === ''}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={addChecklistItem}><PlusCircle className="mr-2 h-4 w-4"/> Añadir tarea</Button>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSaveRoutine}>{routineToEdit ? 'Guardar Cambios' : 'Crear Rutina'}</Button>
            </DialogFooter>
        </DialogContent>
    );
};


const RoutineCard = ({ routine, members, onUpdate, onDelete }: { routine: Routine, members: UserProfile[], onUpdate: (routine: Routine, checklistIndex: number) => void, onDelete: (routineId: string) => void }) => {
    const member = members.find(m => m.uid === routine.userId);
    const completedCount = routine.checklist.filter(item => item.completed).length;
    const progress = (completedCount / routine.checklist.length) * 100;

    const handleToggle = (index: number) => {
        onUpdate(routine, index);
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                   <span>{routine.title}</span>
                   <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(routine.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardTitle>
                <CardDescription>Para: {member?.displayName || 'Nadie'}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                {routine.checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <Checkbox 
                            id={`${routine.id}-${index}`} 
                            checked={item.completed} 
                            onCheckedChange={() => handleToggle(index)}
                        />
                        <Label htmlFor={`${routine.id}-${index}`} className={cn("text-base", item.completed && "line-through text-muted-foreground")}>{item.text}</Label>
                    </div>
                ))}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground">{completedCount} de {routine.checklist.length} completadas</p>
                <Progress value={progress} />
            </CardFooter>
        </Card>
    )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isTaskFormOpen, setTaskFormOpen] = useState(false);
  const [isRoutineFormOpen, setRoutineFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [energyFilter, setEnergyFilter] = useState<'all' | Task['energy']>('all');

  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    // Fetch Family Members
    const fetchMembers = async () => {
        const familyMembersQuery = query(collection(firestore, 'users'), where('familyId', '==', user.familyId));
        const querySnapshot = await getDocs(familyMembersQuery);
        setMembers(querySnapshot.docs.map(doc => doc.data() as UserProfile));
    };
    fetchMembers();

    const tasksQuery = query(collection(firestore, 'families', user.familyId, 'tasks'), orderBy('completed'));
    const tasksUnsub = onSnapshot(tasksQuery, (snapshot) => {
        const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(fetchedTasks);
    });

    const routinesQuery = query(collection(firestore, 'families', user.familyId, 'routines'), orderBy('title'));
    const routinesUnsub = onSnapshot(routinesQuery, (snapshot) => {
        const fetchedRoutines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Routine));
        setRoutines(fetchedRoutines);
    });

    return () => {
        tasksUnsub();
        routinesUnsub();
    };
  }, [firestore, user]);

  const toggleTaskCompletion = async (task: Task) => {
    if (!firestore || !user?.familyId || !task.id) return;
    const taskRef = doc(firestore, 'families', user.familyId, 'tasks', task.id);
    await updateDoc(taskRef, { completed: !task.completed });
  };
  
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setTaskFormOpen(true);
  }
  
  const handleDeleteRequest = (task: Task) => {
    setTaskToDelete(task);
    setDeleteAlertOpen(true);
  }
  
  const confirmDelete = async () => {
    if (!taskToDelete || !firestore || !user?.familyId || !taskToDelete.id) return;
    await deleteDoc(doc(firestore, 'families', user.familyId, 'tasks', taskToDelete.id));
    setTaskToDelete(null);
    setDeleteAlertOpen(false);
  }
  
  const handleRoutineUpdate = async (routine: Routine, checklistIndex: number) => {
    if (!firestore || !user?.familyId || !routine.id) return;

    const routineRef = doc(firestore, 'families', user.familyId, 'routines', routine.id);
    let checklistToUpdate = [...routine.checklist];
    let newLastReset = routine.lastReset;

    const now = new Date();
    const lastResetDate = (routine.lastReset as Timestamp).toDate();

    let needsReset = false;
    if (routine.recurrence === 'daily' && !isSameDay(now, lastResetDate)) {
        needsReset = true;
    }
    if (routine.recurrence === 'weekly' && !isSameWeek(now, lastResetDate, { weekStartsOn: 1 })) {
        needsReset = true;
    }

    if (needsReset) {
        checklistToUpdate = checklistToUpdate.map(item => ({ ...item, completed: false }));
        newLastReset = Timestamp.now();
    }

    // Toggle the specific item after reset logic
    checklistToUpdate[checklistIndex].completed = !checklistToUpdate[checklistIndex].completed;

    await updateDoc(routineRef, {
        checklist: checklistToUpdate,
        lastReset: newLastReset
    });
  };

  const handleDeleteRoutine = async (routineId: string) => {
      if (!firestore || !user?.familyId) return;
      await deleteDoc(doc(firestore, 'families', user.familyId, 'routines', routineId));
  }
  
  const filteredTasks = tasks.filter(task => {
    if (energyFilter === 'all') return true;
    return task.energy === energyFilter;
  });

  const pendingTasks = filteredTasks.filter(task => !task.completed);
  const completedTasks = filteredTasks.filter(task => task.completed);
  const dailyRoutines = routines.filter(r => r.recurrence === 'daily');
  const weeklyRoutines = routines.filter(r => r.recurrence === 'weekly');


  return (
    <div className="flex flex-col gap-8">
      <Dialog open={isTaskFormOpen} onOpenChange={setTaskFormOpen}>
        <TaskDialog open={isTaskFormOpen} onOpenChange={setTaskFormOpen} onTaskSaved={() => setTaskFormOpen(false)} taskToEdit={taskToEdit} />
      </Dialog>
      <Dialog open={isRoutineFormOpen} onOpenChange={setRoutineFormOpen}>
        <RoutineDialog open={isRoutineFormOpen} onOpenChange={setRoutineFormOpen} onRoutineSaved={() => setRoutineFormOpen(false)} routineToEdit={null} members={members} />
      </Dialog>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta acción eliminará la tarea "{taskToDelete?.title}" permanentemente. No se puede deshacer.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete}>Sí, eliminar</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="tasks" className="w-full">
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                <TabsTrigger value="tasks">Tareas Puntuales</TabsTrigger>
                <TabsTrigger value="routines">Rutinas</TabsTrigger>
            </TabsList>
         </div>

        <TabsContent value="tasks">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                {(['all', 'Verde', 'Amarillo', 'Rojo'] as const).map(energy => (
                    <Button
                        key={energy}
                        variant={energyFilter === energy ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setEnergyFilter(energy)}
                        className={cn('capitalize', energyFilter === energy && 'shadow')}
                    >
                        {energy === 'all' ? 'Todas' : energy}
                    </Button>
                ))}
                </div>
                <Button size="lg" onClick={() => { setTaskToEdit(null); setTaskFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Añadir Tarea
                </Button>
            </div>

            <div className="mt-8">
              {tasks.length === 0 && (
                <Card className="text-center p-10">
                    <CardTitle>¡No hay tareas!</CardTitle>
                    <CardDescription className="mt-2">Puedes añadir nuevas tareas o tomarte un merecido descanso.</CardDescription>
                </Card>
              )}

              {pendingTasks.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-4">Tareas Pendientes ({pendingTasks.length})</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {pendingTasks.map((task) => (
                          <Card key={task.id} className="flex flex-col group">
                            <CardHeader className="flex flex-row justify-between items-start">
                                <CardTitle className="text-xl">{task.title}</CardTitle>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(task)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-muted-foreground">{task.description}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <div className={`flex items-center gap-2 border px-2 py-1 rounded-full text-xs font-semibold ${energyColorMap[task.energy].bg} ${energyColorMap[task.energy].text} ${energyColorMap[task.energy].border}`}>
                                    {task.energy}
                                </div>
                                <Button size="lg" className="font-bold" onClick={() => toggleTaskCompletion(task)}>
                                    <Check className="mr-2 h-4 w-4" /> ¡HECHO!
                                </Button>
                            </CardFooter>
                          </Card>
                      ))}
                  </div>
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Tareas Completadas</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {completedTasks.map((task) => (
                            <Card key={task.id} className={cn("flex flex-col transition-opacity opacity-60 hover:opacity-100 group")}>
                            <CardHeader className="flex flex-row justify-between items-start">
                                <CardTitle className="text-lg line-through">{task.title}</CardTitle>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(task)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            </CardHeader>
                            <CardFooter className="flex justify-end items-center mt-auto">
                                <Button size="sm" variant="ghost" onClick={() => toggleTaskCompletion(task)}>
                                    <Undo className="mr-2 h-4 w-4" /> Deshacer
                                </Button>
                            </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
              )}
              
              {tasks.length > 0 && pendingTasks.length === 0 && (
                <Card className="text-center p-10 mt-8">
                    <CardTitle>¡Todas las tareas completadas!</CardTitle>
                    <CardDescription className="mt-2">Buen trabajo. ¡Hora de un descanso!</CardDescription>
                </Card>
              )}
            </div>
        </TabsContent>
        <TabsContent value="routines">
             <div className="flex items-center justify-end mb-4">
                 <Button size="lg" onClick={() => setRoutineFormOpen(true)}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Crear Rutina
                </Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2"><Sun className="text-yellow-500"/> Rutinas Diarias</h2>
                    <div className="space-y-6">
                        {dailyRoutines.map(routine => <RoutineCard key={routine.id} routine={routine} members={members} onUpdate={handleRoutineUpdate} onDelete={handleDeleteRoutine} />)}
                        {dailyRoutines.length === 0 && <p className="text-muted-foreground text-center py-8">No hay rutinas diarias.</p>}
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2"><Calendar className="text-blue-500"/> Rutinas Semanales</h2>
                     <div className="space-y-6">
                        {weeklyRoutines.map(routine => <RoutineCard key={routine.id} routine={routine} members={members} onUpdate={handleRoutineUpdate} onDelete={handleDeleteRoutine} />)}
                        {weeklyRoutines.length === 0 && <p className="text-muted-foreground text-center py-8">No hay rutinas semanales.</p>}
                    </div>
                </div>
             </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
