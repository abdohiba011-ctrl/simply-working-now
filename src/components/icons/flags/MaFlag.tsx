import { SVGProps } from "react";

export const MaFlag = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 60 40"
    width={20}
    height={14}
    aria-hidden="true"
    className="rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
    {...props}
  >
    <rect width="60" height="40" fill="#C1272D" />
    <g
      transform="translate(30 20)"
      fill="none"
      stroke="#006233"
      strokeWidth="1.2"
      strokeLinejoin="miter"
    >
      <polygon points="0,-9 2.12,-2.78 8.56,-2.78 3.35,1.06 5.47,7.28 0,3.44 -5.47,7.28 -3.35,1.06 -8.56,-2.78 -2.12,-2.78" />
    </g>
  </svg>
);
