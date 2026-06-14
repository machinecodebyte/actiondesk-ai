export type CurrentUser = {
  id: string;
  displayName: string;
} | null;

export function useCurrentUser(): CurrentUser {
  return null;
}
