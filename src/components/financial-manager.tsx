import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  Clock3,
  Download,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SuggestionInput } from '@/components/ui/suggestion-input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { downloadExcel } from '@/lib/spreadsheet'
import {
  deleteFinancialTransaction,
  getAdminRegistrationRequests,
  getFinancialTransactions,
  saveFinancialTransaction,
} from '@/services/api'
import type {
  FinancialDirection,
  FinancialStatus,
  FinancialTransactionRecord,
  RegistrationRequestRecord,
} from '@/types/domain'

const INCOME_CATEGORIES = [
  { value: 'registration', label: 'Inscrições' },
  { value: 'sponsorship', label: 'Patrocínios' },
  { value: 'ticket', label: 'Bilheteria' },
  { value: 'sale', label: 'Vendas' },
  { value: 'other_income', label: 'Outras receitas' },
]

const EXPENSE_CATEGORIES = [
  { value: 'prize', label: 'Premiações' },
  { value: 'venue_rental', label: 'Aluguel do espaço' },
  { value: 'internet', label: 'Internet e comunicação' },
  { value: 'staff', label: 'Equipe e prestadores' },
  { value: 'accommodation', label: 'Hospedagem' },
  { value: 'food', label: 'Alimentação' },
  { value: 'transport', label: 'Transporte' },
  { value: 'marketing', label: 'Marketing e divulgação' },
  { value: 'tax', label: 'Taxas e impostos' },
  { value: 'other_expense', label: 'Outras despesas' },
]

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Transferência', 'Boleto', 'Cartão', 'Outro']

interface FinancialManagerProps {
  eventId: string
}

interface FinancialForm {
  id?: string
  direction: FinancialDirection
  category: string
  description: string
  counterparty: string
  amount: string
  status: FinancialStatus
  competenceDate: string
  dueDate: string
  settledOn: string
  paymentMethod: string
  registrationRequestId: string
  notes: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const defaultForm: FinancialForm = {
  direction: 'income',
  category: 'registration',
  description: '',
  counterparty: '',
  amount: '',
  status: 'pending',
  competenceDate: today(),
  dueDate: '',
  settledOn: '',
  paymentMethod: '',
  registrationRequestId: '',
  notes: '',
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | null) {
  if (!value) return '--'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

function categoryLabel(category: string) {
  return [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find((item) => item.value === category)?.label ?? category
}

function statusLabel(status: FinancialStatus) {
  if (status === 'settled') return 'Realizado'
  if (status === 'cancelled') return 'Cancelado'
  return 'Pendente'
}

function statusClass(status: FinancialStatus) {
  if (status === 'settled') return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  if (status === 'cancelled') return 'border-slate-300 bg-slate-100 text-slate-600'
  return 'border-amber-300 bg-amber-50 text-amber-800'
}

function requestLabel(request: RegistrationRequestRecord) {
  return `${request.competitor_name} / ${request.horse_name}`
}

export function FinancialManager({ eventId }: FinancialManagerProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FinancialForm>(defaultForm)
  const [directionFilter, setDirectionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const transactionsQuery = useQuery({
    queryKey: ['financial-transactions', eventId],
    queryFn: () => getFinancialTransactions(eventId),
  })
  const requestsQuery = useQuery({
    queryKey: ['admin-registration-requests', 'finance', eventId],
    queryFn: () => getAdminRegistrationRequests('approved'),
  })

  const rows = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data])
  const eventRequests = useMemo(
    () => (requestsQuery.data ?? []).filter((request) => request.event_id === eventId),
    [eventId, requestsQuery.data],
  )
  const availableRequests = useMemo(() => {
    const linked = new Set(rows.filter((row) => row.status !== 'cancelled').map((row) => row.registration_request_id))
    return eventRequests.filter((request) => !linked.has(request.id) || request.id === form.registrationRequestId)
  }, [eventRequests, form.registrationRequestId, rows])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
    return rows.filter((row) => {
      if (directionFilter !== 'all' && row.direction !== directionFilter) return false
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (dateFrom && row.competence_date < dateFrom) return false
      if (dateTo && row.competence_date > dateTo) return false
      if (normalizedSearch) {
        const haystack = `${row.description} ${row.counterparty ?? ''} ${categoryLabel(row.category)}`.toLocaleLowerCase('pt-BR')
        if (!haystack.includes(normalizedSearch)) return false
      }
      return true
    })
  }, [dateFrom, dateTo, directionFilter, rows, search, statusFilter])

