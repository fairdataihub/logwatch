interface LogEvent {
  id: number;
  level: string;
  type: string;
  message: string;
  raw: string;
  thread: number;
  created: Date;
}
