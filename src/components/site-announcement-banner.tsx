import { Megaphone } from "lucide-react";

export function SiteAnnouncementBanner({ title, content }: { title: string; content: string }) {
  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500/10 to-coral-500/10 px-3 py-2 md:px-4">
      <div className="flex items-center gap-2.5 text-xs leading-snug">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
        </span>
        <Megaphone size={15} className="shrink-0 text-brand-600" />
        <span className="max-w-[38%] shrink-0 truncate font-semibold text-main md:max-w-[27rem]">{title}</span>
        <div
          className="announcement-scroll min-w-0 flex-1 cursor-grab select-none whitespace-nowrap overflow-x-auto text-soft scroll-smooth"
          title={content}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
