'use client';

import { useState } from 'react';
import { UploadStep } from '@/components/features/document-import/UploadStep';

export default function ImportDocumentPage() {
  const [currentStep, setCurrentStep] = useState<
    'upload' | 'parse' | 'supplier' | 'products' | 'review'
  >('upload');
  const [_importId, setImportId] = useState<string | null>(null);
  const [_fileUrl, setFileUrl] = useState<string | null>(null);

  function handleUploadComplete(id: string, url: string) {
    setImportId(id);
    setFileUrl(url);
    setCurrentStep('parse');
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <Step
            number={1}
            label="Upload"
            active={currentStep === 'upload'}
            completed={currentStep !== 'upload'}
          />
          <Step
            number={2}
            label="Parsing"
            active={currentStep === 'parse'}
            completed={
              currentStep === 'supplier' ||
              currentStep === 'products' ||
              currentStep === 'review'
            }
          />
          <Step
            number={3}
            label="Fornitore"
            active={currentStep === 'supplier'}
            completed={currentStep === 'products' || currentStep === 'review'}
          />
          <Step
            number={4}
            label="Articoli"
            active={currentStep === 'products'}
            completed={currentStep === 'review'}
          />
          <Step number={5} label="Revisione" active={currentStep === 'review'} />
        </div>
      </div>

      {currentStep === 'upload' && (
        <UploadStep onUploadComplete={handleUploadComplete} />
      )}

      {currentStep === 'parse' && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          TODO: Parsing step (Fase 2)
        </div>
      )}

      {(currentStep === 'supplier' || currentStep === 'products') && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Step in fase di implementazione (Fase 3)
        </div>
      )}

      {currentStep === 'review' && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Step revisione (Fase 4)
        </div>
      )}
    </div>
  );
}

function Step({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-bold
          ${active ? 'bg-primary text-primary-foreground' : ''}
          ${completed ? 'bg-green-500 text-white' : ''}
          ${!active && !completed ? 'bg-muted text-muted-foreground' : ''}
        `}
      >
        {number}
      </div>
      <span
        className={`text-sm ${active ? 'font-bold' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  );
}
