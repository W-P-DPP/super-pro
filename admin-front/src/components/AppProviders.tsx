import type { PropsWithChildren } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { AdminMenuProvider } from '@/contexts/admin-menu-context'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AdminMenuProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AdminMenuProvider>
      <Toaster />
    </ThemeProvider>
  )
}
