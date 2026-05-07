import { SVGProps } from "react";

export const FrFlag = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 60 40"
    width={20}
    height={14}
    aria-hidden="true"
    className="rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
    {...props}
  >
    <rect width="20" height="40" fill="#0055A4" />
    <rect x="20" width="20" height="40" fill="#FFFFFF" />
    <rect x="40" width="20" height="40" fill="#EF4135" />
  </svg>
);
