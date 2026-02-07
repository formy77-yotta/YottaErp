/**
 * Floating Action Button per aprire il Copilot
 * 
 * Componente client-side che gestisce lo stato del CopilotSheet
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { CopilotSheet } from './CopilotSheet';

export function CopilotFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        title="Apri AI Copilot"
      >
        <Bot className="h-6 w-6" />
      </Button>
      <CopilotSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
