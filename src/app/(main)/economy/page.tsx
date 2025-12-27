'use client';

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
import {
  Bell,
  PiggyBank,
  Pizza,
  Car,
  Gamepad,
  Zap,
  ShoppingCart,
  PlusCircle,
  Target,
  Coffee,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Loader2,
  Trash2,
  Pencil,
  Settings,
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
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  query,
  where,
  Timestamp,
  orderBy,
  writeBatch,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { Transaction, Budget, SavingsGoal, UserProfile } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const categoryIcons: { [key: string]: React.ElementType } = {
  Comida: Pizza,
  Transporte: Car,
  Ocio: Gamepad,
  Facturas: Zap,
  Compras: ShoppingCart,
  Ingresos: ArrowUpCircle,
  Otros: Wallet,
};

const expenseCategories = ['Comida', 'Transporte', 'Ocio', 'Facturas', 'Compras', 'Otros'];

const TransactionDialog = ({
  open,
  onOpenChange,
  onTransactionAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded: () => void;
}) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Otros');
  const [isSaving, setIsSaving] = useState(false);

  const firestore = useFirestore();
  const { data: user } = useUser();

  const handleSave = async () => {
    if (!amount || !description || !firestore || !user?.familyId || isSaving) return;
    setIsSaving(true);

    const newTransaction: Omit<Transaction, 'id'> = {
      amount: parseFloat(amount),
      description,
      category: type === 'income' ? 'Ingresos' : category,
      type,
      date: Timestamp.now(),
      familyId: user.familyId,
      userId: user.uid,
    };

    try {
      await addDoc(collection(firestore, 'families', user.familyId, 'transactions'), newTransaction);
      onTransactionAdded();
    } catch (error) {
      console.error('Error adding transaction: ', error);
    } finally {
      setAmount('');
      setDescription('');
      setCategory('Otros');
      setType('expense');
      setIsSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar Movimiento</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <Tabs value={type} onValueChange={(v) => setType(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense"><ArrowDownCircle className="mr-2 h-4 w-4" />Gasto</TabsTrigger>
            <TabsTrigger value="income"><ArrowUpCircle className="mr-2 h-4 w-4" />Ingreso</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-2">
          <Label htmlFor="amount">Importe</Label>
          <Input id="amount" type="number" placeholder="45.50" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Descripción</Label>
          <Input id="description" placeholder="Ej: Cena con amigos" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {type === 'expense' && (
          <div className="grid gap-2">
            <Label htmlFor="category">Categoría</Label>
            <Select onValueChange={setCategory} value={category}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Movimiento
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const SavingsGoalDialog = ({
  open,
  onOpenChange,
  goalToEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalToEdit: SavingsGoal | null;
}) => {
  const [name, setName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (goalToEdit) {
      setName(goalToEdit.name);
      setGoalAmount(String(goalToEdit.goalAmount));
      setCurrentAmount(String(goalToEdit.currentAmount));
    } else {
      setName('');
      setGoalAmount('');
      setCurrentAmount('0');
    }
  }, [goalToEdit]);

  const handleSave = async () => {
    if (!name || !goalAmount || !firestore || !user?.familyId || isSaving) return;
    setIsSaving(true);
    
    const goalData = {
        name,
        goalAmount: parseFloat(goalAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        familyId: user.familyId,
    };

    try {
        if (goalToEdit) {
            await updateDoc(doc(firestore, 'families', user.familyId, 'savingsGoals', goalToEdit.id!), goalData);
        } else {
            await addDoc(collection(firestore, 'families', user.familyId, 'savingsGoals'), goalData);
        }
        onOpenChange(false);
    } catch(error) {
        console.error("Error saving savings goal: ", error);
    } finally {
        setIsSaving(false);
    }
  };
  
  return (
      <DialogContent>
          <DialogHeader>
              <DialogTitle>{goalToEdit ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                  <Label htmlFor="goal-name">Nombre de la meta</Label>
                  <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Vacaciones de verano" />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="goal-amount">Importe Objetivo (€)</Label>
                  <Input id="goal-amount" type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="1000" />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="current-amount">Importe Actual (€) (opcional)</Label>
                  <Input id="current-amount" type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="150" />
              </div>
          </div>
          <DialogFooter>
              <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {goalToEdit ? 'Guardar Cambios' : 'Crear Meta'}
              </Button>
          </DialogFooter>
      </DialogContent>
  )
}

const BudgetDialog = ({
    open,
    onOpenChange,
    budgets,
} : {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    budgets: Budget[];
}) => {
    const firestore = useFirestore();
    const { data: user } = useUser();

    const handleBudgetChange = async (budgetId: string, newAmount: string) => {
        if (!firestore || !user?.familyId) return;
        const amount = parseFloat(newAmount);
        if (isNaN(amount) || amount < 0) return;

        const budgetRef = doc(firestore, 'families', user.familyId, 'budgets', budgetId);
        await updateDoc(budgetRef, { amount });
    };

    const setupDefaultBudgets = async () => {
        if (!firestore || !user?.familyId) return;
        const batch = writeBatch(firestore);
        const budgetsCollectionRef = collection(firestore, 'families', user.familyId, 'budgets');

        // Delete existing budgets
        budgets.forEach(b => batch.delete(doc(budgetsCollectionRef, b.id)));
        
        // Add default budgets
        expenseCategories.forEach(category => {
            const newBudgetRef = doc(budgetsCollectionRef);
            batch.set(newBudgetRef, { category, amount: 0, familyId: user.familyId });
        });

        await batch.commit();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Configurar Presupuestos</DialogTitle>
                <CardDescription>Establece los límites de gasto mensual para cada categoría.</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                {budgets.length > 0 ? (
                    budgets.map(budget => {
                         const Icon = categoryIcons[budget.category] || Wallet;
                         return (
                            <div key={budget.id} className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor={`budget-${budget.id}`} className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <span>{budget.category}</span>
                                </Label>
                                <Input
                                    id={`budget-${budget.id}`}
                                    type="number"
                                    defaultValue={budget.amount}
                                    onBlur={(e) => handleBudgetChange(budget.id!, e.target.value)}
                                    className="col-span-2"
                                    placeholder='0.00'
                                />
                            </div>
                         )
                    })
                ) : (
                    <div className="text-center text-muted-foreground py-6">
                        <p>No tienes presupuestos configurados.</p>
                        <Button variant="link" onClick={setupDefaultBudgets}>Empezar con los predeterminados</Button>
                    </div>
                )}
            </div>
             <DialogFooter>
                {budgets.length > 0 && <Button variant="outline" onClick={setupDefaultBudgets}>Restablecer predeterminados</Button>}
                <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
    );
};


export default function EconomyPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [isSavingsGoalDialogOpen, setSavingsGoalDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const firestore = useFirestore();
  const { data: user } = useUser();
  
  useEffect(() => {
    if (!firestore || !user?.familyId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const familyId = user.familyId;
    
    const unsubTransactions = onSnapshot(query(collection(firestore, 'families', familyId, 'transactions'), orderBy('date', 'desc')), snap => {
        setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()} as Transaction)));
        setIsLoading(false);
    });
    
    const unsubBudgets = onSnapshot(query(collection(firestore, 'families', familyId, 'budgets'), orderBy('category')), snap => {
        setBudgets(snap.docs.map(d => ({id: d.id, ...d.data()} as Budget)));
    });

    const unsubSavingsGoals = onSnapshot(query(collection(firestore, 'families', familyId, 'savingsGoals'), orderBy('name')), snap => {
        setSavingsGoals(snap.docs.map(d => ({id: d.id, ...d.data()} as SavingsGoal)));
    });

    return () => {
        unsubTransactions();
        unsubBudgets();
        unsubSavingsGoals();
    }
  }, [firestore, user]);
  
  const openGoalDialog = (goal: SavingsGoal | null = null) => {
    setEditingGoal(goal);
    setSavingsGoalDialogOpen(true);
  }
  
  const deleteGoal = async (goalId: string) => {
    if (!firestore || !user?.familyId) return;
    await deleteDoc(doc(firestore, 'families', user.familyId, 'savingsGoals', goalId));
  }


  const { monthlyExpenses, monthlyIncome, spentByCategory } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = transactions.filter(t => (t.date as Timestamp).toDate() >= startOfMonth);
    
    let monthlyExpenses = 0;
    let monthlyIncome = 0;
    const spentByCategory: {[key: string]: number} = {};

    monthlyTransactions.forEach(t => {
        if (t.type === 'expense') {
            monthlyExpenses += t.amount;
            spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
        } else {
            monthlyIncome += t.amount;
        }
    });

    return { monthlyExpenses, monthlyIncome, spentByCategory };
  }, [transactions]);
  
  const totalBudget = useMemo(() => budgets.reduce((acc, b) => acc + b.amount, 0), [budgets]);
  const budgetStatus = useMemo(() => {
      const remaining = totalBudget - monthlyExpenses;
      const status = totalBudget > 0 ? (remaining < (totalBudget * 0.1) ? 'danger' : remaining < (totalBudget * 0.3) ? 'warn' : 'ok') : 'ok';
      return { status, remaining, daysLeft: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() };
  }, [totalBudget, monthlyExpenses]);
  
  const getStatusInfo = () => {
    if (totalBudget <= 0) {
       return {
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50',
          title: 'Organiza tus finanzas',
          description: `Configura tus presupuestos para empezar.`
        };
    }
    switch(budgetStatus.status) {
      case 'ok':
        return {
          color: 'text-green-600 bg-green-100 dark:bg-green-900/50',
          title: '¡Vas genial!',
          description: `Te quedan ${budgetStatus.remaining.toFixed(2)}€ para ${budgetStatus.daysLeft} días.`
        };
      case 'warn':
         return {
          color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50',
          title: 'Ojo, cuidado',
          description: `Te quedan ${budgetStatus.remaining.toFixed(2)}€ para ${budgetStatus.daysLeft} días.`
        };
      case 'danger':
         return {
          color: 'text-red-600 bg-red-100 dark:bg-red-900/50',
          title: 'Alerta de gastos',
          description: `Solo te quedan ${budgetStatus.remaining.toFixed(2)}€ para ${budgetStatus.daysLeft} días.`
        };
    }
  }
  const statusInfo = getStatusInfo();

   if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!user?.familyId) {
    return (
      <Card>
        <CardHeader><CardTitle>Módulo de Economía</CardTitle></CardHeader>
        <CardContent><p>Debes unirte a una familia para usar este módulo.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Dialog open={isTransactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <Card className="md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-full", statusInfo.color)}>
                <span className="text-3xl font-bold">💰</span>
            </div>
            <div>
                <CardTitle className="text-xl">{statusInfo.title}</CardTitle>
                <p className="text-muted-foreground">{statusInfo.description}</p>
            </div>
          </div>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto mt-4 sm:mt-0">
              <PlusCircle className="mr-2 h-5 w-5" />
              Registrar Movimiento
            </Button>
          </DialogTrigger>
        </Card>
        <TransactionDialog open={isTransactionDialogOpen} onOpenChange={setTransactionDialogOpen} onTransactionAdded={() => setTransactionDialogOpen(false)} />
      </Dialog>
      
      <Dialog open={isSavingsGoalDialogOpen} onOpenChange={setSavingsGoalDialogOpen}>
          <SavingsGoalDialog open={isSavingsGoalDialogOpen} onOpenChange={setSavingsGoalDialogOpen} goalToEdit={editingGoal} />
      </Dialog>

      <Dialog open={isBudgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
          <BudgetDialog open={isBudgetDialogOpen} onOpenChange={setBudgetDialogOpen} budgets={budgets} />
      </Dialog>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle>Resumen de Este Mes</CardTitle>
                <CardDescription>Tu progreso de gastos por categoría.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={() => setBudgetDialogOpen(true)}>
                <Settings className="h-4 w-4" />
                <span className="sr-only">Configurar Presupuestos</span>
            </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgets.filter(b => b.amount > 0).map((budget) => {
            const spent = spentByCategory[budget.category] || 0;
            const Icon = categoryIcons[budget.category] || Wallet;
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            return (
                <div key={budget.id}>
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", "text-muted-foreground")} />
                    <span className="font-medium text-sm">{budget.category}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{spent.toFixed(2)}€ / {budget.amount}€</span>
                </div>
                <Progress value={percentage} />
                </div>
            )
          })}
           {budgets.filter(b => b.amount > 0).length === 0 && (
            <div className="text-muted-foreground text-center py-4">
                <p>Aún no has configurado presupuestos.</p>
                <Button variant="link" onClick={() => setBudgetDialogOpen(true)}>Configurar ahora</Button>
            </div>
           )}
        </CardContent>
      </Card>

       <div className="flex flex-col gap-6">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Wallet className="h-5 w-5"/>
                        Balance Mensual
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-medium text-green-600">Ingresos</span>
                        <span className="font-bold text-green-600">+{monthlyIncome.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-medium text-red-600">Gastos</span>
                        <span className="font-bold text-red-600">-{monthlyExpenses.toFixed(2)}€</span>
                    </div>
                     <div className="flex justify-between items-center text-lg pt-2 border-t">
                        <span className="font-semibold">Total</span>
                        <span className="font-extrabold text-xl">{(monthlyIncome - monthlyExpenses).toFixed(2)}€</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2 text-lg">
                          <Target className="h-5 w-5"/>
                          Metas de Ahorro
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => openGoalDialog()}>
                          <PlusCircle className="h-5 w-5" />
                      </Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-4">
                  {savingsGoals.map(goal => (
                      <div key={goal.id} className="group">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-bold">{goal.name}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openGoalDialog(goal)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteGoal(goal.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                          </div>
                          <Progress value={(goal.currentAmount / goal.goalAmount) * 100} />
                           <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground">{goal.currentAmount.toFixed(2)}€</span>
                              <span className="text-xs text-muted-foreground">{goal.goalAmount.toFixed(2)}€</span>
                          </div>
                          <p className="text-center text-xs text-muted-foreground mt-1">¡Solo faltan {(goal.goalAmount - goal.currentAmount).toFixed(2)}€! 💪</p>
                      </div>
                  ))}
                  {savingsGoals.length === 0 && (
                      <div className="text-center text-muted-foreground py-6">
                          <p>No tienes metas de ahorro.</p>
                          <Button variant="link" onClick={() => openGoalDialog()}>Crear una meta</Button>
                      </div>
                  )}
              </CardContent>
            </Card>
       </div>
    </div>
  );
}
