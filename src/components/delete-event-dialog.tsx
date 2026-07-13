import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteEvent } from '@/services/api'
import type { EventRecord } from '@/types/domain'

interface DeleteEventDialogProps {
  event: EventRecord
  onDeleted: () => void
}

export function DeleteEventDialog({ event, onDeleted }: DeleteEventDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const mutation = useMutation({
    mutationFn: () => deleteEvent(event.id),
    onSuccess: () => {
      toast.success('Evento e dados vinculados foram excluídos.')
      setOpen(false)
      onDeleted()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o evento.'),
  })

  const confirmed = confirmation.trim() === event.name.trim()

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setConfirmation('') }}>
      <DialogTrigger asChild>
        <Button variant="destructive"><Trash2 className="h-4 w-4" />Excluir evento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Excluir evento definitivamente?</DialogTitle></DialogHeader>
        <Alert variant="destructive">
          <AlertTitle>Esta ação não pode ser desfeita</AlertTitle>
          <AlertDescription>
            Serão excluídos o evento, categorias, inscrições, notas, solicitações de inscrição e lançamentos financeiros vinculados. Publicações e sugestões permanecerão no histórico, mas sem vínculo com o evento.
          </AlertDescription>
        </Alert>
        <div className="grid gap-2">
          <Label>Digite o nome completo do evento para confirmar:</Label>
          <p className="rounded-md bg-muted px-3 py-2 text-sm font-bold">{event.name}</p>
          <Input value={confirmation} onChange={(changeEvent) => setConfirmation(changeEvent.target.value)} placeholder="Nome completo do evento" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={!confirmed || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Excluindo...' : 'Excluir tudo deste evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
