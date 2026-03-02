export interface ObservationProps {
  id: string;
  absenceId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

/**
 * Observation domain entity.
 *
 * Represents a comment or note added to an absence by an involved user.
 * Implements RF-35 (observation section on absences).
 */
export class Observation {
  readonly id: string;
  readonly absenceId: string;
  readonly userId: string;
  readonly content: string;
  readonly createdAt: Date;

  constructor(props: ObservationProps) {
    this.id = props.id;
    this.absenceId = props.absenceId;
    this.userId = props.userId;
    this.content = props.content;
    this.createdAt = props.createdAt;
  }
}
