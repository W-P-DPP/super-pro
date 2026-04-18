import type { PropsWithChildren } from 'react';
import { Toaster, TooltipProvider } from '@super-pro/shared-ui';
import { ThemeProvider } from '@/components/theme-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}
