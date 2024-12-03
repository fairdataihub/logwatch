interface Application {
  id: string;
  name: string;
  description: string;
  channels: Channel[];
}

interface Applications extends Array<Application> {}