  const summary = useMemo(() => {
    const active = filteredRows.filter((row) => row.status !== 'cancelled')
    const settled = active.filter((row) => row.status === 'settled')
    const income = active.filter((row) => row.direction === 'income').reduce((total, row) => total + Number(row.amount), 0)
    const expense = active.filter((row) => row.direction === 'expense').reduce((total, row) => total + Number(row.amount), 0)
    const cashIncome = settled.filter((row) => row.direction === 'income').reduce((total, row) => total + Number(row.amount), 0)
    const cashExpense = settled.filter((row) => row.direction === 'expense').reduce((total, row) => total + Number(row.amount), 0)
    const pendingIncome = active.filter((row) => row.direction === 'income' && row.status === 'pending').reduce((total, row) => total + Number(row.amount), 0)
    const pendingExpense = active.filter((row) => row.direction === 'expense' && row.status === 'pending').reduce((total, row) => total + Number(row.amount), 0)
    return { income, expense, result: income - expense, cashIncome, cashExpense, cashBalance: cashIncome - cashExpense, pendingIncome, pendingExpense }
  }, [filteredRows])

  const dreGroups = useMemo(() => {
    const totals = new Map<string, { direction: FinancialDirection; category: string; total: number }>()
    for (const row of filteredRows.filter((item) => item.status !== 'cancelled')) {
      const key = `${row.direction}:${row.category}`
      const current = totals.get(key) ?? { direction: row.direction, category: row.category, total: 0 }
      current.total += Number(row.amount)
      totals.set(key, current)
    }
    return Array.from(totals.values()).sort((a, b) => b.total - a.total)
  }, [filteredRows])

