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
import { PlusCircle, Check, Undo } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

const energyColorMap: { [key: string]: string } = {
  Verde: 'bg-green-500',
  Amarillo: 'bg-yellow-500',
  Rojo: 'bg-red-500',
};

const AddTaskDialog = ({ open, onOpenChange, onTaskAdded }: { open: boolean, onOpenChange: (open: boolean) => void, onTaskAdded: () => void }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [energy, setEnergy] = useState<'Verde' | 'Amarillo' | 'Rojo'>('Amarillo');
    const firestore = useFirestore();
    const { data: user } = useUser();

    const handleAddTask = async () => {
        if (!title.trim() || !firestore || !user?.familyId) return;

        const newTask: Omit<Task, 'id'> = {
            title: title.trim(),
            description: description.trim(),
            energy,
            completed: false,
            userId: user.uid,
            familyId: user.familyId,
        };

        await addDoc(collection(firestore, 'families', user.familyId, 'tasks'), newTask);
        
        setTitle('');
        setDescription('');
        setEnergy('Amarillo');
        onTaskAdded();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Crear Nueva Tarea</DialogTitle>
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
                    <Select onValueChange={(value: Task['energy']) => setEnergy(value)} defaultValue={energy}>
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
                <Button onClick={handleAddTask}>Añadir Tarea</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const tasksQuery = query(collection(firestore, 'families', user.familyId, 'tasks'), orderBy('completed'));
    
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(fetchedTasks);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const toggleTaskCompletion = async (task: Task) => {
    if (!firestore || !user?.familyId || !task.id) return;
    const taskRef = doc(firestore, 'families', user.familyId, 'tasks', task.id);
    await updateDoc(taskRef, { completed: !task.completed });
  };

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <p className="text-lg text-muted-foreground">
            {pendingTasks.length > 0 ? `Concéntrate en estas ${pendingTasks.length} tareas. ¡Tú puedes!` : ''}
        </p>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Añadir Tarea
                </Button>
            </DialogTrigger>
            <AddTaskDialog open={isFormOpen} onOpenChange={setFormOpen} onTaskAdded={() => setFormOpen(false)} />
        </Dialog>
      </div>

      {tasks.length === 0 && (
         <Card className="text-center p-10">
            <CardTitle>¡No hay tareas pendientes!</CardTitle>
            <CardDescription className="mt-2">Puedes añadir nuevas tareas o tomarte un merecido descanso.</CardDescription>
        </Card>
      )}

      {pendingTasks.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingTasks.map((task) => (
                <Card key={task.id} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-muted-foreground">{task.description}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                    <span
                        className={`h-3 w-3 rounded-full ${
                        energyColorMap[task.energy]
                        }`}
                    ></span>
                    <span className="text-sm text-muted-foreground">{task.energy}</span>
                    </div>
                    <Button size="lg" className="font-bold" onClick={() => toggleTaskCompletion(task)}>
                        <Check className="mr-2 h-4 w-4" /> ¡HECHO!
                    </Button>
                </CardFooter>
                </Card>
            ))}
        </div>
      )}

      {completedTasks.length > 0 && (
         <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Tareas Completadas</h2>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedTasks.map((task) => (
                    <Card key={task.id} className={cn("flex flex-col transition-opacity opacity-60 hover:opacity-100")}>
                    <CardHeader>
                        <CardTitle className="text-lg line-through">{task.title}</CardTitle>
                    </CardHeader>
                    <CardFooter className="flex justify-end items-center">
                        <Button size="sm" variant="ghost" onClick={() => toggleTaskCompletion(task)}>
                            <Undo className="mr-2 h-4 w-4" /> Deshacer
                        </Button>
                    </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
