'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  PlusCircle,
  BookOpen,
  Trash2,
  Pencil,
  Book,
  BookCheck,
  BookPlus,
  CalendarDays,
} from 'lucide-react';
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
import { useFirestore, useUser } from '@/firebase';
import type { Reading } from '@/lib/types';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Dialog for adding/editing a Reading item
const ReadingDialog = ({
  open,
  onOpenChange,
  itemToEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit: Reading | null;
}) => {
  const firestore = useFirestore();
  const { data: user } = useUser();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [status, setStatus] = useState<Reading['status']>('to-read');

  useEffect(() => {
    if (itemToEdit) {
      setTitle(itemToEdit.title);
      setAuthor(itemToEdit.author || '');
      setTotalPages(itemToEdit.totalPages?.toString() || '');
      setCurrentPage(itemToEdit.currentPage?.toString() || '');
      setStatus(itemToEdit.status);
    } else {
      setTitle('');
      setAuthor('');
      setTotalPages('');
      setCurrentPage('');
      setStatus('to-read');
    }
  }, [itemToEdit]);

  const handleSave = async () => {
    if (!title || !firestore || !user?.familyId) return;

    const readingData: Partial<Reading> = {
      title,
      status,
      familyId: user.familyId,
      userId: user.uid,
    };
    
    if (author) readingData.author = author;
    if (totalPages) readingData.totalPages = parseInt(totalPages, 10);
    if (currentPage) readingData.currentPage = parseInt(currentPage, 10); else readingData.currentPage = 0;
    
    // Auto-set dates based on status change
    if (itemToEdit) {
      // If status changes to 'reading' for the first time, set start date
      if (status === 'reading' && itemToEdit.status !== 'reading') {
        readingData.startDate = Timestamp.now();
      }
      // If status changes to 'finished', set finish date
      if (status === 'finished' && itemToEdit.status !== 'finished') {
        readingData.finishDate = Timestamp.now();
        // Also set currentPage to totalPages if finished
        if(readingData.totalPages) readingData.currentPage = readingData.totalPages;
      }
    } else {
       if (status === 'reading') {
        readingData.startDate = Timestamp.now();
      }
       if (status === 'finished') {
        readingData.finishDate = Timestamp.now();
        if(readingData.totalPages) readingData.currentPage = readingData.totalPages;
      }
    }


    if (itemToEdit) {
      await updateDoc(
        doc(firestore, 'families', user.familyId, 'readings', itemToEdit.id!),
        readingData
      );
    } else {
      await addDoc(
        collection(firestore, 'families', user.familyId, 'readings'),
        readingData
      );
    }
    onOpenChange(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {itemToEdit ? 'Editar Lectura' : 'Añadir Nueva Lectura'}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Título del Libro</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Cien años de soledad"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="author">Autor (opcional)</Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Ej: Gabriel García Márquez"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="totalPages">Páginas Totales (opcional)</Label>
            <Input
              id="totalPages"
              type="number"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              placeholder="496"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currentPage">Página Actual (opcional)</Label>
            <Input
              id="currentPage"
              type="number"
              value={currentPage}
              onChange={(e) => setCurrentPage(e.target.value)}
              placeholder="50"
            />
          </div>
        </div>
         <div className="grid gap-2">
            <Label htmlFor="status">Estado</Label>
            <Select onValueChange={(v: Reading['status']) => setStatus(v)} value={status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="to-read">Por Leer</SelectItem>
                    <SelectItem value="reading">Leyendo</SelectItem>
                    <SelectItem value="finished">Terminado</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave}>Guardar Lectura</Button>
      </DialogFooter>
    </DialogContent>
  );
};


export default function ReadingPage() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isReadingDialogOpen, setReadingDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState<Reading | null>(null);

  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const readingsQuery = query(
      collection(firestore, 'families', user.familyId, 'readings'),
      orderBy('title')
    );
    const unsubscribe = onSnapshot(readingsQuery, (snapshot) => {
      setReadings(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reading))
      );
    });

    return () => unsubscribe();
  }, [firestore, user]);
  
  const handleDelete = async (id: string) => {
      if (!firestore || !user?.familyId) return;
      await deleteDoc(doc(firestore, 'families', user.familyId, 'readings', id));
  }

  const handleEditReading = (item: Reading) => {
    setEditingReading(item);
    setReadingDialogOpen(true);
  };
  
  const readingsByStatus = {
    reading: readings.filter(r => r.status === 'reading'),
    'to-read': readings.filter(r => r.status === 'to-read'),
    finished: readings.filter(r => r.status === 'finished'),
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mis Lecturas</h1>
        <Dialog open={isReadingDialogOpen} onOpenChange={setReadingDialogOpen}>
            <DialogTrigger asChild>
                <Button size="lg" onClick={() => { setEditingReading(null); setReadingDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Añadir Lectura
                </Button>
            </DialogTrigger>
            <ReadingDialog
                open={isReadingDialogOpen}
                onOpenChange={setReadingDialogOpen}
                itemToEdit={editingReading}
            />
        </Dialog>
      </div>

      <Tabs defaultValue="reading">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reading">
            <BookOpen className="mr-2 h-4 w-4" /> Leyendo ({readingsByStatus.reading.length})
          </TabsTrigger>
          <TabsTrigger value="to-read">
            <BookPlus className="mr-2 h-4 w-4" /> Por Leer ({readingsByStatus['to-read'].length})
          </TabsTrigger>
          <TabsTrigger value="finished">
            <BookCheck className="mr-2 h-4 w-4" /> Terminados ({readingsByStatus.finished.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reading" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {readingsByStatus.reading.map((item) => {
               const progress = item.totalPages && item.currentPage ? (item.currentPage / item.totalPages) * 100 : 0;
               return (
                <Card key={item.id} className="flex flex-col">
                    <CardHeader>
                        <CardTitle>{item.title}</CardTitle>
                        {item.author && (
                            <CardDescription>{item.author}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                       {item.totalPages && (
                         <div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                Página {item.currentPage || 0} de {item.totalPages} ({progress.toFixed(0)}%)
                            </p>
                         </div>
                       )}
                       {item.startDate && (
                           <div className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
                               <CalendarDays className="h-4 w-4" />
                               <span>Empezado el {format((item.startDate as Timestamp).toDate(), 'dd/MM/yy', { locale: es })}</span>
                           </div>
                       )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditReading(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </CardFooter>
                </Card>
               )
            })}
             {readingsByStatus.reading.length === 0 && <p className="text-center text-muted-foreground py-8 md:col-span-3">No estás leyendo ningún libro ahora mismo.</p>}
          </div>
        </TabsContent>

        <TabsContent value="to-read" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {readingsByStatus['to-read'].map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  {item.author && (
                    <CardDescription>{item.author}</CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="flex justify-end mt-auto gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditReading(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardFooter>
              </Card>
            ))}
             {readingsByStatus['to-read'].length === 0 && <p className="text-center text-muted-foreground py-8 md:col-span-3">Tu lista de próximos libros está vacía.</p>}
          </div>
        </TabsContent>
        
         <TabsContent value="finished" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {readingsByStatus.finished.map((item) => (
              <Card key={item.id} className="flex flex-col bg-muted/40">
                <CardHeader>
                  <CardTitle className="line-through text-muted-foreground">{item.title}</CardTitle>
                  {item.author && (
                    <CardDescription className="line-through">{item.author}</CardDescription>
                  )}
                </CardHeader>
                 <CardContent className="flex-grow">
                     {item.finishDate && (
                           <div className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
                               <CalendarDays className="h-4 w-4" />
                               <span>Terminado el {format((item.finishDate as Timestamp).toDate(), 'dd/MM/yy', { locale: es })}</span>
                           </div>
                       )}
                </CardContent>
                <CardFooter className="flex justify-end mt-auto gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditReading(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardFooter>
              </Card>
            ))}
             {readingsByStatus.finished.length === 0 && <p className="text-center text-muted-foreground py-8 md:col-span-3">Aún no has terminado ningún libro.</p>}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
