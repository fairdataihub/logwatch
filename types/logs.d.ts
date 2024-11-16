interface LogEvent {
  id: number;
  level: string;
  type: string;
  message: string;
  created: Date;
}
