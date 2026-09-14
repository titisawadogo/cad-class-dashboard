export type TelemetryAvailability = "available" | "partial" | "unavailable";

export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "graded"
  | "returned";

export type PaceStatus = "ahead" | "on-pace" | "below" | "missing";

export type AttentionLevel = "high" | "check" | "none" | "unknown";

export interface CourseAssignment {
  id: string;
  title: string;
  moduleId: string;
  dueAt: string;
  pointsPossible: number;
}

export interface CourseQuiz {
  id: string;
  title: string;
  moduleId: string;
}

export interface CourseModule {
  moduleId: string;
  title: string;
  lessons: number;
}

export interface Course {
  code: string;
  title: string;
  section: string;
  instructor: string;
  lmsPlatform: string;
  weeksElapsed: number;
  lessonsTotal: number;
  snapshotAt: string;
  paceExpectation: {
    byCompletedWeek: number;
    lessonsCompleted: number;
    lessonsPerCompletedWeek: number;
  };
  modules: CourseModule[];
  assignments: CourseAssignment[];
  quizzes: CourseQuiz[];
}

export interface StudentSummary {
  id: string;
  name: string | null;
  progress: {
    lessonsCompleted?: number;
    currentModule?: string;
    currentLesson?: string;
    currentLessonSince?: string;
  };
  telemetryAvailability: TelemetryAvailability;
  lastActiveAt?: string;
}

export interface Submission {
  assignmentId: string;
  attempt?: number;
  status: AssignmentStatus;
  submittedAt?: string;
  score?: number;
  feedback?: string;
  lastSavedAt?: string;
  similarity?: number;
}

export interface StudentDetail {
  activity: {
    sessionsByWeek?: number[];
    minutesByWeek?: number[];
    availability?: "unavailable";
  };
  helpRequests: Array<{ raisedAt: string; lessonId: string }> | null;
  quizAttempts: Record<string, number[]>;
  submissions: Submission[];
}

export interface DashboardData {
  course: Course;
  studentSummaries: StudentSummary[];
  studentDetails: Record<string, StudentDetail>;
}
