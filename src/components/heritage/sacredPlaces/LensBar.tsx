import { memo } from "react";
import { TrendingUp } from "lucide-react";

type LensType = "Hindu" | "Christian" | "Muslim" | "Multiple" | "Prefer not to say";

interface LensBarProps {
  activeLens: LensType;
  onChange: (lens: LensType) => void;
  progress?: number; // 0–100
}

const OPTIONS: LensType[] = [
  "Hindu",
  "Christian",
  "Muslim",
  "Multiple",
  "Prefer not to say",
];

export const LensBar = memo(function LensBar({
  activeLens,
  onChange,
  progress = 0,
}: LensBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      
      {/* Left: Lens filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10.5px] tracking-[0.28em] uppercase text-[#8B6F3A] font-semibold">
          Lens
        </span>

        {OPTIONS.map((opt) => {
          const isActive = activeLens === opt;

          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`
                px-3.5 py-1.5 rounded-full text-[12.5px] font-medium
                border transition-all duration-200
                ${
                  isActive
                    ? "bg-[#3D2E1F] text-[#F6F2EA] border-[#3D2E1F]"
                    : "bg-transparent text-[#E8DFC9] border-[#3A342C] hover:bg-[#2A241C]"
                }
              `}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Right: Progress */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3A342C] bg-[#1E1E1E]">
        <TrendingUp className="w-3.5 h-3.5 text-[#C2A46D]" />

        <span className="text-[12px] text-[#C9BDA8]">
          Your story is
        </span>

        <div className="w-24 h-1.5 bg-[#3A342C] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C2A46D] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-[12px] font-medium text-[#F5F1E8]">
          {progress}%
        </span>
      </div>
    </div>
  );
});