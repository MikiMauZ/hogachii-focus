'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, updateProfile, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';

export function useUser() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [userState, setUserState] = useState<{
    data: UserProfile | null;
    isLoading: boolean;
  }>({
    data: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!auth || !firestore) {
      setUserState({ data: null, isLoading: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            // Profile exists, set it as user data
            setUserState({ data: docSnap.data() as UserProfile, isLoading: false });
          } else {
            // Profile does not exist, create it. This is the crucial fallback.
            const displayName = firebaseUser.displayName || 'Nuevo Usuario';
            const [givenName, familyName] = displayName.split(' ');

            const newUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: displayName,
              photoURL: firebaseUser.photoURL,
              familyId: null,
              givenName: givenName || '',
              familyName: familyName || '',
              points: 0,
              level: 1,
              streak: 0,
              avatar: '👤',
            };

            // Also update the auth profile if it's sparse
            if (!firebaseUser.displayName) {
                await updateProfile(firebaseUser, { displayName });
            }

            await setDoc(userDocRef, newUserProfile);
            setUserState({ data: newUserProfile, isLoading: false });
          }
        } catch (error) {
          console.error("Error fetching or creating user profile:", error);
          setUserState({ data: null, isLoading: false });
        }
      } else {
        // No user is signed in.
        setUserState({ data: null, isLoading: false });
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  return userState;
}
