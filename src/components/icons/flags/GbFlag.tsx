import { SVGProps } from "react";

export const GbFlag = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 60 30"
    width={20}
    height={14}
    aria-hidden="true"
    className="rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
    {...props}
  >
    <clipPath id="gb-clip">
      <rect width="60" height="30" rx="0" />
    </clipPath>
    <g clipPath="url(#gb-clip)">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        stroke="#C8102E"
        strokeWidth="3"
        clipPath="polygon(0 0, 30 15, 60 0, 60 30, 30 15, 0 30)"
      />
      <path d="M30,0 V30 M0,15 H60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);
