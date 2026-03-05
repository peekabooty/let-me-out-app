/**
 * Query to list all absences for the authenticated user.
 */
export class ListUserAbsencesQuery {
  constructor(public readonly userId: string) {}
}
