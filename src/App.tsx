import { useSendPrep } from './hooks/useSendPrep';
import { Header } from './components/Header';
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
    <div className="min-h-screen bg-[#fbfbf9] text-stone-900 flex flex-col font-sans">
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

            {/* 4. Verified Recipients (Evidence Drawer) */}
            <RecipientList
              recipients={cleanRecipients}
              onDeleteRecipient={deleteRecipient}
              onUpdateRecipient={updateRecipient}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-stone-200/70 py-4 text-center text-xs text-stone-500 mt-auto bg-white/40">
        <div className="max-w-4xl mx-auto px-4">
          Your recipient data is processed locally in your browser and is not uploaded by SendPrep.
        </div>
      </footer>
    </div>
  );
};

export default App;
