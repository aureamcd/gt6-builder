import React from 'react';

interface QuestLinkLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'dark' | 'light';
    showText?: boolean;
    subtitle?: string;
    className?: string;
}

export function QuestLinkLogo({
    size = 'md',
    variant = 'dark',
    showText = true,
    subtitle,
    className = '',
}: QuestLinkLogoProps) {
    const dimensions = {
        sm: { box: 28, text: 'text-base', sub: 'text-[10px]' },
        md: { box: 36, text: 'text-xl', sub: 'text-[11px]' },
        lg: { box: 46, text: 'text-2xl', sub: 'text-xs' },
        xl: { box: 56, text: 'text-3xl', sub: 'text-xs' },
    }[size];

    const isLight = variant === 'light';

    return (
        <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
            {/* Conceito B: Dois cards de questionário interligados com elo central + Check */}
            <div
                className="relative flex items-center justify-center shrink-0 rounded-xl shadow-md shadow-indigo-500/20 overflow-hidden"
                style={{ width: dimensions.box, height: dimensions.box }}
            >
                <svg
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                >
                    <defs>
                        <linearGradient id="questlink-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#4F46E5" />
                            <stop offset="55%" stopColor="#6366F1" />
                            <stop offset="100%" stopColor="#7C3AED" />
                        </linearGradient>
                        <linearGradient id="questlink-card-back" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
                            <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.18" />
                        </linearGradient>
                    </defs>

                    {/* Background Squircle */}
                    <rect width="48" height="48" rx="12" fill="url(#questlink-bg)" />

                    {/* Card Traseiro (Bloco de Questionário 1) */}
                    <rect
                        x="7"
                        y="7"
                        width="21"
                        height="21"
                        rx="5.5"
                        fill="url(#questlink-card-back)"
                        stroke="white"
                        strokeOpacity="0.45"
                        strokeWidth="1.5"
                    />
                    {/* Linhas de formulário sutis no card traseiro */}
                    <line x1="11.5" y1="13" x2="21" y2="13" stroke="white" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
                    <line x1="11.5" y1="17.5" x2="17.5" y2="17.5" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />

                    {/* Elo de Conexão (Link) unindo os dois cards */}
                    <path
                        d="M16 25.5C14.2 27.3 14.2 30.2 16 32C17.8 33.8 20.7 33.8 22.5 32L25.5 29"
                        stroke="#C7D2FE"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                    />

                    {/* Card Frontal Principal (Bloco de Questionário 2 + Check) */}
                    <rect
                        x="18"
                        y="18"
                        width="23"
                        height="23"
                        rx="6.5"
                        fill="white"
                    />

                    {/* Checkmark de Diagnóstico/Validação dentro do Card Frontal */}
                    <path
                        d="M24.2 29.8L27.9 33.5L35.2 25.8"
                        stroke="#4F46E5"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {showText && (
                <div className="flex flex-col justify-center leading-none">
                    <div className={`font-extrabold tracking-tight flex items-center ${dimensions.text}`}>
                        <span className={isLight ? 'text-white' : 'text-slate-900'}>Quest</span>
                        <span className={isLight ? 'text-indigo-200' : 'bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent'}>
                            Link
                        </span>
                    </div>
                    {subtitle && (
                        <span
                            className={`font-semibold tracking-wider uppercase mt-0.5 ${dimensions.sub} ${
                                isLight ? 'text-indigo-100/80' : 'text-slate-400'
                            }`}
                        >
                            {subtitle}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
