import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { askAssistant } from "@/lib/assistant.functions";
import { productsQuery, settingsQuery } from "@/lib/catalog.queries";
import { cleanText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Which fans are best for a 50-unit dealer order?",
  "Compare the two water pumps",
  "What's the MOQ on LED bulbs?",
];

export function AssistantWidget() {
  const { data: settings } = useQuery(settingsQuery);
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const { data: products = [] } = useQuery({ ...productsQuery(), enabled: open });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  if (settings && !settings.assistant_enabled) return null;

  async function send(text: string) {
    const content = cleanText(text, 1000);
    if (!content || busy) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next.slice(-12) } });
      setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Sorry, I couldn't reach the assistant. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground shadow-float transition-transform hover:scale-105"
        aria-label={open ? "Close shopping assistant" : "Open shopping assistant"}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        <span className="hidden text-sm font-bold sm:inline">{open ? "Close" : "Ask AI"}</span>
      </button>

      {open && (
        <div className="fixed inset-x-2 bottom-20 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-xl border bg-card shadow-float sm:inset-x-auto sm:right-4 sm:w-96">
          <div className="flex items-center gap-2 bg-header px-4 py-3 text-header-foreground">
            <Bot className="h-5 w-5 text-cta" />
            <div>
              <p className="font-display text-sm font-bold">Trade Hub Assistant</p>
              <p className="text-[11px] text-header-muted">Product picks, MOQs and bulk-order help</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Hi! Ask me about products, dealer pricing or order planning.</p>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="block w-full rounded-md border bg-surface px-3 py-2 text-left text-xs font-medium hover:border-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => {
              const mentioned =
                m.role === "assistant"
                  ? products.filter((p) => m.content.includes(p.name)).slice(0, 3)
                  : [];
              return (
                <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {m.content}
                  </div>
                  {mentioned.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {mentioned.map((p) => (
                        <Link
                          key={p.id}
                          to="/product/$slug"
                          params={{ slug: p.slug }}
                          onClick={() => setOpen(false)}
                          className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-semibold text-primary hover:border-primary"
                        >
                          View {p.name.split(" ").slice(0, 3).join(" ")}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 1000))}
              placeholder="Ask about products…"
              className="min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
              aria-label="Message the assistant"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="grid h-10 w-10 place-items-center rounded-md bg-cta text-cta-foreground disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
