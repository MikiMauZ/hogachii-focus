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
  Gift,
  Star,
  Trash2,
  Pencil,
  Link as LinkIcon,
  Check,
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
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useUser } from '@/firebase';
import type { WishlistItem, Reward } from '@/lib/types';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Dialog for adding/editing a WishlistItem
const WishlistDialog = ({
  open,
  onOpenChange,
  itemToEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit: WishlistItem | null;
}) => {
  const firestore = useFirestore();
  const { data: user } = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setDescription(itemToEdit.description || '');
      setPrice(itemToEdit.price?.toString() || '');
      setUrl(itemToEdit.url || '');
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setUrl('');
    }
  }, [itemToEdit]);

  const handleSave = async () => {
    if (!name || !firestore || !user?.familyId) return;

    const parsedPrice = price ? parseFloat(price) : NaN;
    const isPurchased = itemToEdit ? itemToEdit.isPurchased : false;

    const itemData: Omit<WishlistItem, 'id'> = {
      name,
      description,
      url,
      isPurchased,
      familyId: user.familyId,
      ...( !isNaN(parsedPrice) && { price: parsedPrice }),
    };

    if (itemToEdit) {
      await updateDoc(
        doc(firestore, 'families', user.familyId, 'wishlist', itemToEdit.id!),
        itemData
      );
    } else {
      await addDoc(
        collection(firestore, 'families', user.familyId, 'wishlist'),
        itemData
      );
    }
    onOpenChange(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {itemToEdit ? 'Editar Deseo' : 'Añadir a la Lista de Deseos'}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre del Deseo</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Nuevas zapatillas para correr"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles, color, talla, etc."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="price">Precio (€) (opcional)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="49.99"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">Enlace (opcional)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://ejemplo.com/producto"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave}>Guardar Deseo</Button>
      </DialogFooter>
    </DialogContent>
  );
};

