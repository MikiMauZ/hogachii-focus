'use client';

import type { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  familyId: string | null;
  givenName?: string;
  familyName?: string;
  points?: number;
  settings?: {
    navPosition?: 'left' | 'top';
  }
};

export type Family = {
  id: string;
  name: string;
  members: string[]; // array of user UIDs
  ownerId: string;
};

export type Event = {
  id?: string;
  title: string;
  date: Timestamp | Date; // Use Timestamp for Firestore
  time: string;
  type: 'medical' | 'school' | 'personal' | 'work';
  familyId: string;
};

export type ShoppingItem = {
  id?: string;
  name: string;
  category: string;
  purchased: boolean;
  familyId: string;
};

export type Task = {
  id?: string;
  title: string;
  description?: string;
  category?: string;
  energy: 'Verde' | 'Amarillo' | 'Rojo';
  completed: boolean;
  userId: string;
  familyId: string;
};

export type ChatMessage = {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  timestamp: Timestamp | Date;
  familyId: string;
};

export type Timer = {
  id: string;
  name: string;
  duration: number; // in seconds
  remainingTime: number; // in seconds
  isActive: boolean;
  familyId: string;
  userId: string;
};

export type Alarm = {
  id: string;
  name: string;
  time: string; // "HH:mm" format
  isActive: boolean;
  familyId: string;
  userId: string;
};

export type ScheduleEvent = {
  id?: string;
  activity: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  userId: string;
  familyId: string;
}

export type Ingredient = {
  name: string;
  quantity: string;
}

export type Recipe = {
  id?: string;
  name: string;
  prepTime: string;
  imageUrl?: string;
  ingredients: Ingredient[];
  familyId: string;
}

export type MenuEvent = {
  id?: string;
  recipeId: string;
  recipeName: string;
  recipeImage?: string;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  mealType: 'Comida' | 'Cena';
  familyId: string;
};

// Health Module Types
export type Appointment = {
  id?: string;
  memberId: string;
  memberName: string;
  specialist: string;
  reason: string;
  date: Timestamp | Date;
  status: 'confirmada' | 'pendiente' | 'cancelada';
};

export type Medication = {
  id?: string;
  memberId: string;
  memberName: string;
  name: string;
  dose: string;
  duration: string;
};

export type MedicalProfile = {
  id?: string;
  userId: string; // Same as UserProfile uid
  userName: string;
  bloodType: string;
  allergies: string;
  medicalContact: string;
  familyId: string;
};

export type Vaccine = {
  id?: string;
  memberId: string;
  memberName: string;
  name: string;
  dose: string;
  date: Timestamp | Date;
}

// Economy Module Types
export type Transaction = {
    id?: string;
    amount: number;
    description: string;
    category: string;
    type: 'income' | 'expense';
    date: Timestamp | Date;
    familyId: string;
    userId: string;
};

export type Budget = {
    id?: string;
    category: string;
    amount: number;
    familyId: string;
};

export type SavingsGoal = {
    id?: string;
    name: string;
    goalAmount: number;
    currentAmount: number;
    familyId: string;
};

// Wishlist Module Types
export type WishlistItem = {
  id?: string;
  name: string;
  description?: string;
  url?: string;
  price?: number;
  isPurchased: boolean;
  familyId: string;
};

export type Reward = {
  id?: string;
  name: string;
  description?: string;
  pointsCost: number;
  familyId: string;
};

// Reading Module Types
export type Reading = {
  id?: string;
  title: string;
  author?: string;
  totalPages?: number;
  currentPage?: number;
  status: 'to-read' | 'reading' | 'finished';
  startDate?: Timestamp | Date;
  finishDate?: Timestamp | Date;
  familyId: string;
  userId?: string; // Who is reading it
};
