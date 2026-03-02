import type { Observation } from '../observation.entity';

export interface ObservationRepositoryPort {
  /**
   * Saves a new observation to the database.
   *
   * @param observation - The observation entity to save
   */
  save(observation: Observation): Promise<void>;

  /**
   * Finds all observations for a specific absence, ordered by creation date.
   *
   * @param absenceId - The ID of the absence
   * @returns Array of observations ordered by createdAt ascending
   */
  findByAbsenceId(absenceId: string): Promise<Observation[]>;
}

export const OBSERVATION_REPOSITORY_PORT = Symbol('ObservationRepositoryPort');
