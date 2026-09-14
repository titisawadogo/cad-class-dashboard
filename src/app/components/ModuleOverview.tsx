import {
  getModuleChallengeSignals,
} from "../lib/dashboard";
import type {
  ModuleChallenge,
  ModuleInsight,
} from "../lib/dashboard";

interface ModuleOverviewProps {
  modules: ModuleInsight[];
  moduleChallenge: ModuleChallenge;
  totalStudents: number;
}

export default function ModuleOverview({
  modules,
  moduleChallenge,
  totalStudents,
}: ModuleOverviewProps) {
  return (
    <section className="panel module-panel" aria-labelledby="module-title">
      <div className="section-heading module-heading">
        <h2 id="module-title">Module overview</h2>
      </div>

      <div className="module-signal-wrap">
        <div className="module-signal-table">
          <div className="module-signal-header">
            <span>Module</span>
            <span>Students in module</span>
            <span>Help requests</span>
            <span>Latest quiz average</span>
            <span>Due assignments</span>
          </div>

          {modules.map((module, index) => {
            const signals = getModuleChallengeSignals(
              module,
              totalStudents,
              moduleChallenge.classQuizAverage,
            );
            const isMostChallenging =
              module.moduleId === moduleChallenge.module?.moduleId;

            return (
              <div
                className={
                  isMostChallenging
                    ? "module-signal-row module-signal-row-challenging"
                    : "module-signal-row"
                }
                key={module.moduleId}
              >
                <span className="module-title-cell">
                  <span className="module-number">{index + 1}</span>
                  <strong>{module.title}</strong>
                  {isMostChallenging && (
                    <span className="module-challenge-badge">
                      Most challenging
                    </span>
                  )}
                </span>
                <span className="module-stat">
                  <strong>{module.studentsInModule}</strong>
                </span>
                <span
                  className={
                    signals.highHelpShare ? "module-stat signal" : "module-stat"
                  }
                >
                  <strong>{module.helpRequestCount}</strong>
                  <small>
                    from {module.studentsRequestingHelp}{" "}
                    {module.studentsRequestingHelp === 1 ? "student" : "students"}
                  </small>
                </span>
                <span
                  className={
                    signals.lowQuizAverage ? "module-stat signal" : "module-stat"
                  }
                >
                  <strong>
                    {module.quizAverage === null
                      ? "No quiz data"
                      : `${Math.round(module.quizAverage)}%`}
                  </strong>
                  <small>
                    {module.quizAverage === null
                      ? "Not available"
                      : `${module.quizStudentCount} students`}
                  </small>
                </span>
                <span
                  className={
                    signals.highMissingShare
                      ? "module-stat signal"
                      : "module-stat"
                  }
                >
                  <strong>{module.missingDueAssignments} missing</strong>
                  <small>
                    {module.returnedAssignments > 0
                      ? `${module.returnedAssignments} returned for revision`
                      : "None returned for revision"}
                  </small>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!moduleChallenge.module && (
        <p className="module-footnote">
          <strong>
            {moduleChallenge.status === "none"
              ? "No clear challenging module"
              : "Not enough data"}
          </strong>
        </p>
      )}
    </section>
  );
}
