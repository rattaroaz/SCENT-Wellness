"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { formatPhoneDisplay } from "@/lib/phoneFormat";

export type PhoneThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  received: boolean;
};

function MessageBubble({ message }: { message: PhoneThreadMessage }) {
  return (
    <div className={`flex ${message.received ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2 text-[15px] leading-snug shadow-sm ${
          message.received
            ? "rounded-2xl rounded-tl-sm bg-[#e9e9eb] text-black"
            : "rounded-2xl rounded-tr-sm bg-[#007aff] text-white"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={`mt-0.5 text-right text-[11px] ${
            message.received ? "text-black/45" : "text-white/70"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

type PhoneShellProps = {
  phoneNumber: string;
  contactName: string;
  contactSubtitle?: string;
  avatarLabel: string;
  messages: PhoneThreadMessage[];
  emptyHint: string;
  compose?: ReactNode;
  compact?: boolean;
};

export function PhoneShell({
  phoneNumber,
  contactName,
  contactSubtitle,
  avatarLabel,
  messages,
  emptyHint,
  compose,
  compact = false,
}: PhoneShellProps) {
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const displayNumber = formatPhoneDisplay(phoneNumber);

  return (
    <div
      className={`flex h-full min-h-0 flex-col items-center overflow-hidden bg-slate-200 p-1.5 ${
        compact ? "" : "p-2"
      }`}
    >
      <div
        className={`flex h-full w-full flex-col overflow-hidden rounded-[2rem] border-[3px] border-slate-800 bg-black shadow-xl ${
          compact ? "max-w-[220px]" : "max-w-[280px]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between bg-black px-4 pt-2 pb-0.5 text-[10px] font-medium text-white">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm border border-white/80" />
            <span className="text-[9px]">5G</span>
            <span className="ml-0.5 inline-block h-2.5 w-4 rounded-sm bg-white/90" />
          </div>
        </div>

        <div className="shrink-0 border-b border-white/10 bg-[#1c1c1e] px-2 py-2 text-center">
          <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#5856d6] text-[10px] font-bold text-white">
            {avatarLabel}
          </div>
          <p className="truncate text-xs font-semibold text-white">{contactName}</p>
          <p className="truncate text-[10px] text-white/50">
            {contactSubtitle ?? displayNumber}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-2.5 py-2.5">
          {messages.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-400">{emptyHint}</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={threadEndRef} />
            </div>
          )}
        </div>

        {compose}

        <div className="shrink-0 bg-[#f6f6f6] pb-1.5 pt-0.5">
          <div className="mx-auto h-1 w-20 rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}
