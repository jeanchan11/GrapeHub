import React from 'react';
import squadImg from '../../assets/squad.png';

interface IconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

export const Squad: React.FC<IconProps> = ({ size = 24, className, style, color = 'currentColor', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <filter id="thickenSquad">
          <feColorMatrix type="matrix" values="2 0 0 0 0  0 2 0 0 0  0 0 2 0 0  0 0 0 1 0" />
        </filter>
        <mask id="squadMask" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <image href={squadImg} x="-1.5" y="-1.5" width="27" height="27" preserveAspectRatio="xMidYMid meet" filter="url(#thickenSquad)" />
        </mask>
      </defs>
      <rect x="0" y="0" width="24" height="24" fill={color} mask="url(#squadMask)" />
    </svg>
  );
};

export default Squad;
