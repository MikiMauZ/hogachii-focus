import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

const checklistItems = [
  { id: 'prep1', label: 'Preparar ropa para mañana' },
  { id: 'prep2', label: 'Cargar dispositivos electrónicos' },
  { id: 'prep3', label: 'Revisar la agenda del día siguiente' },
  { id: 'prep4', label: 'Dejar lista la mochila/bolso' },
];

export default function ExternalBrain() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 h-full">
      <Card>
        <CardHeader>
          <CardTitle>¿Qué olvidé?</CardTitle>
          <CardDescription>
            Anota aquí pensamientos rápidos para que no se te escapen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Ej: Comprar pan, llamar a mamá..." />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preparación Nocturna</CardTitle>
          <CardDescription>
            Una rutina para empezar el día con buen pie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox id={item.id} />
              <Label htmlFor={item.id} className="text-sm font-normal">
                {item.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
