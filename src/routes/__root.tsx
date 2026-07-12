import { Link, Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

function RootComponent() {
  return <Outlet />
}

function RootErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const message = error instanceof Error ? error.message : 'Erro inesperado.'

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="space-y-4 rounded-xl border border-destructive/30 bg-card p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-destructive">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro durante a navegação. Você pode tentar novamente ou voltar para a página inicial.
        </p>
        <pre className="overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-destructive">
          {message}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
          >
            Ir para início
          </Link>
        </div>
      </div>
    </main>
  )
}
