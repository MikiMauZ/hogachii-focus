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
import { PlusCircle, ShoppingCart, BookOpen, Trash2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { Recipe, MenuEvent, Ingredient } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const mealTypes = ['Comida', 'Cena'];

const RecipeDialog = ({ open, onOpenChange, onRecipeAdded, recipeToEdit }: { open: boolean, onOpenChange: (open: boolean) => void, onRecipeAdded: () => void, recipeToEdit?: Recipe | null }) => {
  const [name, setName] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', quantity: '' }]);
  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (recipeToEdit) {
      setName(recipeToEdit.name);
      setPrepTime(recipeToEdit.prepTime);
      setImageUrl(recipeToEdit.imageUrl || '');
      setIngredients(recipeToEdit.ingredients.length > 0 ? recipeToEdit.ingredients : [{ name: '', quantity: '' }]);
    } else {
      setName('');
      setPrepTime('');
      setImageUrl('');
      setIngredients([{ name: '', quantity: '' }]);
    }
  }, [recipeToEdit]);

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  };

  const removeIngredientField = (index: number) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const handleSaveRecipe = async () => {
    if (!name.trim() || !prepTime.trim() || !firestore || !user?.familyId) return;

    const recipeData: Omit<Recipe, 'id'> = {
      name: name.trim(),
      prepTime: prepTime.trim(),
      imageUrl: imageUrl.trim(),
      ingredients: ingredients.filter(ing => ing.name.trim() && ing.quantity.trim()),
      familyId: user.familyId,
    };
    
    // For now, we only support adding new recipes, not editing.
    // A full implementation would check for recipeToEdit and updateDoc.
    await addDoc(collection(firestore, 'families', user.familyId, 'recipes'), recipeData);
    
    onRecipeAdded();
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{recipeToEdit ? 'Editar Receta' : 'Añadir Nueva Receta'}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre de la Receta</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lentejas de la abuela" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="prepTime">Tiempo</Label>
            <Input id="prepTime" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="45 min" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="imageUrl">URL de la Imagen (opcional)</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Ingredientes</Label>
          <div className="space-y-2">
            {ingredients.map((ing, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input value={ing.quantity} onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)} placeholder="1 taza" className="w-1/3" />
                <Input value={ing.name} onChange={(e) => handleIngredientChange(index, 'name', e.target.value)} placeholder="Lentejas" />
                <Button variant="ghost" size="icon" onClick={() => removeIngredientField(index)} disabled={ingredients.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addIngredientField} className="mt-2">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir ingrediente
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSaveRecipe}>Guardar Receta</Button>
      </DialogFooter>
    </DialogContent>
  );
};


const MealSlot = ({ meal, onRemove }: { meal: MenuEvent | null; onAdd: () => void; onRemove?: (id: string) => void }) => {
    if (meal) {
        return (
            <Card className="overflow-hidden h-full flex flex-col group relative">
                <div className="relative w-full h-24">
                   <Image src={meal.recipeImage || 'https://picsum.photos/seed/placeholder/300/200'} alt={meal.recipeName} layout="fill" objectFit="cover" />
                </div>
                <CardHeader className="p-3 flex-grow">
                    <CardTitle className="text-sm">{meal.recipeName}</CardTitle>
                </CardHeader>
                {onRemove && (
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemove(meal.id!)}>
                        <XCircle className="h-4 w-4" />
                    </Button>
                )}
            </Card>
        )
    }
    return (
        <div className="w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-accent/10">
            <PlusCircle className="h-6 w-6 mb-1 text-muted-foreground/50"/>
            <span className="text-xs font-semibold">Arrastra aquí</span>
        </div>
    )
}

