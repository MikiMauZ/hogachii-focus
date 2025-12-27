'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Package2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function AuthForm({ isSignUp }: { isSignUp: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      setError('Los servicios de Firebase no están disponibles.');
      return;
    }
    setError(null);
    setIsLoading(true);

    if (isSignUp) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;
        
        const displayName = `${givenName} ${familyName}`.trim();
        await updateProfile(user, { displayName });

        const newUserProfile = {
            uid: user.uid,
            email: user.email,
            displayName,
            photoURL: user.photoURL,
            familyId: null,
            givenName: givenName || '',
            familyName: familyName || '',
            points: 0,
            level: 1,
            streak: 0,
            avatar: '👤',
        };

        const userDocRef = doc(firestore, 'users', user.uid);
        
        // This is the critical change. We remove the outer try/catch and handle the setDoc promise directly.
        // This ensures that if setDoc fails due to permissions, our contextual error handler will catch it.
        setDoc(userDocRef, newUserProfile)
            .then(() => {
                // On success, we don't need to do anything here because the
                // onAuthStateChanged listener will handle the redirect.
                // We just need to stop the loading spinner.
                setIsLoading(false);
            })
            .catch((err) => {
                // CONTEXTUAL ERROR EMITTER:
                // This will now be triggered correctly on a permission error.
                const contextualError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: newUserProfile,
                });
                errorEmitter.emit('permission-error', contextualError);
                
                // Also provide feedback to the user and stop loading.
                setError('No se pudo crear el perfil de usuario. Revisa los permisos.');
                setIsLoading(false);
            });

      } catch (authError: any) {
        // This catch block now ONLY handles errors from createUserWithEmailAndPassword
        let friendlyMessage = 'Ha ocurrido un error de autenticación.';
        switch (authError.code) {
          case 'auth/email-already-in-use':
            friendlyMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
            break;
          case 'auth/weak-password':
            friendlyMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
            break;
          default:
            friendlyMessage = authError.message;
            break;
        }
        setError(friendlyMessage);
        toast({
          variant: 'destructive',
          title: 'Error de Registro',
          description: friendlyMessage,
        });
        setIsLoading(false);
      }
    } else { // This is for Sign In
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // On successful sign-in, the useEffect in the parent will redirect.
        setIsLoading(false);
      } catch (signInError: any) {
        let friendlyMessage = 'Las credenciales son incorrectas. Inténtalo de nuevo.';
        // Firebase v9+ uses 'auth/invalid-credential' for both user-not-found and wrong-password
        if (signInError.code !== 'auth/invalid-credential') {
          friendlyMessage = signInError.message;
        }
        setError(friendlyMessage);
        toast({
          variant: 'destructive',
          title: 'Error al Iniciar Sesión',
          description: friendlyMessage,
        });
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSignUp && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="givenName">Nombre</Label>
            <Input
              id="givenName"
              type="text"
              placeholder="Tu nombre"
              required
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="familyName">Apellido</Label>
            <Input
              id="familyName"
              type="text"
              placeholder="Tu apellido"
              required
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          minLength={6}
        />
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          )
          : isSignUp
          ? 'Crear cuenta'
          : 'Iniciar Sesión'}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is logged in and profile is loaded.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  // Show a loading screen while checking auth state or if the user is already logged in and we are redirecting.
  if (isUserLoading || (!isUserLoading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Package2 className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Bienvenido a Hogachii</CardTitle>
        <CardDescription>
          Crea una cuenta o inicia sesión para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup">Registrarse</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="pt-4">
            <AuthForm isSignUp={false} />
          </TabsContent>
          <TabsContent value="signup" className="pt-4">
            <AuthForm isSignUp={true} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
