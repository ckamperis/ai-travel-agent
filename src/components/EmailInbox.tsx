'use client';

interface EmailInboxProps {
  visible: boolean;
  compact?: boolean;
}

const DEMO_EMAIL = {
  from: 'klaus.mueller@gmail.com',
  subject: 'Trip to Greece - next week availability?',
  body: `Guten Tag,

We are Klaus and Anna Mueller from Hamburg, Germany. We are planning a trip to Greece for next week (7 days) and we are looking for:

- Flights from Hamburg to Athens (arriving Monday morning if possible)
- A nice hotel in central Athens, close to metro, mid-range budget (~120-150\u20AC/night)
- A complete travel plan: what to see, where to eat, day trips from Athens
- We love history, local food, and walking around neighborhoods
- We would also like to visit one island for 2 days if possible

Could you please help us organize everything?

Best regards,
Klaus & Anna Mueller`,
};

export default function EmailInbox({ visible, compact = false }: EmailInboxProps) {
  if (!visible) return null;

  return (
    <div
      className={`animate-fade-in-up w-full ${compact ? 'max-w-2xl' : 'max-w-3xl'} mx-auto`}
    >
      <div className="glass-card overflow-hidden">
        {/* Email header */}
        <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/20 text-lg">
              📨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {DEMO_EMAIL.from}
                </span>
                <span className="animate-badge-pulse rounded-md bg-cyan px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-deep">
                  NEW
                </span>
              </div>
              <div className="mt-0.5 text-sm text-foreground/60">
                {DEMO_EMAIL.subject}
              </div>
            </div>
          </div>
          <div className="text-xs text-foreground/40">Τώρα</div>
        </div>

        {/* Email body */}
        <div
          className={`px-6 py-5 ${compact ? 'max-h-48 overflow-y-auto' : ''}`}
        >
          <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-foreground/85">
            {DEMO_EMAIL.body}
          </pre>
        </div>
      </div>
    </div>
  );
}
