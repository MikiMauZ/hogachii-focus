'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  writeBatch,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  getDocs,
  where,
  query
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
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Users, LogOut, CheckCircle, Settings, PanelLeft, PanelTop, Check, X, Bell } from 'lucide-react';
import type { UserProfile, Family, Reward } from '@/lib/types';
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
import { Separator } from '@/components/ui/separator';

const defaultRewards: Omit<Reward, 'id' | 'familyId' | 'emoji'>[] = [
  { name: 'Elegir película', pointsCost: 50 },
  { name: 'Pedir comida favorita', pointsCost: 100 },
  { name: 'Día sin tareas', pointsCost: 150 },
  { name: 'Compra pequeña', pointsCost: 200 },
  { name: 'Salida especial', pointsCost: 300 },
];
const defaultRewardEmojis = ['🎬', '🍕', '🏖️', '🎁', '🎉'];

const CreateMemberDialog = ({ family, onMemberCreated }: { family: Family, onMemberCreated: () => void }) => {
    const [givenName, setGivenName] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const firestore = useFirestore();

    const handleCreateMember = async () => {
        if (!firestore || !family || !givenName || !familyName || isSaving) return;
        setIsSaving(true);
        
        try {
            // This creates a new document reference with a unique ID in the 'users' collection
            const newUserRef = doc(collection(firestore, 'users'));
            const familyRef = doc(firestore, 'families', family.id);

            const newUserProfile: UserProfile = {
                uid: newUserRef.id, // The new unique ID for this 'virtual' user
                email: null,
                displayName: `${givenName} ${familyName}`.trim(),
                photoURL: null,
                familyId: family.id,
                givenName: givenName,
                familyName: familyName,
                points: 0,
                level: 1,
                streak: 0,
                avatar: avatar || '👤',
            };
            
            const batch = writeBatch(firestore);
            batch.set(newUserRef, newUserProfile); // Create the new user profile
            batch.update(familyRef, { members: arrayUnion(newUserRef.id) }); // Add them to the family

            await batch.commit();

            toast({ title: "Miembro creado", description: `${newUserProfile.displayName} ha sido añadido a la familia.` });
            onMemberCreated();
        } catch (error) {
             console.error("Error creating member profile: ", error);
             toast({ variant: "destructive", title: "Error", description: "No se pudo crear el perfil del miembro." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Crear Nuevo Perfil de Miembro</DialogTitle>
                <CardDescription>Crea un perfil para un miembro de la familia (ej. un niño). Este perfil no tendrá una cuenta de inicio de sesión.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-givenName">Nombre</Label>
                        <Input id="new-givenName" value={givenName} onChange={(e) => setGivenName(e.target.value)} placeholder="Nombre del miembro" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-familyName">Apellido</Label>
                        <Input id="new-familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Apellido del miembro" />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-avatar">Emoji del Avatar</Label>
                    <Input id="new-avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="👤" maxLength={2} />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleCreateMember} disabled={isSaving || !givenName || !familyName}>
                    {isSaving ? 'Creando...' : 'Crear Perfil'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
};


const FamilyAdminSection = ({ family, members, pendingMembers, ownerId, onMemberChange }: { family: Family, members: UserProfile[], pendingMembers: UserProfile[], ownerId: string, onMemberChange: () => void }) => {
    const firestore = useFirestore();
    const { data: user } = useUser();
    const [isCreateMemberOpen, setCreateMemberOpen] = useState(false);
    
    if (!user || user.uid !== ownerId) return null;

    const handleCreateMember = () => {
        setCreateMemberOpen(false);
        onMemberChange();
    };

    const handleApprove = (memberToApprove: UserProfile) => {
        if (!firestore || !family) return;
        const familyRef = doc(firestore, 'families', family.id);
        const userRef = doc(firestore, 'users', memberToApprove.uid);
        
        const batch = writeBatch(firestore);
        
        batch.update(familyRef, {
            members: arrayUnion(memberToApprove.uid),
            pendingMembers: arrayRemove(memberToApprove.uid)
        });
        batch.update(userRef, { familyId: family.id });

        batch.commit()
          .then(() => {
            toast({ title: "Miembro Aprobado", description: `${memberToApprove.displayName} ahora es parte de la familia.` });
          })
          .catch(error => {
              const contextualError = new FirestorePermissionError({
                  path: familyRef.path, // We can report the family ref, it's the most likely source
                  operation: 'update',
                  requestResourceData: { 
                      members: arrayUnion(memberToApprove.uid),
                      pendingMembers: arrayRemove(memberToApprove.uid)
                  }
              });
              errorEmitter.emit('permission-error', contextualError);
          });
    };

    const handleReject = (memberToReject: UserProfile) => {
         if (!firestore || !family) return;
        const familyRef = doc(firestore, 'families', family.id);
        
        updateDoc(familyRef, {
            pendingMembers: arrayRemove(memberToReject.uid)
        }).then(() => {
          toast({ title: "Solicitud Rechazada" });
        }).catch(error => {
           const contextualError = new FirestorePermissionError({
              path: familyRef.path,
              operation: 'update',
              requestResourceData: { pendingMembers: arrayRemove(memberToReject.uid) }
           });
           errorEmitter.emit('permission-error', contextualError);
        });
    };

    const handleRemoveMember = (memberToRemove: UserProfile) => {
        if (!firestore || !family || memberToRemove.uid === ownerId) return; // Can't remove owner
        const familyRef = doc(firestore, 'families', family.id);
        const userRef = doc(firestore, 'users', memberToRemove.uid);
        
        const batch = writeBatch(firestore);
        batch.update(familyRef, { members: arrayRemove(memberToRemove.uid) });
        // Only set familyId to null if the user has a real account. Virtual profiles should be deleted.
        if (memberToRemove.email) {
            batch.update(userRef, { familyId: null });
        } else {
            batch.delete(userRef);
        }


        batch.commit()
          .then(() => {
            toast({ title: "Miembro Eliminado", description: `${memberToRemove.displayName} ya no es parte de la familia.` });
          })
          .catch(error => {
              const contextualError = new FirestorePermissionError({
                  path: familyRef.path,
                  operation: 'update',
                  requestResourceData: { members: arrayRemove(memberToRemove.uid) }
              });
              errorEmitter.emit('permission-error', contextualError);
          });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Administración de Familia</CardTitle>
                <CardDescription>Gestiona los miembros y las solicitudes de tu familia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {pendingMembers.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-primary"/> Solicitudes Pendientes</h3>
                        {pendingMembers.map(member => (
                            <div key={member.uid} className="flex items-center justify-between p-3 rounded-md border">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.photoURL || ''} alt={member.displayName || ''} />
                                        <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{member.displayName}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleApprove(member)}><Check className="h-4 w-4 mr-2"/> Aprobar</Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleReject(member)}><X className="h-4 w-4 mr-2"/> Rechazar</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold">Miembros Actuales</h3>
                        <Dialog open={isCreateMemberOpen} onOpenChange={setCreateMemberOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">Crear Perfil</Button>
                            </DialogTrigger>
                            <CreateMemberDialog family={family} onMemberCreated={handleCreateMember} />
                        </Dialog>
                    </div>
                     {members.map(member => (
                        <div key={member.uid} className="flex items-center justify-between p-3 rounded-md">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.photoURL || ''} alt={member.displayName || ''} />
                                     <AvatarFallback>{member.avatar || member.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{member.displayName} {member.uid === ownerId && <span className="text-xs text-muted-foreground">(Admin)</span>}</span>
                            </div>
                             {member.uid !== ownerId && (
                                 <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">Eliminar</Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar a {member.displayName}?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta acción es irreversible y expulsará al miembro de la familia. Si es un perfil virtual sin cuenta, será eliminado permanentemente.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveMember(member)}>Sí, eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                     </AlertDialogContent>
                                 </AlertDialog>
                             )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export default function ProfilePage() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    displayName: '',
    givenName: '',
    familyName: '',
    avatar: '👤'
  });
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [pendingFamilyMembers, setPendingFamilyMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joinFamilyId, setJoinFamilyId] = useState('');
  const [navPosition, setNavPosition] = useState<'left' | 'top'>('left');
  
  const fetchMembers = async (memberIds: string[] | undefined, setState: React.Dispatch<React.SetStateAction<UserProfile[]>>) => {
    if (!firestore || !memberIds || memberIds.length === 0) {
      setState([]);
      return;
    }
    try {
      const membersRef = collection(firestore, 'users');
      const q = query(membersRef, where('uid', 'in', memberIds));
      const querySnapshot = await getDocs(q);
      const membersData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setState(membersData);
    } catch (error) {
        console.warn("Permission error fetching user profiles. This is expected if the current user isn't an approved member.", error);
        setState([]);
    }
  };

  const refreshFamilyMembers = () => {
    if (family) {
        fetchMembers(family.members, setFamilyMembers);
    }
  };
  
  // Effect to fetch family data
  useEffect(() => {
    if (!user || !user.familyId || !firestore) {
        setFamily(null);
        return;
    };

    const familyDocRef = doc(firestore, 'families', user.familyId);
    const unsubscribe = onSnapshot(familyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setFamily({ id: docSnap.id, ...docSnap.data() } as Family);
      } else {
        setFamily(null);
      }
    }, (error) => {
        console.warn("User does not have permissions to read family document (might be a pending member) or an error occurred.", error.message);
        setFamily(null);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Effect to fetch family members (approved and pending)
  useEffect(() => {
    if (!family || !firestore) {
      setFamilyMembers([]);
      setPendingFamilyMembers([]);
      return;
    }

    fetchMembers(family.members, setFamilyMembers);
    fetchMembers(family.pendingMembers, setPendingFamilyMembers);

  }, [family, firestore]);

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || '',
        givenName: user.givenName || '',
        familyName: user.familyName || '',
        avatar: user.avatar || '👤',
      });
      setNavPosition(user.settings?.navPosition || 'left');
    }
  }, [user]);

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
  
  const handleNavPositionChange = (position: 'left' | 'top') => {
    setNavPosition(position);
     if (!user || !firestore) return;

    const userDocRef = doc(firestore, 'users', user.uid);
     updateDoc(userDocRef, {
        "settings.navPosition": position
     }).catch(error => {
        const contextualError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: { "settings.navPosition": position }
        });
        errorEmitter.emit('permission-error', contextualError);
     });
  }

  const handleCreateFamily = () => {
    if (!user || !firestore) return;
    setIsLoading(true);

    const familyName = `${profile.familyName || user.displayName}'s Family`;
    const newFamilyRef = doc(collection(firestore, 'families'));

    const newFamily: Omit<Family, 'id'> = {
      name: familyName,
      members: [user.uid],
      pendingMembers: [],
      ownerId: user.uid,
    };

    const batch = writeBatch(firestore);
    batch.set(newFamilyRef, newFamily);
    batch.update(doc(firestore, 'users', user.uid), { familyId: newFamilyRef.id });

    const rewardsCollection = collection(firestore, 'families', newFamilyRef.id, 'rewards');
    defaultRewards.forEach((reward, index) => {
      const newRewardRef = doc(rewardsCollection);
      batch.set(newRewardRef, {...reward, emoji: defaultRewardEmojis[index]});
    });

    batch.commit()
      .then(() => {
        toast({
          title: '¡Familia creada!',
          description: `Ahora eres parte de ${familyName}.`,
        });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: newFamilyRef.path,
          operation: 'create',
          requestResourceData: newFamily,
        });
        errorEmitter.emit('permission-error', contextualError);
        console.error('Error creating family: ', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo crear la familia.',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleJoinFamily = async () => {
    if (!user || !firestore || !joinFamilyId) return;
    setIsLoading(true);

    const familyDocRef = doc(firestore, 'families', joinFamilyId);

    try {
      const familyDoc = await getDoc(familyDocRef);
      if (!familyDoc.exists()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se encontró una familia con ese ID.',
        });
        setIsLoading(false);
        return;
      }
      
      const familyData = familyDoc.data() as Family;
      if (familyData.members.includes(user.uid) || familyData.pendingMembers.includes(user.uid)) {
          toast({ title: 'Ya has solicitado unirte o ya eres miembro.' });
          setIsLoading(false);
          return;
      }

      updateDoc(familyDocRef, {
          pendingMembers: arrayUnion(user.uid)
      }).then(() => {
         toast({
          title: '¡Solicitud enviada!',
          description: `El administrador de la familia "${familyData.name}" ha sido notificado.`,
        });
      }).catch(error => {
         const contextualError = new FirestorePermissionError({
              path: familyDocRef.path,
              operation: 'update',
              requestResourceData: { pendingMembers: arrayUnion(user.uid) }
           });
         errorEmitter.emit('permission-error', contextualError);
      })
      
    } catch (error) {
      console.error('Error requesting to join family: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo enviar la solicitud para unirse a la familia.',
      });
    } finally {
      setIsLoading(false);
      setJoinFamilyId('');
    }
  };

  const handleLeaveFamily = () => {
     if (!user || !firestore || !family) return;
     setIsLoading(true);

     const familyDocRef = doc(firestore, 'families', family.id);
     const userDocRef = doc(firestore, 'users', user.uid);

     const updatedMembers = family.members.filter(uid => uid !== user.uid);

     const batch = writeBatch(firestore);
     batch.update(userDocRef, { familyId: null });
     
     if (updatedMembers.length === 0) {
         // Delete family if last member leaves
         batch.delete(familyDocRef);
     } else {
          // If the owner is leaving, assign a new owner
         let newOwnerId = family.ownerId;
         if (user.uid === family.ownerId) {
             newOwnerId = updatedMembers[0]; // Assign the next member as owner
         }
          batch.update(familyDocRef, { 
              members: arrayRemove(user.uid),
              ownerId: newOwnerId
         });
     }
     
     batch.commit().then(() => {
        setFamily(null);
        toast({ title: 'Has abandonado la familia.' });
     }).catch(error => {
        const contextualError = new FirestorePermissionError({
            path: familyDocRef.path,
            operation: 'update',
        });
        errorEmitter.emit('permission-error', contextualError);
        console.error("Error leaving family: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo abandonar la familia."});
     }).finally(() => {
        setIsLoading(false);
     });
  };
  
  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  if (isUserLoading) {
    return <div>Cargando perfil...</div>;
  }

  if (!user) {
    // This part should ideally not be reached if middleware is set up correctly
    return <div>No se ha encontrado el usuario. Por favor, inicia sesión.</div>;
  }

  const isFamilyOwner = family?.ownerId === user.uid;

  return (
    <div className="grid gap-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-background text-6xl">
             <AvatarImage
              src={user.photoURL || ''}
              alt={user.displayName || 'Avatar'}
            />
            <AvatarFallback className="bg-muted">
              {profile.avatar || <UserIcon size={40} />}
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
             <div className="space-y-2">
              <Label htmlFor="avatar">Tu Emoji de Avatar</Label>
              <Input
                id="avatar"
                name="avatar"
                value={profile.avatar || ''}
                onChange={handleInputChange}
                placeholder="Ej: 👨‍👩‍👧‍👦, 🚀, etc."
                maxLength={2}
              />
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
      
      {family && isFamilyOwner && (
        <FamilyAdminSection family={family} members={familyMembers} pendingMembers={pendingFamilyMembers} ownerId={family.ownerId} onMemberChange={refreshFamilyMembers} />
      )}

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
               <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-medium">ID de invitación de tu familia: <code className="bg-blue-100 p-1 rounded">{family.id}</code></p>
               </div>
               <p className="text-sm text-muted-foreground">Comparte este ID con otros para que puedan solicitar unirse.</p>
               <Separator />
               <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">Abandonar Familia</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Si abandonas la familia, perderás el acceso a todos los datos compartidos. Si eres el administrador, se asignará a otro miembro.
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
              <Separator />
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Introduce un ID de familia para unirte"
                  value={joinFamilyId}
                  onChange={(e) => setJoinFamilyId(e.target.value)}
                  disabled={isLoading}
                />
                <Button variant="secondary" onClick={handleJoinFamily} disabled={isLoading || !joinFamilyId}>
                  {isLoading ? 'Solicitando...' : 'Solicitar Unirse'}
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
