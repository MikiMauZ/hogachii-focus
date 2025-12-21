'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import {
  doc,
  updateDoc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Users, LogOut, CheckCircle, Settings, PanelLeft, PanelTop } from 'lucide-react';
import type { UserProfile, Family } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    displayName: '',
    givenName: '',
    familyName: '',
  });
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [joinFamilyId, setJoinFamilyId] = useState('');
  const [navPosition, setNavPosition] = useState<'left' | 'top'>('left');

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || '',
        givenName: user.givenName || '',
        familyName: user.familyName || '',
      });
      setNavPosition(user.settings?.navPosition || 'left');
      if (user.familyId && firestore) {
        const familyDocRef = doc(firestore, 'families', user.familyId);
        getDoc(familyDocRef).then((docSnap) => {
          if (docSnap.exists()) {
            setFamily({ id: docSnap.id, ...docSnap.data() } as Family);
          }
        });
      } else {
        setFamily(null);
      }
    }
  }, [user, firestore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;

    setIsLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const updatedData = {
      ...profile,
      displayName: `${profile.givenName || ''} ${profile.familyName || ''}`.trim(),
      settings: {
        ...user.settings,
        navPosition: navPosition
      }
    };

    updateDoc(userDocRef, updatedData)
      .then(() => {
        toast({
          title: '¡Perfil actualizado!',
          description: 'Tu información ha sido guardada correctamente.',
        });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', contextualError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  const handleNavPositionChange = async (position: 'left' | 'top') => {
    setNavPosition(position);
     if (!user || !firestore) return;

    const userDocRef = doc(firestore, 'users', user.uid);
     await updateDoc(userDocRef, {
        "settings.navPosition": position
     });
  }

  const handleCreateFamily = async () => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const familyName = `${profile.familyName || user.displayName}'s Family`;
    const newFamilyRef = doc(collection(firestore, 'families'));
    const userDocRef = doc(firestore, 'users', user.uid);

    const newFamily: Family = {
      id: newFamilyRef.id,
      name: familyName,
      members: [user.uid],
      ownerId: user.uid,
    };

    try {
      const batch = writeBatch(firestore);
      batch.set(newFamilyRef, newFamily);
      batch.update(userDocRef, { familyId: newFamily.id });
      await batch.commit();

      setFamily(newFamily);
      toast({
        title: '¡Familia creada!',
        description: `Ahora eres parte de ${familyName}.`,
      });
    } catch (error) {
      console.error('Error creating family: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear la familia.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!user || !firestore || !joinFamilyId) return;
    setIsLoading(true);

    const familyDocRef = doc(firestore, 'families', joinFamilyId);
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
      const familyDoc = await getDoc(familyDocRef);
      if (!familyDoc.exists()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se encontró una familia con ese ID.',
        });
        return;
      }

      const familyData = familyDoc.data() as Family;
      const batch = writeBatch(firestore);
      batch.update(familyDocRef, { members: [...familyData.members, user.uid] });
      batch.update(userDocRef, { familyId: joinFamilyId });
      await batch.commit();

      setFamily({ id: familyDoc.id, ...familyData } as Family);
      toast({
        title: '¡Te has unido a la familia!',
        description: `Ahora eres parte de ${familyData.name}.`,
      });
    } catch (error) {
      console.error('Error joining family: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo unir a la familia.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveFamily = async () => {
     if (!user || !firestore || !family) return;
     setIsLoading(true);

     const familyDocRef = doc(firestore, 'families', family.id);
     const userDocRef = doc(firestore, 'users', user.uid);

     const updatedMembers = family.members.filter(uid => uid !== user.uid);

     try {
        const batch = writeBatch(firestore);
        batch.update(userDocRef, { familyId: null });
        
        if (updatedMembers.length === 0) {
            // Delete family if last member leaves
            batch.delete(familyDocRef);
        } else {
             batch.update(familyDocRef, { members: updatedMembers });
        }
        await batch.commit();

        setFamily(null);
        toast({ title: 'Has abandonado la familia.' });

     } catch(error) {
        console.error("Error leaving family: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo abandonar la familia."});
     } finally {
        setIsLoading(false);
     }
  };
  
  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  if (isUserLoading) {
    return <div>Cargando perfil...</div>;
  }

  if (!user) {
    // This part should ideally not be reached if middleware is set up correctly
    return <div>No se ha encontrado el usuario. Por favor, inicia sesión.</div>;
  }

  return (
    <div className="grid gap-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-background">
            <AvatarImage
              src={user.photoURL || ''}
              alt={user.displayName || 'Avatar'}
            />
            <AvatarFallback className="text-4xl">
              {profile.givenName?.charAt(0) || <UserIcon size={40} />}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{user.displayName}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="givenName">Nombre</Label>
                <Input
                  id="givenName"
                  name="givenName"
                  value={profile.givenName || ''}
                  onChange={handleInputChange}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="familyName">Apellido</Label>
                <Input
                  id="familyName"
                  name="familyName"
                  value={profile.familyName || ''}
                  onChange={handleInputChange}
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5"/>
                Ajustes de Interfaz
            </CardTitle>
            <CardDescription>Personaliza la apariencia de la aplicación.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <Label>Posición de la barra de navegación</Label>
                <RadioGroup value={navPosition} onValueChange={(val: 'left' | 'top') => handleNavPositionChange(val)} className="flex gap-4">
                    <Label htmlFor="nav-left" className={cn("flex flex-col items-center justify-center gap-2 rounded-lg p-4 border-2 cursor-pointer w-full", navPosition === 'left' && "border-primary")}>
                         <RadioGroupItem value="left" id="nav-left" className="sr-only"/>
                         <PanelLeft className="h-8 w-8" />
                         <span className="font-semibold">Izquierda</span>
                    </Label>
                    <Label htmlFor="nav-top" className={cn("flex flex-col items-center justify-center gap-2 rounded-lg p-4 border-2 cursor-pointer w-full", navPosition === 'top' && "border-primary")}>
                         <RadioGroupItem value="top" id="nav-top" className="sr-only"/>
                         <PanelTop className="h-8 w-8" />
                         <span className="font-semibold">Superior</span>
                    </Label>
                </RadioGroup>
            </div>
        </CardContent>
       </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestión Familiar</CardTitle>
          <CardDescription>
            {family
              ? `Perteneces a la familia "${family.name}".`
              : 'Únete a una familia o crea una nueva para compartir calendarios, tareas y más.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {family ? (
            <div className="space-y-4">
               <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">Tu ID de familia es: <code className="bg-green-100 p-1 rounded">{family.id}</code></p>
               </div>
               <p className="text-sm text-muted-foreground">Comparte este ID con otros para que puedan unirse.</p>
               <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">Abandonar Familia</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Si abandonas la familia, perderás el acceso a todos los datos compartidos. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeaveFamily}>Sí, abandonar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
          ) : (
            <div className="space-y-4">
              <Button onClick={handleCreateFamily} className="w-full" disabled={isLoading}>
                <Users className="mr-2 h-4 w-4" />
                {isLoading ? 'Creando...' : 'Crear una Familia Nueva'}
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Introduce un ID de familia"
                  value={joinFamilyId}
                  onChange={(e) => setJoinFamilyId(e.target.value)}
                  disabled={isLoading}
                />
                <Button variant="secondary" onClick={handleJoinFamily} disabled={isLoading || !joinFamilyId}>
                  {isLoading ? 'Uniéndose...' : 'Unirse'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4"/>
                Cerrar Sesión
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
