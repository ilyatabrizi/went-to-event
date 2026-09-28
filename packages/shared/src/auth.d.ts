export type CurrentUser = {
  id: string
  email: string | null
}

export type UserProfile = {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

export type ProfileUpdate = Partial<Pick<UserProfile, 'username' | 'displayName' | 'avatarUrl'>>

export type AccountUpdate = {
  email?: string
  password?: string
}

export type CurrentUserResponse = {
  user: CurrentUser
}
