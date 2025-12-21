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
import { PlusCircle, Trash2, Tag, ShoppingCart, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, writeBatch, orderBy } from 'firebase/firestore';
import type { ShoppingItem } from '@/lib/types';

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
        
        const sortedItems = newItems.sort((a, b) => {
            if (a.purchased === b.purchased) {
              return a.name.localeCompare(b.name);
            }
            return a.purchased ? 1 : -1;
        });

        setItems(sortedItems);
    });

    return () => unsubscribe();
  }, [firestore, user]);


  const handleAddItem = async () => {
    if (newItem.trim() === '' || !firestore || !user?.familyId) return;
    const newItemObject: Omit<ShoppingItem, 'id'> = {
      name: newItem.trim(),
      category: 'Otros',
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
  
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 mt-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Añadir y Buscar Artículos</CardTitle>
          <Button variant="outline" onClick={clearPurchasedItems} size="lg" disabled={items.filter(i => i.purchased).length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            Limpiar comprados
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                 <Input
                    type="search"
                    placeholder="Buscar en la lista..."
                    className="w-full pl-10 text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
            </div>
        </CardContent>
      </Card>
      
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
        {items.length > 0 && filteredItems.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            <Search className="h-12 w-12 mx-auto mb-4" />
            <p>No se encontraron artículos con "{searchQuery}".</p>
          </div>
        )}
         {items.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
              <p>Tu lista de la compra está vacía.</p>
              <p className="text-sm">¡Añade tu primer artículo para empezar!</p>
            </div>
         )}
      </div>
    </div>
  );
}
