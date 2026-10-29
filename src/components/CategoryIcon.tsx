import { Gamepad2, Monitor, Smartphone, Sofa, Refrigerator, Dumbbell, Sparkles, Baby, PawPrint, Shirt, LayoutGrid } from 'lucide-react';
export const categoryIcons = { games: Gamepad2, informatica: Monitor, celulares: Smartphone, casa: Sofa, eletrodomesticos: Refrigerator, esporte: Dumbbell, beleza: Sparkles, bebes: Baby, pets: PawPrint, moda: Shirt };
export function CategoryIcon({ id, size = 25 }: { id: string; size?: number }) { const Icon = categoryIcons[id as keyof typeof categoryIcons] || LayoutGrid; return <Icon size={size} strokeWidth={1.7} />; }
