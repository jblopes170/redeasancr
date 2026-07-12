import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { EventRecord } from '@/types/domain'
import { EVENT_STATUS_LABEL } from '@/lib/constants'
import { saveEvent } from '@/services/api'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface EventFormDialogProps {
  triggerLabel?: string
  event?: EventRecord
  onSaved?: () => void
  disabled?: boolean
}

interface EventFormState {
  name: string
  location: string
  starts_on: string
  ends_on: string
  prize_pool: string
  status: EventRecord['status']
  notes: string
}

const defaultState: EventFormState = {
  name: '',
  location: '',
  starts_on: '',
  ends_on: '',
  prize_pool: '0',
  status: 'draft',
  notes: '',
}

export function EventFormDialog({ triggerLabel = 'Novo evento', event, onSaved, disabled }: EventFormDialogProps) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<EventFormState>(defaultState)

  useEffect(() => {
    if (!event) {
      setForm(defaultState)
      return
    }

    setForm({
      name: event.name,
      location: event.location ?? '',
      starts_on: event.starts_on ?? '',
      ends_on: event.ends_on ?? '',
      prize_pool: String(event.prize_pool ?? 0),
      status: event.status,
      notes: event.notes ?? '',
    })
  }, [event])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Nome do evento é obrigatório.')
      return
    }

    if (form.starts_on && form.ends_on && form.starts_on > form.ends_on) {
      toast.error('Data de início não pode ser maior que data de término.')
      return
    }

    setLoading(true)
    try {
      await saveEvent({
        id: event?.id,
        name: form.name,
        location: form.location,
        starts_on: form.starts_on || undefined,
        ends_on: form.ends_on || undefined,
        prize_pool: Number(form.prize_pool || 0),
        status: form.status,
        notes: form.notes,
        created_by: profile?.id,
      })

      toast.success('Evento salvo com sucesso.')
      setOpen(false)
      onSaved?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar evento' : 'Novo evento'}</DialogTitle>
          <DialogDescription>Informe os dados principais do campeonato.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="event-name">Nome do evento *</Label>
            <Input id="event-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-location">Local</Label>
            <Input id="event-location" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="event-start">Data de início</Label>
              <Input id="event-start" type="date" value={form.starts_on} onChange={(e) => setForm((prev) => ({ ...prev, starts_on: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-end">Data de término</Label>
              <Input id="event-end" type="date" value={form.ends_on} onChange={(e) => setForm((prev) => ({ ...prev, ends_on: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="event-prize">Bolsa total</Label>
              <Input
                id="event-prize"
                type="number"
                min="0"
                step="0.01"
                value={form.prize_pool}
                onChange={(e) => setForm((prev) => ({ ...prev, prize_pool: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as EventRecord['status'] }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(['draft', 'active', 'finished', 'published'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {EVENT_STATUS_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Rascunho fica oculto. Ao vivo libera notas e ranking público. Finalizado bloqueia novas notas de juízes.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-notes">Observações</Label>
            <Textarea id="event-notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
