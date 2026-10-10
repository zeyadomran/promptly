import { useState } from 'react';

import type { PreparedCopy, VariableAnswers } from '../../../shared/contracts/workflow-copy';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { ResolvedPreview } from '../variables/ResolvedPreview';
import { VariableText } from '../variables/VariableText';

export function BundlePreview({
  prepared,
  values,
  exactText,
  previewValid = true
}: {
  prepared: PreparedCopy;
  values: VariableAnswers;
  exactText: string;
  previewValid?: boolean;
}) {
  const [mode, setMode] = useState('annotated');
  const separator = prepared.source.kind === 'bundle' ? prepared.source.separator : 'blank-line';

  return (
    <div className="bundle-preview">
      <ToggleGroup
        type="single"
        value={mode}
        aria-label="Preview mode"
        onValueChange={(value) => {
          if (value !== '') setMode(value);
        }}
      >
        <ToggleGroupItem value="annotated">Annotated</ToggleGroupItem>
        <ToggleGroupItem value="exact">Exact text</ToggleGroupItem>
      </ToggleGroup>
      {mode === 'exact' ? (
        <ResolvedPreview text={exactText} />
      ) : (
        <>
          <div
            className="workflow-annotated-preview"
            tabIndex={0}
            aria-label="Annotated bundle preview"
          >
            {prepared.segments.map((segment, index) => (
              <div key={segment.id}>
                {index > 0 && (
                  <p className="bundle-separator-marker">
                    {separator === 'divider'
                      ? 'Divider: ---'
                      : separator === 'tagged'
                        ? 'Tagged wrapper'
                        : 'Blank line'}
                  </p>
                )}
                <div className="bundle-preview-block">
                  <span className="bundle-order-number">{index + 1}</span>
                  <pre>
                    {prepared.variables.length > 0 ? (
                      <VariableText
                        text={segment.text.replace(/[\r\n]+$/u, '')}
                        values={previewValid ? values : undefined}
                      />
                    ) : (
                      segment.text.replace(/[\r\n]+$/u, '')
                    )}
                  </pre>
                </div>
              </div>
            ))}
          </div>
          <p className="workflow-note">
            Grey labels are not copied. {exactText.length.toLocaleString()} characters.
          </p>
        </>
      )}
    </div>
  );
}
