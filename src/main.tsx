import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/providers/auth-provider'
import { router } from '@/router'
import { Toaster } from '@/components/ui/sonner'

import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" closeButton />
    </AuthProvider>
  </QueryClientProvider>,
)