// Dialog for adding/editing a Reward
const RewardDialog = ({
  open,
  onOpenChange,
  itemToEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit: Reward | null;
}) => {
  const firestore = useFirestore();
  const { data: user } = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setDescription(itemToEdit.description || '');
      setPointsCost(itemToEdit.pointsCost.toString());
    } else {
      setName('');
      setDescription('');
      setPointsCost('');
    }
  }, [itemToEdit]);

  const handleSave = async () => {
    if (!name || !pointsCost || !firestore || !user?.familyId) return;
    const itemData = {
      name,
      description,
      pointsCost: parseInt(pointsCost, 10),
      familyId: user.familyId,
    };

    if (itemToEdit) {
      await updateDoc(
        doc(firestore, 'families', user.familyId, 'rewards', itemToEdit.id!),
        itemData
      );
    } else {
      await addDoc(
        collection(firestore, 'families', user.familyId, 'rewards'),
        itemData
      );
    }
    onOpenChange(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {itemToEdit ? 'Editar Recompensa' : 'Añadir Nueva Recompensa'}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="reward-name">Nombre de la Recompensa</Label>
          <Input
            id="reward-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Tarde de cine"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reward-desc">Descripción (opcional)</Label>
          <Textarea
            id="reward-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Incluye palomitas y refresco"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reward-points">Coste en Puntos</Label>
          <Input
            id="reward-points"
            type="number"
            value={pointsCost}
            onChange={(e) => setPointsCost(e.target.value)}
            placeholder="500"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave}>Guardar Recompensa</Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isWishlistDialogOpen, setWishlistDialogOpen] = useState(false);
  const [isRewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingWishlistItem, setEditingWishlistItem] =
    useState<WishlistItem | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const firestore = useFirestore();
  const { data: user } = useUser();

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const wishlistQuery = query(
      collection(firestore, 'families', user.familyId, 'wishlist'),
      orderBy('isPurchased')
    );
    const unsubWishlist = onSnapshot(wishlistQuery, (snapshot) => {
      setWishlistItems(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as WishlistItem))
      );
    });

    const rewardsQuery = query(
      collection(firestore, 'families', user.familyId, 'rewards'),
      orderBy('pointsCost')
    );
    const unsubRewards = onSnapshot(rewardsQuery, (snapshot) => {
      setRewards(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reward))
      );
    });

    return () => {
      unsubWishlist();
      unsubRewards();
    };
  }, [firestore, user]);

  const handleEditWishlistItem = (item: WishlistItem) => {
    setEditingWishlistItem(item);
    setWishlistDialogOpen(true);
  };

  const handleEditReward = (item: Reward) => {
    setEditingReward(item);
    setRewardDialogOpen(true);
  };
  
  const handleDelete = async (collectionName: 'wishlist' | 'rewards', id: string) => {
      if (!firestore || !user?.familyId) return;
      await deleteDoc(doc(firestore, 'families', user.familyId, collectionName, id));
  }
  
  const togglePurchased = async (item: WishlistItem) => {
      if (!firestore || !user?.familyId) return;
      await updateDoc(doc(firestore, 'families', user.familyId, 'wishlist', item.id!), {
          isPurchased: !item.isPurchased
      });
  }

  return (
    <div className="flex flex-col gap-8">
      <Tabs defaultValue="wishlist">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="wishlist">
            <Gift className="mr-2 h-4 w-4" /> Lista de Deseos
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Star className="mr-2 h-4 w-4" /> Tienda de Recompensas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wishlist" className="mt-6">
           <div className="text-right mb-4">
              <Dialog open={isWishlistDialogOpen} onOpenChange={setWishlistDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" onClick={() => { setEditingWishlistItem(null); setWishlistDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Añadir Deseo
                  </Button>
                </DialogTrigger>
                <WishlistDialog
                  open={isWishlistDialogOpen}
                  onOpenChange={setWishlistDialogOpen}
                  itemToEdit={editingWishlistItem}
                />
              </Dialog>
            </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {wishlistItems.map((item) => (
              <Card key={item.id} className={cn("flex flex-col", item.isPurchased && "bg-muted/50")}>
                <CardHeader className="pb-4">
                  <CardTitle className={cn(item.isPurchased && 'line-through text-muted-foreground')}>
                    {item.name}
                  </CardTitle>
                  {item.description && (
                    <CardDescription>{item.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Precio:</span>
                    <span className="font-semibold">{item.price ? `${item.price.toFixed(2)}€` : 'N/A'}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center gap-2">
                    <Button variant={item.isPurchased ? 'secondary' : 'default'} onClick={() => togglePurchased(item)} size="sm">
                        <Check className="mr-2 h-4 w-4"/> {item.isPurchased ? 'Comprado' : 'Marcar'}
                    </Button>
                  <div className="flex items-center">
                    {item.url && <Button asChild variant="ghost" size="icon"><Link href={item.url} target="_blank"><LinkIcon className="h-4 w-4"/></Link></Button>}
                    <Button variant="ghost" size="icon" onClick={() => handleEditWishlistItem(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete('wishlist', item.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
             {wishlistItems.length === 0 && <p className="text-center text-muted-foreground py-4 md:col-span-3">La lista de deseos está vacía.</p>}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="mt-6">
             <div className="text-right mb-4">
                <Dialog open={isRewardDialogOpen} onOpenChange={setRewardDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" onClick={() => { setEditingReward(null); setRewardDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Añadir Recompensa
                        </Button>
                    </DialogTrigger>
                    <RewardDialog
                      open={isRewardDialogOpen}
                      onOpenChange={setRewardDialogOpen}
                      itemToEdit={editingReward}
                    />
                </Dialog>
            </div>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {rewards.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    <div className='text-center'>
                        <p className="text-5xl font-extrabold text-primary">{item.pointsCost}</p>
                        <p className="text-muted-foreground">puntos</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button>Canjear</Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditReward(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete('rewards', item.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
             {rewards.length === 0 && <p className="text-center text-muted-foreground py-4 md:col-span-3">No hay recompensas en la tienda.</p>}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
