export type UserRole = 'user' | 'admin' | 'super_admin'
export type HeroEra = 'ancient' | 'medieval' | 'modern' | 'contemporary'
export type HeroCategory = 'military' | 'political' | 'cultural' | 'scientific' | 'other'
export type EventType = 'birth' | 'battle' | 'achievement' | 'death' | 'other'
export type ChallengeType = 'checkin' | 'cipher' | 'race' | 'quiz'
export type ChallengeStatus = 'active' | 'upcoming' | 'ended'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type BadgeSource = 'challenge' | 'system' | 'manual'
export type NotificationType = 'badge' | 'challenge' | 'hero' | 'community' | 'location' | 'system'
export type MediaType = 'image' | 'video'
export type ExplorationHistoryType = 'street' | 'hero'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  points: number
  level: number
  exploration_streak: number
  fcm_token: string | null
  google_id: string | null
  created_at: string
  updated_at: string
}

export interface Hero {
  id: string
  full_name: string
  alias_name: string | null
  birth_year: number | null
  death_year: number | null
  era: HeroEra | null
  category: HeroCategory | null
  bio: string | null
  image_url: string | null
  province: string | null
  created_at: string
  updated_at: string
}

export interface HeroEvent {
  id: string
  hero_id: string
  type: EventType
  year: number | null
  title: string
  description: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export interface Street {
  id: string
  name: string
  hero_id: string | null
  lat: number | null
  lng: number | null
  province: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  title: string
  description: string | null
  type: ChallengeType
  hero_id: string | null
  street_id: string | null
  target_lat: number | null
  target_lng: number | null
  radius_meters: number | null
  start_at: string | null
  end_at: string | null
  reward_points: number
  badge_id: string | null
  participant_count: number
  created_at: string
  updated_at: string
}

export interface ChallengeSubmission {
  id: string
  challenge_id: string
  user_id: string
  status: SubmissionStatus
  lat: number | null
  lng: number | null
  distance_meters: number | null
  photo_url: string | null
  submitted_at: string
  reviewed_at: string | null
}

export interface Post {
  id: string
  user_id: string
  content: string
  hero_id: string | null
  street_id: string | null
  lat: number | null
  lng: number | null
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
}

export interface PostMedia {
  id: string
  post_id: string
  url: string
  type: MediaType
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  like_count: number
  created_at: string
  updated_at: string
}

export interface Badge {
  id: string
  name: string
  description: string | null
  image_url: string | null
  rarity: BadgeRarity
  code: string
  created_at: string
  updated_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  source: BadgeSource
  earned_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  is_read: boolean
  related_id: string | null
  created_at: string
}

export interface ExplorationHistory {
  id: string
  user_id: string
  type: ExplorationHistoryType
  target_id: string
  visited_at: string
}

// Joined types for display
export interface SubmissionWithUser extends ChallengeSubmission {
  users: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'email'>
}

export interface PostWithUser extends Post {
  users: Pick<User, 'id' | 'full_name' | 'avatar_url'>
  post_media: PostMedia[]
}

export interface CommentWithUser extends Comment {
  users: Pick<User, 'id' | 'full_name' | 'avatar_url'>
}

export interface StreetWithHero extends Street {
  heroes: Pick<Hero, 'id' | 'full_name'> | null
}

export interface ChallengeWithRelations extends Challenge {
  heroes: Pick<Hero, 'id' | 'full_name'> | null
  badges: Pick<Badge, 'id' | 'name' | 'rarity'> | null
}

// Supabase Database type stub (for createClient generic)
export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      heroes: { Row: Hero; Insert: Partial<Hero>; Update: Partial<Hero> }
      hero_events: { Row: HeroEvent; Insert: Partial<HeroEvent>; Update: Partial<HeroEvent> }
      streets: { Row: Street; Insert: Partial<Street>; Update: Partial<Street> }
      challenges: { Row: Challenge; Insert: Partial<Challenge>; Update: Partial<Challenge> }
      challenge_submissions: { Row: ChallengeSubmission; Insert: Partial<ChallengeSubmission>; Update: Partial<ChallengeSubmission> }
      posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post> }
      post_media: { Row: PostMedia; Insert: Partial<PostMedia>; Update: Partial<PostMedia> }
      comments: { Row: Comment; Insert: Partial<Comment>; Update: Partial<Comment> }
      badges: { Row: Badge; Insert: Partial<Badge>; Update: Partial<Badge> }
      user_badges: { Row: UserBadge; Insert: Partial<UserBadge>; Update: Partial<UserBadge> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      exploration_history: { Row: ExplorationHistory; Insert: Partial<ExplorationHistory>; Update: Partial<ExplorationHistory> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
