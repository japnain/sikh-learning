import { IconBookmark, IconBookmarkFilled } from "../../../components/icons"

export default function SaveButton({
  saved,
  onClick,
  label = "Save",
  recentlySaved = false,
}: {
  saved: boolean
  onClick: () => void
  label?: string
  recentlySaved?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-focus min-h-[44px] rounded-full section-shell-quiet px-3 py-2 text-ink dark:text-dark-text touch-manipulation"
      aria-label={saved ? `Remove ${label}` : `Save ${label}`}
    >
      <span className="flex items-center gap-2">
        {saved ? (
          <IconBookmarkFilled size={16} className="text-saffron dark:text-gold-light" />
        ) : (
          <IconBookmark size={16} className="text-ink/65 dark:text-dark-text/65" />
        )}
        <span className="font-sans text-xs font-medium">{saved ? (recentlySaved ? "Saved just now" : "Saved") : "Save"}</span>
      </span>
    </button>
  )
}
