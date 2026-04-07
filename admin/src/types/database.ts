export type UserRole = 'user' | 'admin' | 'super_admin'
export type HeroEra = 'hung_vuong' | 'bac_thuoc' | 'ly_tran' | 'le' | 'nguyen' | 'can_dai'
export type HeroCategory = 'military' | 'culture' | 'science' | 'politics'
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
  name: string
  avatar_url: string | null
  bio: string | null
  role: UserRole
  points: number
  level: number
  streak: number
  streets_explored: number
  is_active: boolean
  last_active_at: string | null
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
  province: string
  era: HeroEra
  category: HeroCategory
  bio_short: string
  bio_full: string | null
  avatar_url: string | null
  quote: string | null
  created_at: string
  updated_at: string
}

export interface HeroEvent {
  id: string
  hero_id: string
  event_type: EventType
  year: number
  title: string
  description: string
  image_url: string | null
  created_at: string
}

export interface Street {
  id: string
  name: string
  city: string
  province: string
  hero_id: string
  lat: number | null
  lng: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  title: string
  description: string
  type: ChallengeType
  target_lat: number | null
  target_lng: number | null
  target_radius: number | null
  reward_points: number
  reward_badge_id: string | null
  hero_id: string | null
  image_url: string | null
  start_at: string
  end_at: string
  status: ChallengeStatus
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
  code: string
  name: string
  description: string
  icon_url: string
  rarity: BadgeRarity
  created_at: string
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
  users: Pick<User, 'id' | 'name' | 'avatar_url' | 'email'>
}

export interface PostWithUser extends Post {
  users: Pick<User, 'id' | 'name' | 'avatar_url'>
  post_media: PostMedia[]
}

export interface CommentWithUser extends Comment {
  users: Pick<User, 'id' | 'name' | 'avatar_url'>
}

export interface StreetWithHero extends Street {
  heroes: Pick<Hero, 'id' | 'full_name'> | null
}

export interface ChallengeWithRelations extends Challenge {
  heroes: Pick<Hero, 'id' | 'full_name'> | null
  badges: Pick<Badge, 'id' | 'name' | 'rarity'> | null
}

// Supabase Database type stub (for createClient generic)
export type Tables = {
  users: User
  heroes: Hero
  hero_events: HeroEvent
  streets: Street
  challenges: Challenge
  challenge_submissions: ChallengeSubmission
  posts: Post
  post_media: PostMedia
  comments: Comment
  badges: Badge
  user_badges: UserBadge
  notifications: Notification
  exploration_history: ExplorationHistory
}
