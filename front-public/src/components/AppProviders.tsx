import type { PropsWithChildren } from 'react'
import { GlobalConfigProvider } from '@/components/GlobalConfigProvider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <GlobalConfigProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </GlobalConfigProvider>
      <Toaster />
    </ThemeProvider>
  )
}
