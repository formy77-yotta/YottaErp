'use client';

import { useState, useCallback } from 'react';
import { CreateFinancialAccountDialog } from './CreateFinancialAccountDialog';
import { FinancialAccountsTable } from './FinancialAccountsTable';

export function FinancialAccountsSection() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAccountAdded = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateFinancialAccountDialog onSuccess={handleAccountAdded} />
      </div>
      <FinancialAccountsTable refreshKey={refreshKey} />
    </div>
  );
}
