import { useSendPrep } from './hooks/useSendPrep';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InputArea } from './components/InputArea';
import { MetricsBar } from './components/MetricsBar';
import { ReviewList } from './components/ReviewList';
import { RecipientList } from './components/RecipientList';
import { OutputControls } from './components/OutputControls';

export const App: React.FC = () => {
  const {
    rawInput,
    setRawInput,
    outputFormat,
    setOutputFormat,
    cleanRecipients,
    activeReviewItems,
    duplicatesCount,
    formattedOutput,
    copyNotification,
    resolveDisplayNameConflict,
    resolveReviewItemAsRecipient,
    dismissReviewItem,
    deleteRecipient,
    updateRecipient,
    copyToClipboard,
    clearAll,
  } = useSendPrep();

  const hasContent = rawInput.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-stone-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {/* Intro hero for initial empty state */}
        {!hasContent && (
          <div className="text-center py-6 sm:py-8 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
              Paste the mess. Prep the send.
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
              Paste messy email recipients and turn them into a clean, deduplicated list ready for review and copy.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-stone-400 select-none">
              <span>Paste</span>
              <span>→</span>
              <span>Review</span>
              <span>→</span>
              <span>Copy</span>
            </div>
          </div>
        )}

        {/* Input Area */}
        <InputArea
          value={rawInput}
          onChange={setRawInput}
          onClear={clearAll}
        />

        {/* Live Processed Workbench */}
        {hasContent && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. Workbench Status Summary */}
            <MetricsBar
              recipientCount={cleanRecipients.length}
              duplicateCount={duplicatesCount}
              reviewCount={activeReviewItems.length}
            />

            {/* 2. Review Bench (only when items exist) */}
            {activeReviewItems.length > 0 && (
              <ReviewList
                items={activeReviewItems}
                onResolveDisplayName={resolveDisplayNameConflict}
                onResolveAsRecipient={resolveReviewItemAsRecipient}
                onDismiss={dismissReviewItem}
              />
            )}

            {/* 3. Output Formatting & Primary Copy Action */}
            <OutputControls
              recipientCount={cleanRecipients.length}
              outputFormat={outputFormat}
              formattedOutput={formattedOutput}
              unresolvedCount={activeReviewItems.length}
              copyNotification={copyNotification}
              onFormatChange={setOutputFormat}
              onCopy={copyToClipboard}
            />

            {/* 4. Ready Recipients (Evidence Drawer) */}
            <RecipientList
              recipients={cleanRecipients}
              onDeleteRecipient={deleteRecipient}
              onUpdateRecipient={updateRecipient}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
