export interface TeamProps {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Team {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: TeamProps) {
    this.id = props.id;
    this.name = props.name;
    this.color = props.color;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
