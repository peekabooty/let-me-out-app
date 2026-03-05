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

  /**
   * Finds a single observation by its ID.
   *
   * @param id - The ID of the observation
   * @returns The observation or null if not found
   */
  findById(id: string): Promise<Observation | null>;
}

export const OBSERVATION_REPOSITORY_PORT = Symbol('ObservationRepositoryPort');
