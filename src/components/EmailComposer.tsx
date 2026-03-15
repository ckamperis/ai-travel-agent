'use client';

interface EmailComposerProps {
  text: string;
  isStreaming: boolean;
  visible: boolean;
  onSend?: () => void;
}

export default function EmailComposer({
  text,
  isStreaming,
  visible,
  onSend,
}: EmailComposerProps) {
  if (!visible) return null;

  return (
    <div className="animate-fade-in-up mx-auto w-full max-w-3xl">
      <div className="glass-card overflow-hidden" style={{ borderColor: '#EC489940' }}>
        {/* Compose header */}
        <div className="flex items-center gap-3 border-b border-card-border bg-pink/5 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink/20 text-lg">
            ✍️
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-pink">
              Σύνθεση Απάντησης
            </h3>
            <p className="text-xs text-foreground/40">
              {isStreaming ? 'Δημιουργία...' : 'Ολοκληρώθηκε'}
            </p>
          </div>
          {isStreaming && (
            <div className="ml-auto h-3 w-3 rounded-full bg-pink animate-pulse-glow" />
          )}
        </div>

        {/* Email metadata */}
        <div className="space-y-1 border-b border-card-border/50 px-6 py-3 text-sm">
          <div className="flex gap-2">
            <span className="text-foreground/40">Προς:</span>
            <span className="text-foreground/70">klaus.mueller@gmail.com</span>
          </div>
          <div className="flex gap-2">
            <span className="text-foreground/40">Θέμα:</span>
            <span className="text-foreground/70">
              RE: Trip to Greece - next week availability?
            </span>
          </div>
        </div>

        {/* Streaming body */}
        <div className="min-h-[200px] px-6 py-5">
          <div className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-foreground/85">
            {text}
            {isStreaming && (
              <span className="animate-blink ml-0.5 inline-block h-5 w-[2px] translate-y-[3px] bg-pink" />
            )}
          </div>
        </div>

        {/* Send button */}
        {!isStreaming && text.length > 0 && (
          <div className="animate-fade-in flex items-center justify-between border-t border-card-border px-6 py-4">
            <span className="text-xs text-foreground/30">
              {text.length} χαρακτήρες
            </span>
            <button
              onClick={onSend}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink to-purple px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-pink/30 active:scale-95 cursor-pointer"
            >
              📤 Αποστολή
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
