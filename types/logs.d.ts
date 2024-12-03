interface LogEvent {
  id: number;
  level: string;
  type: string;
  message: string;
  thread: number;
  created: Date;
}
