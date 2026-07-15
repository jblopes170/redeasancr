import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BanknoteArrowDown, BanknoteArrowUp, Landmark, WalletCards } from 'lucide-react'

import { AdminLayout } from '@/components/admin-layout'
import { FinancialManager } from '@/components/financial-manager'
import { ProtectedRoute } from '@/components/protected-route'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAdminEvents, getFinancialTransactions } from '@/services/api'

export const Route = createFileRoute('/admin/finance')({
  component: AdminFinancePage,
})

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function AdminFinancePage() {
  const [selectedEventId, setSelectedEventId] = useState('')

  const eventsQuery = useQuery({ queryKey: ['admin-events', 'finance'], queryFn: getAdminEvents })
  const transactionsQuery = useQuery({ queryKey: ['financial-transactions', 'all'], queryFn: () => getFinancialTransactions() })

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id)
    }
  }, [events, selectedEventId])

  const summary = useMemo(() => {
    const rows = (transactionsQuery.data ?? []).filter((row) => row.status !== 'cancelled')
    const paidRows = rows.filter((row) => row.status === 'settled')
    const income = rows.filter((row) => row.direction === 'income').reduce((total, row) => total + Number(row.amount), 0)
    const expense = rows.filter((row) => row.direction === 'expense').reduce((total, row) => total + Number(row.amount), 0)
    const cashIncome = paidRows.filter((row) => row.direction === 'income').reduce((total, row) => total + Number(row.amount), 0)
    const cashExpense = paidRows.filter((row) => row.direction === 'expense').reduce((total, row) => total + Number(row.amount), 0)
    return {
      income,
      expense,
      result: income - expense,
      cashBalance: cashIncome - cashExpense,
      automaticRegistrations: rows
        .filter((row) => row.category === 'registration' && row.registration_request_id && row.status === 'settled')
        .reduce((total, row) => total + Number(row.amount), 0),
    }
  }, [transactionsQuery.data])

  const financeError = transactionsQuery.error

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout title="Financeiro e DRE">
        <div className="space-y-5">
          {financeError && (
            <Alert variant="destructive">
              <AlertTitle>Financeiro ainda nao configurado</AlertTitle>
              <AlertDescription>{financeError instanceof Error ? financeError.message : 'Nao foi possivel carregar o DRE.'}</AlertDescription>
            </Alert>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-emerald-200 bg-emerald-50/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-emerald-800">Receitas totais</p><BanknoteArrowUp className="h-5 w-5 text-emerald-700" /></div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-800">{formatCurrency(summary.income)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-red-800">Despesas totais</p><BanknoteArrowDown className="h-5 w-5 text-red-700" /></div>
                <p className="mt-2 text-2xl font-extrabold text-red-800">{formatCurrency(summary.expense)}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/25 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-primary">Resultado DRE</p><Landmark className="h-5 w-5 text-primary" /></div>
                <p className="mt-2 text-2xl font-extrabold text-primary">{formatCurrency(summary.result)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">Caixa realizado</p><WalletCards className="h-5 w-5" /></div>
                <p className="mt-2 text-2xl font-extrabold">{formatCurrency(summary.cashBalance)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Inscricoes pagas: {formatCurrency(summary.automaticRegistrations)}</p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.4fr)] md:items-center">
              <div>
                <h2 className="text-xl font-extrabold text-primary">Lancamentos por evento</h2>
                <p className="text-sm text-muted-foreground">Escolha uma etapa para registrar saidas, patrocinios e conferir o DRE do evento.</p>
              </div>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger><SelectValue placeholder="Selecione o evento" /></SelectTrigger>
                <SelectContent>
                  {events.map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {eventsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eventos...</CardContent></Card>
          ) : !selectedEventId ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Crie um evento antes de usar o financeiro.</CardContent></Card>
          ) : (
            <FinancialManager eventId={selectedEventId} />
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
