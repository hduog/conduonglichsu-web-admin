import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { UsersPage } from '@/pages/UsersPage'
import { HeroesPage } from '@/pages/HeroesPage'
import { HeroEventsPage } from '@/pages/HeroEventsPage'
import { StreetsPage } from '@/pages/StreetsPage'
import { ChallengesPage } from '@/pages/ChallengesPage'
import { SubmissionsPage } from '@/pages/SubmissionsPage'
import { PostsPage } from '@/pages/PostsPage'
import { BadgesPage } from '@/pages/BadgesPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { QuestionsPage } from '@/pages/QuestionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/heroes" element={<HeroesPage />} />
              <Route path="/heroes/:id/events" element={<HeroEventsPage />} />
              <Route path="/streets" element={<StreetsPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/challenges/:id/submissions" element={<SubmissionsPage />} />
              <Route path="/posts" element={<PostsPage />} />
              <Route path="/badges" element={<BadgesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/questions" element={<QuestionsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