export default function MenuPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [menuEvents, setMenuEvents] = useState<MenuEvent[]>([]);
    const [isFormOpen, setFormOpen] = useState(false);
    const firestore = useFirestore();
    const { data: user } = useUser();

    useEffect(() => {
        if (!firestore || !user?.familyId) return;

        const recipesQuery = query(collection(firestore, 'families', user.familyId, 'recipes'), orderBy('name'));
        const recipesUnsub = onSnapshot(recipesQuery, snapshot => {
            setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
        });
        
        const menuEventsQuery = query(collection(firestore, 'families', user.familyId, 'menuEvents'));
        const menuEventsUnsub = onSnapshot(menuEventsQuery, snapshot => {
            setMenuEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuEvent)));
        });

        return () => {
            recipesUnsub();
            menuEventsUnsub();
        };
    }, [firestore, user]);

    const handleDragStart = (e: React.DragEvent, recipe: Recipe) => {
        e.dataTransfer.setData("recipe", JSON.stringify(recipe));
    }

    const handleDrop = async (e: React.DragEvent, day: string, mealType: string) => {
        e.preventDefault();
        const recipeString = e.dataTransfer.getData("recipe");
        if (!recipeString || !firestore || !user?.familyId) return;
        
        const recipe: Recipe = JSON.parse(recipeString);

        // Remove any existing meal in this slot
        const existingEvent = menuEvents.find(ev => ev.day === day && ev.mealType === mealType);
        if (existingEvent) {
          await deleteDoc(doc(firestore, 'families', user.familyId, 'menuEvents', existingEvent.id!));
        }

        const newMenuEvent: Omit<MenuEvent, 'id'> = {
            recipeId: recipe.id!,
            recipeName: recipe.name,
            recipeImage: recipe.imageUrl,
            day: day as MenuEvent['day'],
            mealType: mealType as MenuEvent['mealType'],
            familyId: user.familyId,
        };
        await addDoc(collection(firestore, 'families', user.familyId, 'menuEvents'), newMenuEvent);
    }
    
    const handleRemoveFromMenu = async (id: string) => {
        if (!firestore || !user?.familyId || !id) return;
        await deleteDoc(doc(firestore, 'families', user.familyId, 'menuEvents', id));
    };


    const menuGrid = days.map(day => {
        const mealsForDay = mealTypes.map(mealType => {
            const menuEvent = menuEvents.find(event => event.day === day && event.mealType === mealType);
            return (
                <div key={mealType}>
                    <p className="text-xs text-muted-foreground font-semibold mb-1 ml-1 uppercase">{mealType}</p>
                    <div
                        className="h-[160px]"
                        onDrop={(e) => handleDrop(e, day, mealType)}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <MealSlot meal={menuEvent || null} onAdd={() => {}} onRemove={handleRemoveFromMenu} />
                    </div>
                </div>
            )
        });
        return (
             <div key={day} className="flex flex-col gap-4">
                <h3 className="text-center font-bold text-lg">{day}</h3>
                <div className="bg-card p-2 rounded-lg space-y-2 h-[400px]">
                    {mealsForDay}
                </div>
            </div>
        )
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
             <div className="flex items-center justify-end mb-8">
                <Button size="lg">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Generar Lista de Compra
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-1">
                {menuGrid}
            </div>
        </div>
        <div className="lg:col-span-1">
             <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <Card className="sticky top-20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-6 w-6"/>
                            Mis Recetas
                        </CardTitle>
                        <CardDescription>Arrastra una receta al planificador para añadirla.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 h-[60vh] overflow-y-auto">
                        {recipes.map(recipe => (
                            <Card 
                                key={recipe.id}
                                className="flex gap-4 p-3 cursor-grab active:cursor-grabbing"
                                draggable
                                onDragStart={(e) => handleDragStart(e, recipe)}
                            >
                                <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                                    <Image src={recipe.imageUrl || 'https://picsum.photos/seed/placeholder/300/200'} alt={recipe.name} layout="fill" objectFit="cover" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">{recipe.name}</h4>
                                    <p className="text-sm text-muted-foreground">{recipe.prepTime}</p>
                                </div>
                            </Card>
                        ))}
                         {recipes.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                <p>Aún no tienes recetas. ¡Añade la primera!</p>
                            </div>
                         )}
                    </CardContent>
                    <CardFooter>
                       <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4"/>
                                Añadir Nueva Receta
                            </Button>
                        </DialogTrigger>
                    </CardFooter>
                </Card>
                 <RecipeDialog open={isFormOpen} onOpenChange={setFormOpen} onRecipeAdded={() => setFormOpen(false)} />
             </Dialog>
        </div>
    </div>
  );
}
