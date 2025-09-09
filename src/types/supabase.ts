export interface Download {
  id: string;
  user_id: string;
  file_id: string;
  downloaded_at: string;
  created_at: string;
}

export interface EventAttendance {
  id: string;
  user_id: string;
  event_id: string;
  attended_at: string;
  created_at: string;
}