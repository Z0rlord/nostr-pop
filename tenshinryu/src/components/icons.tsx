"use client";

import { tokens } from "@/lib/design-tokens";

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

// Base icon wrapper
function IconBase({ 
  children, 
  size = 24, 
  className = "",
  color = "currentColor"
}: { children: React.ReactNode; size?: number; className?: string; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color }}
    >
      {children}
    </svg>
  );
}

// Katana / Sword icon
export function KatanaIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path
        d="M4 20L20 4M20 4L17 4M20 4L20 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 21L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

// Dojo / Training hall icon
export function DojoIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path
        d="M3 21H21M5 21V10L12 5L19 10V21M9 21V15H15V21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 5V3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

// User / Profile icon
export function UserIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

// Camera / Photo icon
export function CameraIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6L9 4H15L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Calendar / Schedule icon
export function CalendarIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
      <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.3" />
    </IconBase>
  );
}

// Check / Success icon
export function CheckIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path
        d="M5 12L10 17L20 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

// Flame / Streak icon
export function FlameIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path
        d="M12 2C12 2 8 6 8 11C8 13.5 9.5 15.5 12 17C14.5 15.5 16 13.5 16 11C16 6 12 2 12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 17C12 17 9 19 9 21H15C15 19 12 17 12 17Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8C12 8 10 10 10 12C10 13 11 14 12 14.5C13 14 14 13 14 12C14 10 12 8 12 8Z"
        fill="currentColor"
        opacity="0.5"
      />
    </IconBase>
  );
}

// Location / Map pin icon
export function LocationIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

// Video / Play icon
export function VideoIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9L15 12L10 15V9Z" fill="currentColor" />
    </IconBase>
  );
}

// Computer / Online training icon
export function ComputerIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 22H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Belt / Rank icon
export function BeltIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="4" y="8" width="16" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8V16M18 8V16" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="12" r="1" fill="currentColor" />
    </IconBase>
  );
}

// QR Code icon
export function QrCodeIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="4" height="4" rx="1" fill="currentColor" />
      <rect x="19" y="14" width="2" height="2" rx="1" fill="currentColor" />
      <rect x="14" y="19" width="2" height="2" rx="1" fill="currentColor" />
    </IconBase>
  );
}

// NFC / Wave icon
export function NfcIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M6 8C6 8 4 10 4 12C4 14 6 16 6 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6C9 6 6 9 6 12C6 15 9 18 9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4C12 4 8 8 8 12C8 16 12 20 12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 6C15 6 18 9 18 12C18 15 15 18 15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 8C18 8 20 10 20 12C20 14 18 16 18 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Bluetooth / Beacon icon
export function BluetoothIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M6.5 6.5L17.5 12L6.5 17.5V6.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Students / Group icon
export function StudentsIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="15" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20C3 17.2386 5.23858 15 8 15H10C12.7614 15 15 17.2386 15 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 20C18 17.7909 16.2091 16 14 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Notification / Bell icon
export function BellIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 3C10.5 3 9 4 9 6C9 7 8 8 7 9C6 10 6 12 6 14V18H18V14C18 12 18 10 17 9C16 8 15 7 15 6C15 4 13.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21C10 21.5 11 22 12 22C13 22 14 21.5 14 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="6" r="3" fill="#ff4444" stroke="none" />
    </IconBase>
  );
}

// Clock / Time icon
export function ClockIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Settings / Gear icon
export function SettingsIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15C19.7 14.2 19.9 13.4 20 12.5V11.5C19.9 10.6 19.7 9.8 19.4 9L21 7.4L18.6 5L17 6.6C16.2 6.3 15.4 6.1 14.5 6H13.5C12.6 6.1 11.8 6.3 11 6.6L9.4 5L7 7.4L8.6 9C8.3 9.8 8.1 10.6 8 11.5V12.5C8.1 13.4 8.3 14.2 8.6 15L7 16.6L9.4 19L11 17.4C11.8 17.7 12.6 17.9 13.5 18H14.5C15.4 17.9 16.2 17.7 17 17.4L18.6 19L21 16.6L19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Logout / Exit icon
export function LogoutIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Mic / Voice icon
export function MicIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 22H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Plus / Add icon
export function PlusIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Edit / Pencil icon
export function EditIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Trash / Delete icon
export function TrashIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// X / Close icon
export function XIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Arrow Right icon
export function ArrowRightIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Chevron Down icon
export function ChevronDownIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Loading / Spinner icon
export function SpinnerIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M12 3C16.9706 3 21 7.02944 21 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Enso / Circle icon (Zen symbol)
export function EnsoIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle 
        cx="12" 
        cy="12" 
        r="9" 
        stroke="currentColor" 
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="40 60"
        transform="rotate(-90 12 12)"
      />
    </IconBase>
  );
}

// Hash / Tag icon
export function HashIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M4 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 15H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 3L8 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3L14 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Upload / Cloud icon
export function UploadIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Crown / Premium icon
export function CrownIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M5 16L3 7L8 10L12 5L16 10L21 7L19 16H5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Film / Movie icon
export function FilmIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M6 4V20" stroke="currentColor" strokeWidth="2" />
      <path d="M18 4V20" stroke="currentColor" strokeWidth="2" />
      <path d="M2 10H6" stroke="currentColor" strokeWidth="2" />
      <path d="M2 14H6" stroke="currentColor" strokeWidth="2" />
      <path d="M18 10H22" stroke="currentColor" strokeWidth="2" />
      <path d="M18 14H22" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

// Microphone / Voice icon
export function MicrophoneIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 22H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Book / Journal icon
export function BookIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M4 19.5C4 18.1193 5.11929 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20V22H6.5C5.11929 22 4 20.8807 4 19.5V4.5C4 3.11929 5.11929 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Target / Goal icon
export function TargetIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

// Play icon
export function PlayIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
    </IconBase>
  );
}

// Pause icon
export function PauseIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="6" y="4" width="4" height="16" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" />
    </IconBase>
  );
}

// Stop icon
export function StopIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="5" y="5" width="14" height="14" fill="currentColor" />
    </IconBase>
  );
}

// Rotate/Refresh icon
export function RotateIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

// Timer/Stopwatch icon
export function TimerIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 1h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

// Globe icon for global heatmap
export function GlobeIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 2c-2.5 3-4 7-4 10s1.5 7 4 10c2.5-3 4-7 4-10s-1.5-7-4-10z" stroke="currentColor" strokeWidth="2" />
    </IconBase>
  );
}

// Sparkles icon for AI insights
export function SparklesIcon({ size = 24, className = "" }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M19 5L20 3L21 5L23 6L21 7L20 9L19 7L17 6L19 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </IconBase>
  );
}
