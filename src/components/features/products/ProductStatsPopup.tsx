'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductStatsCard } from './ProductStatsCard';
import { BarChart2 } from 'lucide-react';

interface ProductStatsPopupProps {
  productId: string;
  productCode?: string;
  productName?: string;
}

export function ProductStatsPopup({
  productId,
  productCode,
  productName,
}: ProductStatsPopupProps) {
  const [open, setOpen] = useState(false);

  const title = [productCode, productName].filter(Boolean).join(' – ') || 'Statistiche';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Statistiche e valorizzazione"
        >
          <BarChart2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="pt-2">
          {(productCode || productName) && (
            <p className="text-sm text-muted-foreground mb-4">
              {productCode && <span className="font-mono">{productCode}</span>}
              {productCode && productName && ' · '}
              {productName && <span>{productName}</span>}
            </p>
          )}
          <ProductStatsCard productId={productId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
