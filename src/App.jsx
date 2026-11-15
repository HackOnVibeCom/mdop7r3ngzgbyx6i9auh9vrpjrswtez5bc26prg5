import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import GrainOverlay from './components/GrainOverlay'
import Banners from './components/Banners'
import { TicketSkeleton } from './components/Skeleton'
import { getDeviceId } from './lib/device'
import Landing from './pages/Landing'

// Route-level code splitting: the vote/plan screen never pulls in the landing hero bundle.
const NewPlan = lazy(() => import('./pages/NewPlan'))
const PlanPage = lazy(() => import('./pages/PlanPage'))
const Share = lazy(() => import('./pages/Share'))
const Stats = lazy(() => import('./pages/Stats'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div className="px-4 pt-8">
      <TicketSkeleton lines={4} />
    </div>
  )
}

/** Scroll to top on every navigation (SPA default is to keep the old offset). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export default function App() {
  const location = useLocation()

  // Make sure every visitor has a device id from the very first paint.
  useEffect(() => {
    getDeviceId()
  }, [])

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-screen-sm bg-paper sm:max-w-screen-md">
      <GrainOverlay />
      <Banners />
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/new" element={<NewPlan />} />
            <Route path="/p/:code" element={<PlanPage />} />
            <Route path="/p/:code/share" element={<Share />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </div>
  )
}
