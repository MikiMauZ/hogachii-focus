'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Tag, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, writeBatch, orderBy } from 'firebase/firestore';
import type { ShoppingItem } from '@/lib/types';


const categories = [
  'Frutas y Verduras',
  'Carnes y Pescado',
  'Lácteos y Huevos',
  'Despensa',
  'Limpieza',
  'Otros',
];

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('Todos');

  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const itemsQuery = query(
        collection(firestore, 'families', user.familyId, 'shoppingItems'),
        orderBy('name')
    );

    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
        const newItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ShoppingItem));
        
        // Sort on the client-side to avoid composite index
        const sortedItems = newItems.sort((a, b) => {
            if (a.purchased === b.purchased) {
              return a.name.localeCompare(b.name); // Sort by name if purchased status is the same
            }
            return a.purchased ? 1 : -1; // Sort by purchased status (false first)
        });

        setItems(sortedItems);
    });

    return () => unsubscribe();
  }, [firestore, user]);


  const handleAddItem = async () => {
    if (newItem.trim() === '' || !firestore || !user?.familyId) return;
    const newItemObject: Omit<ShoppingItem, 'id'> = {
      name: newItem.trim(),
      category: 'Otros', // Default category, can be expanded later
      purchased: false,
      familyId: user.familyId
    };
    await addDoc(collection(firestore, 'families', user.familyId, 'shoppingItems'), newItemObject);
    setNewItem('');
  };

  const toggleItemPurchased = async (id: string) => {
    if (!firestore || !user?.familyId) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    const itemRef = doc(firestore, 'families', user.familyId, 'shoppingItems', id);
    await updateDoc(itemRef, { purchased: !item.purchased });
  };
  
  const deleteItem = async (id: string) => {
    if (!firestore || !user?.familyId) return;
    await deleteDoc(doc(firestore, 'families', user.familyId, 'shoppingItems', id));
  };

  const clearPurchasedItems = async () => {
    if (!firestore || !user?.familyId) return;
    const batch = writeBatch(firestore);
    const purchasedItems = items.filter(item => item.purchased);
    purchasedItems.forEach(item => {
        const itemRef = doc(firestore!, 'families', user.familyId!, 'shoppingItems', item.id!);
        batch.delete(itemRef);
    });
    await batch.commit();
  };

  const pendingItemsCount = items.filter(item => !item.purchased).length;
  
  const filteredItems = items.filter(item => 
    activeFilter === 'Todos' || item.category === activeFilter
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
         <p className="text-lg text-muted-foreground">
            {pendingItemsCount > 0 
              ? `Tienes ${pendingItemsCount} artículo${pendingItemsCount > 1 ? 's' : ''} pendiente${pendingItemsCount > 1 ? 's' : ''}.`
              : '¡No tienes nada pendiente en la lista!'}
          </p>
        <Button variant="outline" onClick={clearPurchasedItems} size="lg" disabled={items.filter(i => i.purchased).length === 0}>
          <Trash2 className="mr-2 h-4 w-4" />
          Limpiar comprados
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Añadir Artículo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Ej: Tomates, papel de cocina..."
              className="text-base"
            />
            <Button onClick={handleAddItem} size="lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={activeFilter === 'Todos' ? 'default' : 'outline'}
          onClick={() => setActiveFilter('Todos')}
        >
          Todos
        </Button>
        {categories.map((category) => (
           <Button 
            key={category}
            variant={activeFilter === category ? 'default' : 'outline'}
            onClick={() => setActiveFilter(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className={cn('transition-opacity', item.purchased && 'opacity-50')}>
            <div className="flex items-center gap-4 p-4">
              <Checkbox
                id={`item-${item.id}`}
                checked={item.purchased}
                onCheckedChange={() => toggleItemPurchased(item.id!)}
                className="h-6 w-6"
              />
              <Label
                htmlFor={`item-${item.id}`}
                className={cn(
                  'flex-1 text-base cursor-pointer',
                  item.purchased && 'text-muted-foreground line-through'
                )}
              >
                {item.name}
              </Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>{item.category}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id!)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </Card>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
            <p>No hay artículos en esta categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
}