  const counterpartyOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.counterparty?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((value) => ({ value })),
    [rows],
  )

  const saveMutation = useMutation({
    mutationFn: () => {
      const amount = parseMoney(form.amount)
      if (!form.description.trim()) throw new Error('Informe a descrição do lançamento.')
      if (!form.category) throw new Error('Selecione a categoria.')
      if (amount <= 0) throw new Error('Informe um valor maior que zero.')
      return saveFinancialTransaction({
        id: form.id,
        event_id: eventId,
        direction: form.direction,
        category: form.category,
        description: form.description,
        counterparty: form.counterparty,
        amount,
        status: form.status,
        competence_date: form.competenceDate,
        due_date: form.dueDate,
        settled_on: form.settledOn,
        payment_method: form.paymentMethod,
        registration_request_id: form.direction === 'income' && form.category === 'registration'
          ? form.registrationRequestId
          : undefined,
        notes: form.notes,
      })
    },
    onSuccess: () => {
      toast.success('Lançamento financeiro salvo.')
      setDialogOpen(false)
      setForm(defaultForm)
      void queryClient.invalidateQueries({ queryKey: ['financial-transactions', eventId] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao salvar lançamento.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFinancialTransaction,
    onSuccess: () => {
      toast.success('Lançamento removido.')
      void queryClient.invalidateQueries({ queryKey: ['financial-transactions', eventId] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao remover lançamento.'),
  })

  function openNew(direction: FinancialDirection = 'income') {
    setForm({
      ...defaultForm,
      direction,
      category: direction === 'income' ? 'registration' : 'venue_rental',
      competenceDate: today(),
    })
    setDialogOpen(true)
  }

  function openEdit(row: FinancialTransactionRecord) {
    setForm({
      id: row.id,
      direction: row.direction,
      category: row.category,
      description: row.description,
      counterparty: row.counterparty ?? '',
      amount: String(row.amount).replace('.', ','),
      status: row.status,
      competenceDate: row.competence_date,
      dueDate: row.due_date ?? '',
      settledOn: row.settled_on ?? '',
      paymentMethod: row.payment_method ?? '',
      registrationRequestId: row.registration_request_id ?? '',
      notes: row.notes ?? '',
    })
    setDialogOpen(true)
  }

  function selectRequest(requestId: string) {
    const request = eventRequests.find((item) => item.id === requestId)
    setForm((current) => ({
      ...current,
      registrationRequestId: requestId === 'none' ? '' : requestId,
      description: request ? `Inscrição - ${requestLabel(request)}` : current.description,
      counterparty: request ? request.user?.name || request.user?.email || request.competitor_name : current.counterparty,
    }))
  }

  const maxDreValue = Math.max(...dreGroups.map((item) => item.total), 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl font-bold">Financeiro e DRE</h2>
          <p className="text-sm text-muted-foreground">Controle entradas, saídas, contas pendentes e o caixa real do evento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openNew('expense')}><BanknoteArrowDown className="h-4 w-4" />Nova saída</Button>
          <Button onClick={() => openNew('income')}><Plus className="h-4 w-4" />Nova entrada</Button>
        </div>
      </div>

      {transactionsQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Financeiro ainda não configurado</AlertTitle>
          <AlertDescription>{transactionsQuery.error instanceof Error ? transactionsQuery.error.message : 'Não foi possível carregar o financeiro.'}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-200 bg-emerald-50/60"><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-emerald-800">Entradas recebidas</p><BanknoteArrowUp className="h-5 w-5 text-emerald-700" /></div><p className="mt-2 text-2xl font-extrabold text-emerald-800">{formatCurrency(summary.cashIncome)}</p></CardContent></Card>
        <Card className="border-red-200 bg-red-50/60"><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-red-800">Saídas pagas</p><BanknoteArrowDown className="h-5 w-5 text-red-700" /></div><p className="mt-2 text-2xl font-extrabold text-red-800">{formatCurrency(summary.cashExpense)}</p></CardContent></Card>
        <Card className="border-blue-200 bg-blue-50/60"><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-blue-800">Saldo em caixa</p><WalletCards className="h-5 w-5 text-blue-700" /></div><p className="mt-2 text-2xl font-extrabold text-blue-800">{formatCurrency(summary.cashBalance)}</p></CardContent></Card>
        <Card className={summary.result >= 0 ? 'border-primary/25 bg-primary/5' : 'border-red-200 bg-red-50'}><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Resultado DRE</p><ReceiptText className="h-5 w-5" /></div><p className={`mt-2 text-2xl font-extrabold ${summary.result >= 0 ? 'text-primary' : 'text-red-700'}`}>{formatCurrency(summary.result)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader><CardTitle>DRE por categoria</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/45 p-3 text-center text-sm">
              <div><p className="text-muted-foreground">Receitas</p><p className="font-bold text-emerald-700">{formatCurrency(summary.income)}</p></div>
              <div><p className="text-muted-foreground">Despesas</p><p className="font-bold text-red-700">{formatCurrency(summary.expense)}</p></div>
              <div><p className="text-muted-foreground">Resultado</p><p className="font-bold">{formatCurrency(summary.result)}</p></div>
            </div>
            {dreGroups.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum valor para demonstrar.</p> : dreGroups.map((group) => (
              <div key={`${group.direction}-${group.category}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm"><span>{categoryLabel(group.category)}</span><strong className={group.direction === 'income' ? 'text-emerald-700' : 'text-red-700'}>{formatCurrency(group.total)}</strong></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${group.direction === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.max((group.total / maxDreValue) * 100, 3)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" />Valores pendentes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm text-emerald-800">A receber</p><p className="text-xl font-extrabold text-emerald-800">{formatCurrency(summary.pendingIncome)}</p></div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-800">A pagar</p><p className="text-xl font-extrabold text-red-800">{formatCurrency(summary.pendingExpense)}</p></div>
            <p className="text-xs text-muted-foreground">O saldo em caixa considera apenas lançamentos marcados como realizados.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descrição, pessoa ou empresa" /></div>
          <Select value={directionFilter} onValueChange={setDirectionFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Entradas e saídas</SelectItem><SelectItem value="income">Entradas</SelectItem><SelectItem value="expense">Saídas</SelectItem></SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="settled">Realizados</SelectItem><SelectItem value="cancelled">Cancelados</SelectItem></SelectContent></Select>
          <Input type="date" aria-label="Data inicial" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" aria-label="Data final" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <Button variant="outline" className="sm:col-span-2 lg:col-span-6 lg:justify-self-end" onClick={() => downloadExcel('financeiro-dre.xlsx', filteredRows.map((row) => ({ tipo: row.direction === 'income' ? 'Entrada' : 'Saída', categoria: categoryLabel(row.category), descricao: row.description, pessoa_empresa: row.counterparty ?? '', competencia: formatDate(row.competence_date), vencimento: formatDate(row.due_date), status: statusLabel(row.status), realizado_em: formatDate(row.settled_on), forma_pagamento: row.payment_method ?? '', valor: Number(row.amount), observacoes: row.notes ?? '' })), { sheetName: 'Financeiro' })}><Download className="h-4 w-4" />Exportar Excel</Button>
        </CardContent>
      </Card>

      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhum lançamento encontrado.</TableCell></TableRow> : filteredRows.map((row) => (
              <TableRow key={row.id} className={row.status === 'cancelled' ? 'opacity-55' : ''}>
                <TableCell>{formatDate(row.competence_date)}</TableCell>
                <TableCell><Badge variant="outline" className={row.direction === 'income' ? 'border-emerald-300 text-emerald-800' : 'border-red-300 text-red-800'}>{row.direction === 'income' ? 'Entrada' : 'Saída'}</Badge></TableCell>
                <TableCell><p className="font-semibold">{row.description}</p><p className="text-xs text-muted-foreground">{row.counterparty || '--'}</p></TableCell>
                <TableCell>{categoryLabel(row.category)}</TableCell>
                <TableCell><Badge variant="outline" className={statusClass(row.status)}>{statusLabel(row.status)}</Badge></TableCell>
                <TableCell className={`text-right font-bold ${row.direction === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{row.direction === 'income' ? '+' : '-'} {formatCurrency(Number(row.amount))}</TableCell>
                <TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="outline" onClick={() => openEdit(row)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => deleteMutation.mutate(row.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredRows.length === 0 ? <Card><CardContent className="p-5 text-sm text-muted-foreground">Nenhum lançamento encontrado.</CardContent></Card> : filteredRows.map((row) => (
          <Card key={row.id} className={row.status === 'cancelled' ? 'opacity-55' : ''}><CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{row.description}</p><p className="text-xs text-muted-foreground">{categoryLabel(row.category)} · {formatDate(row.competence_date)}</p></div><p className={`font-extrabold ${row.direction === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{row.direction === 'income' ? '+' : '-'} {formatCurrency(Number(row.amount))}</p></div><div className="flex items-center justify-between"><Badge variant="outline" className={statusClass(row.status)}>{statusLabel(row.status)}</Badge><div className="flex gap-1"><Button size="icon" variant="outline" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => deleteMutation.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button></div></div></CardContent></Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? 'Editar lançamento' : form.direction === 'income' ? 'Nova entrada' : 'Nova saída'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={form.direction === 'income' ? 'default' : 'outline'} onClick={() => setForm((current) => ({ ...current, direction: 'income', category: 'registration' }))}><BanknoteArrowUp className="h-4 w-4" />Entrada</Button>
              <Button type="button" variant={form.direction === 'expense' ? 'destructive' : 'outline'} onClick={() => setForm((current) => ({ ...current, direction: 'expense', category: 'venue_rental', registrationRequestId: '' }))}><BanknoteArrowDown className="h-4 w-4" />Saída</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label>Categoria *</Label><Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value, registrationRequestId: value === 'registration' ? current.registrationRequestId : '' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(form.direction === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-1.5"><Label>Valor *</Label><Input inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0,00" /></div>
            </div>
            {form.direction === 'income' && form.category === 'registration' && (
              <div className="grid gap-1.5"><Label>Vincular inscrição aprovada</Label><Select value={form.registrationRequestId || 'none'} onValueChange={selectRequest}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent><SelectItem value="none">Sem vínculo</SelectItem>{availableRequests.map((request) => <SelectItem key={request.id} value={request.id}>{requestLabel(request)}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">O vínculo impede que a mesma solicitação seja contabilizada duas vezes.</p></div>
            )}
            <div className="grid gap-1.5"><Label>Descrição *</Label><Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder={form.direction === 'income' ? 'Ex.: Patrocínio Fazenda Exemplo' : 'Ex.: Aluguel da arena'} /></div>
            <div className="grid gap-1.5"><Label>Pessoa ou empresa</Label><SuggestionInput options={counterpartyOptions} value={form.counterparty} onChange={(event) => setForm((current) => ({ ...current, counterparty: event.target.value }))} placeholder="Digite ou escolha uma sugestão" /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5"><Label>Competência *</Label><Input type="date" value={form.competenceDate} onChange={(event) => setForm((current) => ({ ...current, competenceDate: event.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Vencimento</Label><Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></div>
              <div className="grid gap-1.5"><Label>Status *</Label><Select value={form.status} onValueChange={(value: FinancialStatus) => setForm((current) => ({ ...current, status: value, settledOn: value === 'settled' ? current.settledOn || today() : '' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="settled">Realizado</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select></div>
            </div>
            {form.status === 'settled' && <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-1.5"><Label>Recebido/pago em</Label><Input type="date" value={form.settledOn} onChange={(event) => setForm((current) => ({ ...current, settledOn: event.target.value }))} /></div><div className="grid gap-1.5"><Label>Forma de pagamento</Label><Select value={form.paymentMethod || 'none'} onValueChange={(value) => setForm((current) => ({ ...current, paymentMethod: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não informada</SelectItem>{PAYMENT_METHODS.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select></div></div>}
            <div className="grid gap-1.5"><Label>Observações</Label><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar lançamento'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
