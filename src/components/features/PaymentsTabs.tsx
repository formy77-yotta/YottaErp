/**
 * Componente Client per gestire i Tabs della pagina pagamenti
 * 
 * Gestisce lo stato dei tabs (Tipi di Pagamento / Condizioni di Pagamento)
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePaymentTypeDialog } from '@/components/features/CreatePaymentTypeDialog';
import { CreatePaymentConditionDialog } from '@/components/features/CreatePaymentConditionDialog';
import { SeedDefaultPaymentTypesButton } from '@/components/features/SeedDefaultPaymentTypesButton';
import { PaymentTypesTable } from './PaymentTypesTable';
import { PaymentConditionsTable } from './PaymentConditionsTable';

interface PaymentsTabsProps {
  paymentTypes: Array<{
    id: string;
    name: string;
    sdiCode: string;
    sepaCode: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  paymentConditions: Array<{
    id: string;
    name: string;
    paymentType: {
      id: string;
      name: string;
      sdiCode: string;
    };
    daysToFirstDue: number;
    gapBetweenDues: number;
    numberOfDues: number;
    isEndOfMonth: boolean;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export function PaymentsTabs({ paymentTypes, paymentConditions }: PaymentsTabsProps) {
  const [activeTab, setActiveTab] = useState('types');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="types">Tipi di Pagamento</TabsTrigger>
        <TabsTrigger value="conditions">Condizioni di Pagamento</TabsTrigger>
      </TabsList>

      {/* Tab Tipi di Pagamento */}
      <TabsContent value="types" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tipi di Pagamento</h2>
            <p className="text-sm text-muted-foreground">
              Metodi di pagamento conformi SDI (MP01-MP23) e SEPA
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SeedDefaultPaymentTypesButton />
            <CreatePaymentTypeDialog />
          </div>
        </div>

        <PaymentTypesTable paymentTypes={paymentTypes} />
      </TabsContent>

      {/* Tab Condizioni di Pagamento */}
      <TabsContent value="conditions" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Condizioni di Pagamento</h2>
            <p className="text-sm text-muted-foreground">
              Logica di calcolo scadenze (rate, giorni, fine mese)
            </p>
          </div>
          <CreatePaymentConditionDialog />
        </div>

        <PaymentConditionsTable paymentConditions={paymentConditions} />
      </TabsContent>
    </Tabs>
  );
}
