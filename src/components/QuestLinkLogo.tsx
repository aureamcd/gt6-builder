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
        sm: { iconWidth: 30, iconHeight: 34, text: 'text-lg', sub: 'text-[10px]', gap: 'gap-2' },
        md: { iconWidth: 38, iconHeight: 42, text: 'text-2xl', sub: 'text-[11px]', gap: 'gap-2.5' },
        lg: { iconWidth: 46, iconHeight: 52, text: 'text-3xl', sub: 'text-xs', gap: 'gap-3' },
        xl: { iconWidth: 56, iconHeight: 62, text: 'text-4xl', sub: 'text-xs', gap: 'gap-3.5' },
    }[size];

    const isLight = variant === 'light';
    const primaryBlue = '#0084FF';
    const darkStroke = isLight ? '#FFFFFF' : '#0B0F19';

    return (
        <div className={`inline-flex items-center ${dimensions.gap} select-none ${className}`}>
            {/* Ícone Oficial QuestLink: Moldura aberta azul + 2 itens + 1 item com Check */}
            <div
                className="relative flex items-center justify-center shrink-0"
                style={{ width: dimensions.iconWidth, height: dimensions.iconHeight }}
            >
                <svg
                    viewBox="0 0 88 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                >
                    {/* Moldura Externa Azul com abertura lateral direita (estilo elo/documento) */}
                    <path
                        d="M78 26V22C78 13.1634 70.8366 6 62 6H24C15.1634 6 8 13.1634 8 22V78C8 86.8366 15.1634 94 24 94H62C70.8366 94 78 86.8366 78 78V70"
                        stroke={primaryBlue}
                        strokeWidth="8.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Linha 1: Ponto azul + Barra preta */}
                    <circle cx="26" cy="30" r="4.8" fill={primaryBlue} />
                    <line
                        x1="40"
                        y1="30"
                        x2="68"
                        y2="30"
                        stroke={darkStroke}
                        strokeWidth="7.5"
                        strokeLinecap="round"
                    />

                    {/* Linha 2: Ponto azul + Barra preta */}
                    <circle cx="26" cy="48" r="4.8" fill={primaryBlue} />
                    <line
                        x1="40"
                        y1="48"
                        x2="68"
                        y2="48"
                        stroke={darkStroke}
                        strokeWidth="7.5"
                        strokeLinecap="round"
                    />

                    {/* Linha 3: Círculo Azul com Check Branco + Barra Azul */}
                    <circle cx="30" cy="71" r="12" fill={primaryBlue} />
                    <path
                        d="M24.5 71.2L28.5 75.2L36 67.2"
                        stroke="#FFFFFF"
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <line
                        x1="50"
                        y1="71"
                        x2="68"
                        y2="71"
                        stroke={primaryBlue}
                        strokeWidth="7.5"
                        strokeLinecap="round"
                    />
                </svg>
            </div>

            {showText && (
                <div className="flex flex-col justify-center leading-none">
                    <div className={`font-extrabold tracking-tight flex items-center ${dimensions.text}`}>
                        <span className={isLight ? 'text-white' : 'text-[#0B0F19]'}>Quest</span>
                        <span style={{ color: isLight ? '#60A5FA' : primaryBlue }}>Link</span>
                    </div>
                    {subtitle && (
                        <span
                            className={`font-semibold tracking-wider uppercase mt-1 ${dimensions.sub} ${
                                isLight ? 'text-slate-200' : 'text-slate-400'
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
