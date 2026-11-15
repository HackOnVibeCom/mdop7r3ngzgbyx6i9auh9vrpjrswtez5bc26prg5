import { isSupabaseConfigured } from '../lib/supabase'
import useOnline from '../hooks/useOnline'

/** Thin warning strips that sit under the header. */
export default function Banners() {
  const online = useOnline()

  return (
    <div className="sticky top-0 z-50">
      {!online && (
        <p role="status" className="border-b-2 border-ink bg-chili px-4 py-1.5 text-center text-micro font-bold text-paper">
          You are offline — cached content may be displayed.
        </p>
      )}
      {!isSupabaseConfigured && (
        <p className="border-b-2 border-ink bg-haldi px-4 py-1.5 text-center text-micro font-bold text-ink">
          Configuration notice: Supabase keys not detected (.env file required).
        </p>
      )}
    </div>
  )
}
