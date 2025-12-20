import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

const tasks = [
  {
    category: 'Tu próxima misión',
    title: 'Planificar el menú de la semana',
    description:
      'Divide esta tarea en pequeños pasos: 1. Revisar la despensa. 2. Buscar 3 recetas. 3. Hacer la lista de la compra.',
    energy: 'Amarillo',
    progress: 33,
  },
  {
    category: 'Urgente',
    title: 'Confirmar cita con el pediatra',
    description:
      'La cita es para la revisión anual. Llamar al centro de salud antes de las 14:00h.',
    energy: 'Rojo',
  },
  {
    category: 'Algo rápido',
    title: 'Poner una lavadora de ropa blanca',
    description: 'Solo te tomará 5 minutos. ¡A por ello!',
    energy: 'Verde',
  },
];

const energyColorMap: { [key: string]: string } = {
  Verde: 'bg-green-500',
  Amarillo: 'bg-yellow-500',
  Rojo: 'bg-red-500',
};

export default function FocusMode() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.title} className="flex flex-col">
          <CardHeader>
            <CardDescription>{task.category}</CardDescription>
            <CardTitle className="text-xl">{task.title}</CardTitle>
            {task.progress && (
              <div className="pt-2">
                <Progress value={task.progress} />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-muted-foreground">{task.description}</p>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  energyColorMap[task.energy]
                }`}
              ></span>
              <span className="text-sm text-muted-foreground">{task.energy}</span>
            </div>
            <Button size="lg" className="font-bold">
              ¡HECHO!
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
