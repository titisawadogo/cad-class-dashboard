import { getAssignmentStatusLabel } from "../lib/dashboard";
import type { StudentInsight } from "../lib/dashboard";
import type { Course } from "../types";
import {
  getInitials,
  PaceBadge,
  StudentStatusBadge,
} from "./StudentOverview";

interface StudentDetailProps {
  course: Course;
  student: StudentInsight;
}

export default function StudentDetail({
  course,
  student,
}: StudentDetailProps) {
  const lessonsCompleted = student.student.progress.lessonsCompleted;
  const dueAssignments = student.assignments.filter(
    (assignment) => assignment.isDue,
  );
  const attemptedQuizzes = student.quizzes.filter(
    (quiz) => quiz.latestScore !== undefined,
  );
  const assignmentAverage = average(
    dueAssignments.flatMap((assignment) =>
      assignment.score === undefined ? [] : [assignment.score],
    ),
  );
  const quizAverage = average(
    attemptedQuizzes.flatMap((quiz) =>
      quiz.latestScore === undefined ? [] : [quiz.latestScore],
    ),
  );
  const summaryTitle = student.isDoingWell
    ? "Doing well"
    : student.attentionLevel === "high"
      ? "High priority"
      : student.attentionLevel === "check"
        ? "Needs attention"
        : student.attentionLevel === "unknown"
          ? "Data availability"
          : "Current summary";

  return (
    <aside className="panel student-detail" aria-label="Selected student details">
      <div className="detail-header">
        <span className="avatar large">{getInitials(student.student.name)}</span>
        <div>
          <h2>{student.student.name ?? "Unnamed student"}</h2>
          <span>{activityLabel(student)}</span>
        </div>
        <div className="detail-badges">
          <PaceBadge status={student.paceStatus} />
          <StudentStatusBadge student={student} />
        </div>
      </div>

      <section
        className={`detail-section reason-section reason-${student.isDoingWell ? "doing-well" : student.attentionLevel}`}
      >
        <h3>{summaryTitle}</h3>
        <ul>
          {student.reasons.slice(0, 4).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h3>Progress</h3>
        <dl className="detail-list">
          <div>
            <dt>Lessons completed</dt>
            <dd>
              {typeof lessonsCompleted === "number"
                ? `${lessonsCompleted} of ${course.lessonsTotal}`
                : "Not available"}
            </dd>
          </div>
          <div>
            <dt>Expected</dt>
            <dd>{course.paceExpectation.lessonsCompleted} lessons</dd>
          </div>
          <div>
            <dt>Current module</dt>
            <dd>{student.student.progress.currentModule ?? "Not available"}</dd>
          </div>
          <div>
            <dt>Current lesson</dt>
            <dd>{student.student.progress.currentLesson ?? "Not available"}</dd>
          </div>
          <div>
            <dt>Last lesson completed</dt>
            <dd>{formatDate(student.student.progress.currentLessonSince)}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-section">
        <div className="detail-section-heading">
          <h3>Past-due assignments</h3>
          <span>({averageLabel(assignmentAverage)})</span>
        </div>
        <div className="detail-records">
          {dueAssignments.map((assignment) => (
            <div className="detail-record" key={assignment.id}>
              <span
                className={`record-dot record-${assignment.status}`}
                aria-hidden="true"
              />
              <div>
                <strong>{assignment.title}</strong>
                <small>
                  <span>{getAssignmentStatusLabel(assignment.status)}</span>
                  {assignment.score !== undefined && (
                    <>
                      <span className="record-score-arrow" aria-hidden="true">
                        &rarr;
                      </span>
                      <span>{assignment.score}%</span>
                    </>
                  )}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-section detail-split">
        <div>
          <div className="detail-section-heading">
            <h3>Quiz results</h3>
            <span>({averageLabel(quizAverage)})</span>
          </div>
          {attemptedQuizzes.length ? (
            <div className="quiz-list">
              {attemptedQuizzes.map((quiz) => (
                <div key={quiz.id}>
                  <span>{quiz.id.toUpperCase()}</span>
                  <strong>{quiz.latestScore}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-detail">No quiz attempts</p>
          )}
        </div>
        <div>
          <h3>Help requests</h3>
          <strong className="help-count">
            {student.helpRequestCount === null
              ? "No data"
              : student.helpRequestCount}
          </strong>
          {student.recentHelpRequestCount !== null &&
            student.recentHelpRequestCount > 0 && (
              <span className="help-label">
                {student.recentHelpRequestCount} in the last 7 days
              </span>
            )}
        </div>
      </section>

      {student.student.telemetryAvailability !== "available" && (
        <p className="telemetry-note">
          CAD telemetry is unavailable. This is missing information, not evidence
          of inactivity.
        </p>
      )}
    </aside>
  );
}

function formatDate(date?: string) {
  if (!date) return "Not reported";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function activityLabel(student: StudentInsight) {
  if (student.daysSinceActive === null) return "Not reported by CAD";
  if (student.daysSinceActive === 0) return "Active today";
  if (student.daysSinceActive === 1) return "Active 1 day ago";
  return `Active ${student.daysSinceActive} days ago`;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageLabel(value: number | null) {
  return value === null ? "Avg. --%" : `Avg. ${Math.round(value)}%`;
}
