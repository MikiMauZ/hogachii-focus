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
import { Package2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';

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

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        // The useUser hook will handle creating the Firestore profile.
        // We just need to update the auth profile display name.
        await updateProfile(user, {
          displayName: `${givenName} ${familyName}`.trim(),
        });
        
        toast({
          title: '¡Cuenta Creada!',
          description: 'Bienvenido/a. Serás redirigido en breve.',
        });
        // The useEffect in the parent will handle redirection.
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // On successful sign-in, the useEffect in the parent will redirect.
      }
    } catch (err: any) {
      let friendlyMessage = 'Ha ocurrido un error.';
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          friendlyMessage =
            'Las credenciales son incorrectas. Inténtalo de nuevo.';
          break;
        case 'auth/email-already-in-use':
          friendlyMessage =
            'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
          break;
        case 'auth/weak-password':
          friendlyMessage =
            'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
          break;
        default:
          friendlyMessage = err.message;
          break;
      }
      setError(friendlyMessage);
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: friendlyMessage,
      });
    } finally {
      setIsLoading(false);
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
          ? 'Procesando...'
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
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  // Show a loading screen while checking auth state or if the user is already logged in and we are redirecting.
  if (isUserLoading || (!isUserLoading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
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
    </div>
  );
}
