import type {
  ClassSummary,
  ModuleChallenge,
} from "../lib/dashboard";
import type { Course, PaceStatus } from "../types";

interface ClassOverviewProps {
  course: Course;
  summary: ClassSummary;
  moduleChallenge: ModuleChallenge;
}

export default function ClassOverview({
  course,
  summary,
  moduleChallenge,
}: ClassOverviewProps) {
  const challengingModule = moduleChallenge.module;

  return (
    <section className="panel overview-panel" aria-labelledby="overview-title">
      <div className="overview-heading">
        <h2 id="overview-title">Class overview</h2>
      </div>

      <div className="overview-metrics">
        <OverviewMetric
          label="Average lessons completed"
          value={`${summary.averageLessons} of ${course.lessonsTotal}`}
          detail={`Expected: ${course.paceExpectation.lessonsCompleted}`}
        />
        <OverviewMetric
          label="Due assignments"
          value={`${summary.dueWorkReceived} of ${summary.dueWorkTotal}`}
          detail={`${summary.missingDueSubmissionCount} missing, ${summary.returnedDueSubmissionCount} returned for revision`}
        />
        <WatchListMetric
          attentionCount={summary.attentionCount}
          highAttentionCount={summary.highAttentionCount}
        />
      </div>

      <div className="overview-bottom">
        <div className="overview-pace">
          <strong className="overview-pace-title">Student pace</strong>
          <div className="pace-overview-group" aria-label="Student pace">
            <div className="pace-overview-column">
              <PaceOverviewItem
                count={summary.paceCounts.ahead}
                label="Above pace"
                status="ahead"
              />
              <PaceOverviewItem
                count={summary.paceCounts["on-pace"]}
                label="At pace"
                status="on-pace"
              />
            </div>
            <div className="pace-overview-column">
              <PaceOverviewItem
                count={summary.paceCounts.below}
                label="Below pace"
                status="below"
              />
              <PaceOverviewItem
                count={summary.paceCounts.missing}
                label="No data"
                status="missing"
              />
            </div>
          </div>
        </div>

        <div className="overview-challenge">
          <OverviewMetric
            compactValue={moduleChallenge.status !== "found"}
            label="Most challenging module"
            value={
              challengingModule?.title ??
              (moduleChallenge.status === "none"
                ? "No clear challenging module"
                : "Not enough data")
            }
            detail={
              challengingModule && challengingModule.quizAverage !== null
                ? `Latest quiz average ${Math.round(challengingModule.quizAverage)}%, ${challengingModule.helpRequestCount} help requests (from ${challengingModule.studentsRequestingHelp} students)`
                : moduleChallenge.status === "none"
                  ? "No module meets the criteria"
                  : "More quiz, help or due-work data is needed"
            }
          />
        </div>
      </div>
    </section>
  );
}

function OverviewMetric({
  compactValue = false,
  label,
  value,
  detail,
}: {
  compactValue?: boolean;
  label: string;
  value: string;
  detail: string;
}) {
  const classNames = [
    "overview-metric",
    compactValue ? "compact-value" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function WatchListMetric({
  attentionCount,
  highAttentionCount,
}: {
  attentionCount: number;
  highAttentionCount: number;
}) {
  return (
    <div className="overview-metric watch-list-metric">
      <span>Student watch list</span>
      <div className="watch-list-counts">
        <div className="watch-list-count watch-list-high">
          <strong>{highAttentionCount}</strong>
          <span>High priority</span>
        </div>
        <div className="watch-list-count watch-list-attention">
          <strong>{attentionCount}</strong>
          <span>Needs attention</span>
        </div>
      </div>
    </div>
  );
}

function PaceOverviewItem({
  count,
  label,
  status,
}: {
  count: number;
  label: string;
  status: PaceStatus;
}) {
  return (
    <div className="pace-overview-item">
      <span className={`pace-dot pace-dot-${status}`} aria-hidden="true" />
      <strong>{count}</strong>
      <span>{label}</span>
    </div>
  );
}
