import { cn } from "@/lib/utils"

// components/StatusBadge.tsx
export function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        scheduled: 'bg-surface-100 text-surface-600',
        in_progress: 'bg-amber-100 text-amber-700',
        completed: 'bg-green-100 text-green-700',
        skipped: 'bg-red-100 text-red-600',
        pending: 'bg-surface-100 text-surface-500',
        checked_in: 'bg-blue-100 text-blue-700',
    }
    const labels: Record<string, string> = {
        scheduled: 'Terjadwal',
        in_progress: 'Sedang Berjalan',
        completed: 'Selesai',
        skipped: 'Dilewati',
        pending: 'Menunggu',
        checked_in: 'Sudah Check-in',
    }
    return (
        <span className={cn('badge whitespace-nowrap', map[status] || 'bg-surface-100 text-surface-500')}>
            {labels[status] || status}
        </span>
    )
}