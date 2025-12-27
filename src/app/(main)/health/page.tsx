'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, User, Calendar, Pill, Syringe, HeartPulse, Trash2, Pencil, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import type { Appointment, Medication, MedicalProfile, UserProfile, Vaccine } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type FamilyMember = {
    uid: string;
    name: string;
}

const AppointmentDialog = ({
    members,
    onClose,
    itemToEdit,
}: {
    members: FamilyMember[],
    onClose: () => void,
    itemToEdit: Appointment | null,
}) => {
    const firestore = useFirestore();
    const { data: user } = useUser();
    
    const [memberId, setMemberId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [specialist, setSpecialist] = useState('');
    const [reason, setReason] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [status, setStatus] = useState<'confirmada' | 'pendiente' | 'cancelada'>('pendiente');

    useEffect(() => {
        if (itemToEdit) {
            setMemberId(itemToEdit.memberId);
            setSpecialist(itemToEdit.specialist);
            setReason(itemToEdit.reason);
            const itemDate = (itemToEdit.date as Timestamp).toDate();
            setDate(format(itemDate, 'yyyy-MM-dd'));
            setTime(format(itemDate, 'HH:mm'));
            setStatus(itemToEdit.status);
        } else {
            setMemberId('');
            setSpecialist('');
            setReason('');
            setDate('');
            setTime('');
            setStatus('pendiente');
        }
    }, [itemToEdit]);

    const handleSave = async () => {
        if (!firestore || !user?.familyId || !memberId || !specialist || !date || !time || isSaving) return;
        setIsSaving(true);

        const memberName = members.find(m => m.uid === memberId)?.name || 'Desconocido';
        const combinedDate = new Date(`${date}T${time}`);
        
        const data: Omit<Appointment, 'id'> = { 
            specialist, 
            reason, 
            date: Timestamp.fromDate(combinedDate), 
            status, 
            memberId, 
            memberName,
        };

        try {
            if (itemToEdit) {
                await updateDoc(doc(firestore, 'families', user.familyId, 'appointments', itemToEdit.id!), data);
            } else {
                await addDoc(collection(firestore, 'families', user.familyId, 'appointments'), data);
            }
            onClose();
        } catch (error) {
            console.error("Error saving appointment: ", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{itemToEdit ? `Editar Cita` : 'Añadir Nueva Cita'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="grid gap-2">
                    <Label htmlFor="member">Miembro</Label>
                    <Select onValueChange={setMemberId} value={memberId}>
                        <SelectTrigger><SelectValue placeholder="¿Para quién es?" /></SelectTrigger>
                        <SelectContent>
                            {members.map(member => (
                                <SelectItem key={member.uid} value={member.uid}>{member.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="specialist">Especialista</Label>
                    <Input id="specialist" value={specialist} onChange={e => setSpecialist(e.target.value)} placeholder="Ej: Pediatra, Dentista..." />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="reason">Motivo</Label>
                    <Input id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Revisión anual" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="time">Hora</Label>
                        <Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select onValueChange={(v: Appointment['status']) => setStatus(v)} value={status}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="confirmada">Confirmada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {itemToEdit ? 'Guardar Cambios' : 'Añadir Cita'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

const MedicationDialog = ({
    members,
    onClose,
    itemToEdit,
}: {
    members: FamilyMember[],
    onClose: () => void,
    itemToEdit: Medication | null,
}) => {
    const firestore = useFirestore();
    const { data: user } = useUser();
    
    const [memberId, setMemberId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [medName, setMedName] = useState('');
    const [dose, setDose] = useState('');
    const [duration, setDuration] = useState('');

    useEffect(() => {
        if (itemToEdit) {
            setMemberId(itemToEdit.memberId);
            setMedName(itemToEdit.name);
            setDose(itemToEdit.dose);
            setDuration(itemToEdit.duration);
        } else {
            setMemberId('');
            setMedName('');
            setDose('');
            setDuration('');
        }
    }, [itemToEdit]);

    const handleSave = async () => {
        if (!firestore || !user?.familyId || !memberId || !medName || !dose || isSaving) return;
        setIsSaving(true);

        const memberName = members.find(m => m.uid === memberId)?.name || 'Desconocido';
        const data: Omit<Medication, 'id'> = { name: medName, dose, duration, memberId, memberName };

        try {
            if (itemToEdit) {
                await updateDoc(doc(firestore, 'families', user.familyId, 'medications', itemToEdit.id!), data);
            } else {
                await addDoc(collection(firestore, 'families', user.familyId, 'medications'), data);
            }
            onClose();
        } catch (error) {
            console.error("Error saving medication: ", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{itemToEdit ? `Editar Medicamento` : 'Añadir Nuevo Medicamento'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="member">Miembro</Label>
                    <Select onValueChange={setMemberId} value={memberId}>
                        <SelectTrigger><SelectValue placeholder="¿Para quién es?" /></SelectTrigger>
                        <SelectContent>
                            {members.map(member => (
                                <SelectItem key={member.uid} value={member.uid}>{member.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="medName">Nombre del Medicamento</Label>
                    <Input id="medName" value={medName} onChange={e => setMedName(e.target.value)} placeholder="Ej: Ibuprofeno" />
                </div>
                    <div className="grid gap-2">
                    <Label htmlFor="dose">Dosis</Label>
                    <Input id="dose" value={dose} onChange={e => setDose(e.target.value)} placeholder="Ej: 5ml / 8 horas" />
                </div>
                    <div className="grid gap-2">
                    <Label htmlFor="duration">Duración</Label>
                    <Input id="duration" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ej: 7 días" />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {itemToEdit ? 'Guardar Cambios' : 'Añadir Medicamento'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

const VaccineDialog = ({
    members,
    onClose,
    itemToEdit,
}: {
    members: FamilyMember[],
    onClose: () => void,
    itemToEdit: Vaccine | null,
}) => {
    const firestore = useFirestore();
    const { data: user } = useUser();
    
    const [memberId, setMemberId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [vaccineName, setVaccineName] = useState('');
    const [dose, setDose] = useState('');
    const [date, setDate] = useState('');

    useEffect(() => {
        if (itemToEdit) {
            setMemberId(itemToEdit.memberId);
            setVaccineName(itemToEdit.name);
            setDose(itemToEdit.dose);
            const itemDate = (itemToEdit.date as Timestamp).toDate();
            setDate(format(itemDate, 'yyyy-MM-dd'));
        } else {
            setMemberId('');
            setVaccineName('');
            setDose('');
            setDate('');
        }
    }, [itemToEdit]);

    const handleSave = async () => {
        if (!firestore || !user?.familyId || !memberId || !vaccineName || !date || isSaving) return;
        setIsSaving(true);

        const memberName = members.find(m => m.uid === memberId)?.name || 'Desconocido';
        const data: Omit<Vaccine, 'id'> = { 
            name: vaccineName, 
            dose, 
            date: Timestamp.fromDate(new Date(date)), 
            memberId, 
            memberName,
        };

        try {
            if (itemToEdit) {
                await updateDoc(doc(firestore, 'families', user.familyId, 'vaccines', itemToEdit.id!), data);
            } else {
                await addDoc(collection(firestore, 'families', user.familyId, 'vaccines'), data);
            }
            onClose();
        } catch (error) {
            console.error("Error saving vaccine: ", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{itemToEdit ? `Editar Vacuna` : 'Añadir Nueva Vacuna'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="member">Miembro</Label>
                    <Select onValueChange={setMemberId} value={memberId}>
                        <SelectTrigger><SelectValue placeholder="¿Para quién es?" /></SelectTrigger>
                        <SelectContent>
                            {members.map(member => (
                                <SelectItem key={member.uid} value={member.uid}>{member.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="vaccineName">Nombre de la Vacuna</Label>
                    <Input id="vaccineName" value={vaccineName} onChange={e => setVaccineName(e.target.value)} placeholder="Ej: Triple Vírica" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="dose">Dosis</Label>
                        <Input id="dose" value={dose} onChange={e => setDose(e.target.value)} placeholder="Ej: 1ª, Refuerzo" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {itemToEdit ? 'Guardar Cambios' : 'Añadir Vacuna'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

const statusColors = {
    confirmada: 'text-green-600',
    pendiente: 'text-yellow-600',
    cancelada: 'text-red-600'
};


export default function HealthPage() {
    const [isAppointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
    const [isMedicationDialogOpen, setMedicationDialogOpen] = useState(false);
    const [isVaccineDialogOpen, setVaccineDialogOpen] = useState(false);
    
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
    const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [vaccines, setVaccines] = useState<Vaccine[]>([]);
    const [medicalProfiles, setMedicalProfiles] = useState<MedicalProfile[]>([]);
    const [members, setMembers] = useState<FamilyMember[]>([]);

    const firestore = useFirestore();
    const { data: user } = useUser();

     useEffect(() => {
        if (!firestore || !user?.familyId) {
            setIsLoading(false);
            return;
        }

        const familyId = user.familyId;
        setIsLoading(true);

        const fetchMembersAndProfiles = async () => {
            try {
                const familyDocRef = doc(firestore, 'families', familyId);
                const familyDocSnap = await getDoc(familyDocRef);

                if (!familyDocSnap.exists()) {
                    setMembers([]);
                    setMedicalProfiles([]);
                    return;
                };

                const memberIds = familyDocSnap.data().members as string[];
                if (memberIds.length === 0) {
                    setMembers([]);
                    setMedicalProfiles([]);
                    return;
                }
                
                const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberIds));
                const usersSnap = await getDocs(usersQuery);
                const familyMembers = usersSnap.docs.map(d => {
                    const profile = d.data() as UserProfile;
                    return { uid: profile.uid, name: profile.givenName || profile.displayName || 'Usuario' };
                });
                setMembers(familyMembers);

                const profilesQuery = query(collection(firestore, 'families', familyId, 'medicalProfiles'));
                
                const unsubProfiles = onSnapshot(profilesQuery, async (profilesSnap) => {
                    const existingProfiles = profilesSnap.docs.map(d => d.data() as MedicalProfile);
                    setMedicalProfiles(existingProfiles);

                    const existingProfileUserIds = existingProfiles.map(p => p.userId);
                    const batch = writeBatch(firestore);
                    let needsCommit = false;

                    familyMembers.forEach(member => {
                        if (!existingProfileUserIds.includes(member.uid)) {
                            const newProfileRef = doc(firestore, 'families', familyId, 'medicalProfiles', member.uid);
                            const newProfile: MedicalProfile = {
                                userId: member.uid,
                                userName: member.name,
                                bloodType: '',
                                allergies: '',
                                medicalContact: '',
                                familyId: familyId
                            };
                            batch.set(newProfileRef, newProfile);
                            needsCommit = true;
                        }
                    });

                    if (needsCommit) {
                       await batch.commit();
                    }
                });

                return unsubProfiles;

            } catch (error) {
                console.warn("Could not fetch family members or profiles, user may not have access.", error);
                setMembers([]);
                setMedicalProfiles([]);
            }
        };

        const profileUnsubPromise = fetchMembersAndProfiles();

        const appointmentsQuery = query(collection(firestore, 'families', familyId, 'appointments'), orderBy('date', 'desc'));
        const medsQuery = query(collection(firestore, 'families', familyId, 'medications'));
        const vaccinesQuery = query(collection(firestore, 'families', familyId, 'vaccines'), orderBy('date', 'desc'));
        
        const unsubAppointments = onSnapshot(appointmentsQuery, snap => {
            setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
            setIsLoading(false);
        }, () => setIsLoading(false));

        const unsubMeds = onSnapshot(medsQuery, snap => {
            setMedications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medication)));
        });

        const unsubVaccines = onSnapshot(vaccinesQuery, snap => {
            setVaccines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vaccine)));
        });

        return () => {
            unsubAppointments();
            unsubMeds();
            unsubVaccines();
            profileUnsubPromise.then(unsub => unsub && unsub());
        }
    }, [firestore, user]);
    
    const openAppointmentDialog = (item?: Appointment) => {
        setEditingAppointment(item || null);
        setAppointmentDialogOpen(true);
    };

    const openMedicationDialog = (item?: Medication) => {
        setEditingMedication(item || null);
        setMedicationDialogOpen(true);
    };

    const openVaccineDialog = (item?: Vaccine) => {
        setEditingVaccine(item || null);
        setVaccineDialogOpen(true);
    };

    const handleDelete = async (collectionName: string, id: string) => {
        if (!firestore || !user?.familyId) return;
        await deleteDoc(doc(firestore, 'families', user.familyId, collectionName, id));
    };

    const handleProfileUpdate = async (userId: string, field: keyof MedicalProfile, value: string) => {
        if (!firestore || !user?.familyId) return;
        const profileRef = doc(firestore, 'families', user.familyId, 'medicalProfiles', userId);
        await updateDoc(profileRef, { [field]: value });
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    if (!user?.familyId) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Módulo de Salud</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Debes unirte a una familia para usar el módulo de salud.</p>
                </CardContent>
            </Card>
        )
    }

  return (
    <div className="flex flex-col gap-8">
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <AppointmentDialog 
          members={members}
          onClose={() => setAppointmentDialogOpen(false)}
          itemToEdit={editingAppointment}
        />
      </Dialog>
      <Dialog open={isMedicationDialogOpen} onOpenChange={setMedicationDialogOpen}>
          <MedicationDialog 
            members={members}
            onClose={() => setMedicationDialogOpen(false)}
            itemToEdit={editingMedication}
          />
      </Dialog>
      <Dialog open={isVaccineDialogOpen} onOpenChange={setVaccineDialogOpen}>
        <VaccineDialog 
          members={members}
          onClose={() => setVaccineDialogOpen(false)}
          itemToEdit={editingVaccine}
        />
      </Dialog>

      <Tabs defaultValue="appointments">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments">
            <Calendar className="mr-2 h-4 w-4" /> Citas Médicas
          </TabsTrigger>
          <TabsTrigger value="medications">
            <Pill className="mr-2 h-4 w-4" /> Medicamentos
          </TabsTrigger>
          <TabsTrigger value="profiles">
            <User className="mr-2 h-4 w-4" /> Perfiles Médicos
          </TabsTrigger>
           <TabsTrigger value="vaccines">
            <Syringe className="mr-2 h-4 w-4" /> Vacunas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Próximas Citas</CardTitle>
                <CardDescription>
                  Aquí tienes un resumen de las visitas médicas programadas.
                </CardDescription>
              </div>
              <Button size="lg" onClick={() => openAppointmentDialog()}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Cita
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {appointments.length > 0 ? appointments.map((appt) => (
                    <Card key={appt.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                        <div className="flex items-center gap-4 mb-2 sm:mb-0">
                           <div className="p-3 bg-primary/10 rounded-full">
                             <HeartPulse className="h-6 w-6 text-primary" />
                           </div>
                            <div>
                                <p className="font-bold">{appt.specialist} <span className="font-normal text-muted-foreground">({appt.memberName})</span></p>
                                <p className="text-sm">{appt.reason}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                           <div>
                                <p className="font-semibold text-sm">{format((appt.date as Timestamp).toDate(), "dd/MM/yyyy, HH:mm")}</p>
                                <p className={`text-xs font-bold uppercase ${statusColors[appt.status]}`}>{appt.status}</p>
                           </div>
                            <Button variant="ghost" size="icon" onClick={() => openAppointmentDialog(appt)}><Pencil className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete('appointments', appt.id!)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    </Card>
                )) : (
                    <p className='text-center text-muted-foreground py-4'>No hay citas programadas.</p>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Medicamentos en curso</CardTitle>
                <CardDescription>
                  Tratamientos y medicamentos que se están tomando actualmente.
                </CardDescription>
              </div>
               <Button size="lg" onClick={() => openMedicationDialog()}>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Medicamento
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
               {medications.length > 0 ? medications.map((med) => (
                    <Card key={med.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-accent/50 rounded-full">
                             <Pill className="h-6 w-6 text-accent-foreground" />
                           </div>
                            <div>
                                <p className="font-bold">{med.name} <span className="font-normal text-muted-foreground">({med.memberName})</span></p>
                                <p className="text-sm text-muted-foreground">{med.dose}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-2 text-right">
                           <p className="font-semibold text-sm">{med.duration}</p>
                           <Button variant="ghost" size="icon" onClick={() => openMedicationDialog(med)}><Pencil className="h-4 w-4"/></Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDelete('medications', med.id!)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    </Card>
                )) : (
                     <p className='text-center text-muted-foreground py-4'>No hay medicamentos registrados.</p>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="mt-6">
             <Card>
                <CardHeader>
                    <CardTitle>Perfiles Médicos Familiares</CardTitle>
                    <CardDescription>Información médica básica de cada miembro.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {medicalProfiles.map((profile) => (
                        <Card key={profile.userId} className="p-4 space-y-4">
                             <h3 className="font-bold text-lg flex items-center gap-2"><User className="h-5 w-5"/> {profile.userName}</h3>
                             <div className="space-y-2">
                                <Label>Grupo Sanguíneo</Label>
                                <Input defaultValue={profile.bloodType} onBlur={(e) => handleProfileUpdate(profile.userId, 'bloodType', e.target.value)} placeholder="Ej: O+"/>
                             </div>
                              <div className="space-y-2">
                                <Label>Alergias</Label>
                                <Textarea defaultValue={profile.allergies} onBlur={(e) => handleProfileUpdate(profile.userId, 'allergies', e.target.value)} placeholder="Ej: Polen, Penicilina..."/>
                             </div>
                              <div className="space-y-2">
                                <Label>Contacto Médico de Emergencia</Label>
                                <Input defaultValue={profile.medicalContact} onBlur={(e) => handleProfileUpdate(profile.userId, 'medicalContact', e.target.value)} placeholder="Ej: Dr. García - 912345678"/>
                             </div>
                        </Card>
                    ))}
                    {members.length > 0 && medicalProfiles.length === 0 && (
                        <p className="text-center text-muted-foreground py-4 md:col-span-2">Cargando perfiles...</p>
                    )}
                </CardContent>
             </Card>
        </TabsContent>
        
        <TabsContent value="vaccines" className="mt-6">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                     <div>
                        <CardTitle>Registro de Vacunación</CardTitle>
                        <CardDescription>Mantén un registro de las vacunas de cada miembro.</CardDescription>
                    </div>
                     <Button size="lg" onClick={() => openVaccineDialog()}>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Añadir Vacuna
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {vaccines.length > 0 ? vaccines.map((vaccine) => (
                        <Card key={vaccine.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                           <div className="flex items-center gap-4 mb-2 sm:mb-0">
                               <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                                 <Syringe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                               </div>
                                <div>
                                    <p className="font-bold">{vaccine.name} - {vaccine.dose} <span className="font-normal text-muted-foreground">({vaccine.memberName})</span></p>
                                    <p className="text-sm text-muted-foreground">
                                        Administrada el: {format((vaccine.date as Timestamp).toDate(), "dd 'de' MMMM, yyyy", { locale: es })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openVaccineDialog(vaccine)}><Pencil className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('vaccines', vaccine.id!)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                        </Card>
                    )) : (
                        <p className='text-center text-muted-foreground py-4'>No hay vacunas registradas.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
