'use client';

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { widgetConfigList, type WidgetKeys } from "@/app/(main)/dashboard/page";

type DashboardSettingsProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visibleWidgets: WidgetKeys[];
  onWidgetToggle: (widgetId: WidgetKeys, checked: boolean) => void;
};

export default function DashboardSettings({
  isOpen,
  onOpenChange,
  visibleWidgets,
  onWidgetToggle,
}: DashboardSettingsProps) {

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
          <SheetDescription>
            Activa o desactiva los widgets que quieres ver.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-4">
          {widgetConfigList.map((widget) => (
            <div key={widget.id} className="grid grid-cols-3 items-center gap-4">
              <Label
                htmlFor={`${widget.id}-switch`}
                className="col-span-2 flex flex-col gap-1"
              >
                <span>{widget.label}</span>
              </Label>
              <div className="flex items-center justify-end">
                <Switch
                  id={`${widget.id}-switch`}
                  checked={visibleWidgets.includes(widget.id as WidgetKeys)}
                  onCheckedChange={(checked) =>
                    onWidgetToggle(widget.id as WidgetKeys, checked)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
