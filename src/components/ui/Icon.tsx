import {
  ArrowClockwise,
  ArrowRight,
  ArrowSquareOut,
  Bell,
  Brain,
  Boat,
  Calculator,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  CheckCircle,
  CurrencyDollarSimple,
  DownloadSimple,
  BatteryCharging,
  Cpu,
  FloppyDisk,
  FileText,
  Flag,
  FunnelSimple,
  GearSix,
  Gavel,
  Globe,
  Headset,
  House,
  ImageSquare,
  Info,
  Lightning,
  List,
  LinkSimple,
  LockSimple,
  Package,
  PiggyBank,
  Plant,
  Receipt,
  Robot,
  SealCheck,
  ShieldCheck,
  SlidersHorizontal,
  SquaresFour,
  Sparkle,
  Stack,
  Sun,
  Tag,
  TrendUp,
  TShirt,
  UploadSimple,
  UserCircle,
  Warning,
  WarningCircle,
  WifiHigh,
  WifiSlash,
  FolderOpen,
  ChartLineUp,
  FilePdf,
  MagnifyingGlass,
  ArrowsLeftRight,
  Plus,
  X,
} from "@phosphor-icons/react/ssr";

import { cn } from "./cn";

export type IconName = string;

type PhosphorWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
const MAP: Record<string, React.ComponentType<{ size?: number; weight?: PhosphorWeight; className?: string }>> =
  {
    arrow_forward: ArrowRight,
    bolt: Lightning,
    dashboard: House,
    calculate: Calculator,
    trending_up: TrendUp,
    tune: SlidersHorizontal,
    settings: GearSix,
    support_agent: Headset,
    smart_toy: Robot,
    menu: List,
    receipt_long: Receipt,
    download: DownloadSimple,
    close: X,
    chevron_right: CaretRight,
    expand_more: CaretDown,
    request_quote: Receipt,
    open_in_new: ArrowSquareOut,
    auto_awesome: Sparkle,
    info: Info,
    wifi: WifiHigh,
    directions_boat: Boat,
    layers: Stack,
    chat_bubble: ChatCircleText,
    person_check: UserCircle,
    verified_user: ShieldCheck,
    verified: SealCheck,
    lock: LockSimple,
    person: UserCircle,

    // Used as props across pages/components
    apps: SquaresFour,
    category: SquaresFour,
    filter_alt: FunnelSimple,
    update: ArrowClockwise,
    refresh: ArrowClockwise,
    priority_high: WarningCircle,
    signal_cellular_alt: TrendUp,
    paid: CurrencyDollarSimple,
    schedule: CalendarBlank,
    gavel: Gavel,
    radar: ChartLineUp,
    sell: Package,
    savings: PiggyBank,
    description: FileText,
    upload_file: UploadSimple,
    sailing: Boat,
    task_alt: CheckCircle,
    check_circle: CheckCircle,
    folder_open: FolderOpen,
    public: Globe,
    summarize: FileText,
    flag: Flag,
    warning: Warning,
    inventory_2: Package,
    psychology: Brain,
    speed: TrendUp,
    sensors: ChartLineUp,
    calendar_today: CalendarBlank,
    picture_as_pdf: FilePdf,
    solar_power: Sun,
    battery_charging_full: BatteryCharging,
    memory: Cpu,
    checkroom: TShirt,
    agriculture: Plant,

    // Additional aliases used by the "system" UI (non-chat)
    save: FloppyDisk,
    image: ImageSquare,
    tag: Tag,
    link: LinkSimple,
    wifi_off: WifiSlash,
    precision_manufacturing: Cpu,
    help: Info,
    search: MagnifyingGlass,
    compare_arrows: ArrowsLeftRight,
    filter_list: FunnelSimple,

    // Aliases para reemplazar spans material-symbols (la fuente no estaba cargada
    // y se veían como texto literal: "add", "settings"…). Mapeados a Phosphor.
    add: Plus,
    shield_person: ShieldCheck,
    security: ShieldCheck,
    bar_chart_4_bars: ChartLineUp,
    add_chart: ChartLineUp,
    list_alt: FileText,
    history: ArrowClockwise,
    chevron_left: CaretLeft,
    notifications: Bell,
  };

export function Icon({
  name,
  className,
  size = 18,
  weight = "regular",
}: {
  name: IconName;
  className?: string;
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
}) {
  const Cmp = MAP[String(name)] ?? QuestionMarkFallback;
  return <Cmp size={size} weight={weight} className={cn("shrink-0", className)} />;
}

function QuestionMarkFallback({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/70",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.65)) }}
      aria-hidden="true"
    >
      ?
    </span>
  );
}

