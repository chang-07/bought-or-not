import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", icon, ...props }, ref) => {
    return (
      <div className="relative group w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-500 group-focus-within:text-yellow-400 transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-black/60 border border-white/10 rounded-2xl py-3.5 ${icon ? 'pl-11' : 'pl-4'} pr-4 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all text-white placeholder:text-gray-600 uppercase ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
