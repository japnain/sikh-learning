import { IconArrowLeft } from "../../components/icons"

export default function LearnBackButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans text-saffron dark:text-gold-light text-sm min-h-[44px] min-w-[44px] flex items-center gap-1 active:scale-95 transition-transform duration-150 touch-manipulation"
    >
      <IconArrowLeft size={18} />
      {label}
    </button>
  )
}
