"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({
  chapterId,
  isAuthed,
}: {
  chapterId: string;
  isAuthed: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, messages: next }),
      });
      if (!res.ok || !res.body) {
        // Server returns JSON { error } on failure — surface the real reason.
        let detail = "Sorry, something went wrong. Please try again.";
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch {
          /* non-JSON body; keep the default message */
        }
        setMessages([...next, { role: "assistant", content: detail }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages([...next, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      // A 200 with an empty body means the model produced nothing (e.g. a
      // silent stream error) — don't leave the user staring at an empty bubble.
      if (!acc.trim()) {
        setMessages([
          ...next,
          {
            role: "assistant",
            content:
              "⚠️ The tutor didn't return a response. Please try again in a moment.",
          },
        ]);
      }
    } catch (err) {
      console.error("[chat] request failed:", err);
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "⚠️ Couldn't reach the tutor. Check your connection and try again.",
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  if (!isAuthed) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to chat with the tutor about this chapter.
      </p>
    );
  }

  return (
    <div className="flex h-[420px] flex-col border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask anything about this chapter — answers come from the video&apos;s
            transcript.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            {m.role === "assistant" && !m.content ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              m.content
            )}
          </div>
        ))}
        {/* Waiting for the first token — no assistant bubble exists yet. */}
        {streaming && messages[messages.length - 1]?.role === "user" && (
          <div className="max-w-[85%] bg-muted px-3 py-2 text-sm">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this chapter…"
          disabled={streaming}
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
