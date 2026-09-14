import type {
  AssignmentStatus,
  AttentionLevel,
  Course,
  DashboardData,
  PaceStatus,
  StudentDetail,
  StudentSummary,
  Submission,
} from "../types";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const INACTIVE_DAYS = 14;
const RECENT_HELP_DAYS = 7;
const REPEATED_HELP_REQUESTS = 3;
const ATTENTION_WEEKS_BEHIND = 2;
const STALLED_DAYS = 20;
const BELOW_CLASS_AVERAGE_BY = 15;
const MIN_QUIZ_PEERS = 2;
const MODULE_QUIZ_GAP = 10;
const MODULE_HELP_SHARE = 0.25;
const MODULE_MISSING_SHARE = 0.2;

const RECEIVED_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "submitted",
  "graded",
  "returned",
];

export interface AssignmentRow {
  id: string;
  title: string;
  status: AssignmentStatus;
  isDue: boolean;
  score?: number;
}

export interface QuizRow {
  id: string;
  title: string;
  latestScore?: number;
  attempts: number;
}

export interface StudentInsight {
  student: StudentSummary;
  detail: StudentDetail;
  paceStatus: PaceStatus;
  paceDifference: number | null;
  attentionLevel: AttentionLevel;
  isDoingWell: boolean;
  academicProblemCount: number;
  warningSignalCount: number;
  reasons: string[];
  daysSinceActive: number | null;
  dueAssignmentsReceived: number;
  dueAssignmentsTotal: number;
  missingDueAssignmentCount: number;
  returnedDueAssignmentCount: number;
  helpRequestCount: number | null;
  recentHelpRequestCount: number | null;
  assignments: AssignmentRow[];
  quizzes: QuizRow[];
}

export interface ClassSummary {
  totalStudents: number;
  studentsWithProgress: number;
  averageLessons: number;
  highAttentionCount: number;
  attentionCount: number;
  doingWellCount: number;
  missingDueSubmissionCount: number;
  studentsMissingDueSubmissions: number;
  returnedDueSubmissionCount: number;
  missingProgressCount: number;
  oneLessonBelowCount: number;
  dueWorkReceived: number;
  dueWorkTotal: number;
  paceCounts: Record<PaceStatus, number>;
}

export interface ModuleInsight {
  moduleId: string;
  title: string;
  studentsInModule: number;
  helpRequestCount: number;
  studentsRequestingHelp: number;
  studentsWithHelpData: number;
  quizAverage: number | null;
  quizStudentCount: number;
  hasDueAssignment: boolean;
  missingDueAssignments: number;
  returnedAssignments: number;
}

export interface ModuleChallengeSignals {
  lowQuizAverage: boolean;
  highHelpShare: boolean;
  highMissingShare: boolean;
  availableSignalCount: number;
  challengeSignalCount: number;
}

export interface ModuleChallenge {
  status: "found" | "none" | "insufficient";
  module: ModuleInsight | null;
  classQuizAverage: number | null;
}

function daysBetween(snapshotAt: string, previousDate?: string) {
  if (!previousDate) return null;

  return Math.max(
    0,
    Math.floor((Date.parse(snapshotAt) - Date.parse(previousDate)) / DAY_IN_MS),
  );
}

function getLatestSubmission(
  detail: StudentDetail,
  assignmentId: string,
): Submission | undefined {
  return detail.submissions
    .filter((submission) => submission.assignmentId === assignmentId)
    .sort((first, second) => (first.attempt ?? 0) - (second.attempt ?? 0))
    .at(-1);
}

function getPaceStatus(
  lessonsCompleted: number | undefined,
  expectedLessons: number,
): PaceStatus {
  if (typeof lessonsCompleted !== "number") return "missing";
  if (lessonsCompleted > expectedLessons) return "ahead";
  if (lessonsCompleted === expectedLessons) return "on-pace";
  return "below";
}

function getAssignmentRows(
  course: Course,
  detail: StudentDetail,
): AssignmentRow[] {
  return course.assignments.map((assignment) => {
    const submission = getLatestSubmission(detail, assignment.id);

    return {
      id: assignment.id,
      title: assignment.title,
      status: submission?.status ?? "not_started",
      isDue: Date.parse(assignment.dueAt) < Date.parse(course.snapshotAt),
      score: submission?.score,
    };
  });
}

function getQuizRows(course: Course, detail: StudentDetail): QuizRow[] {
  return course.quizzes.map((quiz) => {
    const attempts = detail.quizAttempts[quiz.id] ?? [];

    return {
      id: quiz.id,
      title: quiz.title,
      latestScore: attempts.at(-1),
      attempts: attempts.length,
    };
  });
}

function getRecentHelpRequestCount(course: Course, detail: StudentDetail) {
  if (detail.helpRequests === null) return null;

  const recentWindowStart =
    Date.parse(course.snapshotAt) - RECENT_HELP_DAYS * DAY_IN_MS;

  return detail.helpRequests.filter(
    (request) => Date.parse(request.raisedAt) >= recentWindowStart,
  ).length;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function getStudentInsight(
  course: Course,
  student: StudentSummary,
  detail: StudentDetail,
  peerQuizAverages: Record<string, number | null>,
  classAssignmentAverage: number | null,
): StudentInsight {
  const lessonsCompleted = student.progress.lessonsCompleted;
  const expectedLessons = course.paceExpectation.lessonsCompleted;
  const paceStatus = getPaceStatus(lessonsCompleted, expectedLessons);
  const paceDifference =
    typeof lessonsCompleted === "number"
      ? lessonsCompleted - expectedLessons
      : null;
  const daysSinceActive =
    student.telemetryAvailability === "available"
      ? daysBetween(course.snapshotAt, student.lastActiveAt)
      : null;
  const assignments = getAssignmentRows(course, detail);
  const quizzes = getQuizRows(course, detail);
  const dueAssignments = assignments.filter((assignment) => assignment.isDue);
  const missingDueAssignments = dueAssignments.filter(
    (assignment) =>
      assignment.status === "not_started" || assignment.status === "in_progress",
  );
  const returnedDueAssignments = dueAssignments.filter(
    (assignment) => assignment.status === "returned",
  );
  const dueAssignmentsReceived = dueAssignments.filter((assignment) =>
    RECEIVED_ASSIGNMENT_STATUSES.includes(assignment.status),
  ).length;
  const recentHelpRequestCount = getRecentHelpRequestCount(course, detail);
  const attemptedQuizzes = quizzes.filter(
    (quiz) => quiz.latestScore !== undefined,
  );
  const quizAverage = average(
    attemptedQuizzes.flatMap((quiz) =>
      quiz.latestScore === undefined ? [] : [quiz.latestScore],
    ),
  );
  const scoredDueAssignments = dueAssignments.filter(
    (assignment) => assignment.score !== undefined,
  );
  const assignmentAverage = average(
    scoredDueAssignments.flatMap((assignment) =>
      assignment.score === undefined ? [] : [assignment.score],
    ),
  );

  const farBehindBy =
    course.paceExpectation.lessonsPerCompletedWeek * ATTENTION_WEEKS_BEHIND;
  const farBelowExpected =
    paceDifference !== null && paceDifference <= -farBehindBy;
  const noRecentCadActivity =
    daysSinceActive !== null && daysSinceActive >= INACTIVE_DAYS;
  const daysOnCurrentLesson = daysBetween(
    course.snapshotAt,
    student.progress.currentLessonSince,
  );
  const stalledOnCurrentLesson =
    daysOnCurrentLesson !== null && daysOnCurrentLesson >= STALLED_DAYS;
  const repeatedRecentHelp =
    recentHelpRequestCount !== null &&
    recentHelpRequestCount >= REPEATED_HELP_REQUESTS;
  const belowAverageQuizCount = attemptedQuizzes.filter((quiz) => {
    const peerAverage = peerQuizAverages[quiz.id];

    return (
      quiz.latestScore !== undefined &&
      peerAverage !== null &&
      quiz.latestScore <= peerAverage - BELOW_CLASS_AVERAGE_BY
    );
  }).length;
  const lowQuizResults = belowAverageQuizCount >= 2;
  const lowAssignmentAverage =
    scoredDueAssignments.length >= 2 &&
    assignmentAverage !== null &&
    classAssignmentAverage !== null &&
    assignmentAverage <= classAssignmentAverage - BELOW_CLASS_AVERAGE_BY;
  const lowAcademicResults = lowQuizResults || lowAssignmentAverage;

  const academicProblemCount = [
    farBelowExpected,
    missingDueAssignments.length >= 2,
    lowAcademicResults,
  ].filter(Boolean).length;
  const warningSignalCount = [
    noRecentCadActivity,
    stalledOnCurrentLesson,
    repeatedRecentHelp,
  ].filter(Boolean).length;

  let attentionLevel: AttentionLevel = "none";
  if (academicProblemCount >= 2) {
    attentionLevel = "high";
  } else if (academicProblemCount === 1 || warningSignalCount >= 2) {
    attentionLevel = "check";
  } else if (paceStatus === "missing") {
    attentionLevel = "unknown";
  }

  const hasEnoughScoredWork =
    attemptedQuizzes.length + scoredDueAssignments.length >= 2;
  const quizResultsAreAcceptable = !lowQuizResults;
  const assignmentResultsAreAcceptable =
    assignmentAverage === null ||
    classAssignmentAverage === null ||
    assignmentAverage > classAssignmentAverage - BELOW_CLASS_AVERAGE_BY;
  const hasCompleteEnoughData =
    student.telemetryAvailability === "available" &&
    detail.helpRequests !== null;
  const isDoingWell =
    (paceStatus === "ahead" || paceStatus === "on-pace") &&
    dueAssignmentsReceived === dueAssignments.length &&
    returnedDueAssignments.length === 0 &&
    hasEnoughScoredWork &&
    quizResultsAreAcceptable &&
    assignmentResultsAreAcceptable &&
    hasCompleteEnoughData &&
    attentionLevel === "none";

  const reasons: string[] = [];

  if (farBelowExpected && paceDifference !== null) {
    const difference = Math.abs(paceDifference);
    reasons.push(
      `${difference} ${difference === 1 ? "lesson" : "lessons"} behind`,
    );
  }

  if (missingDueAssignments.length > 0) {
    const word =
      missingDueAssignments.length === 1 ? "assignment" : "assignments";
    reasons.push(
      `${missingDueAssignments.length} past-due ${word} not submitted`,
    );
  }

  if (lowQuizResults) {
    reasons.push("Quiz scores below average");
  }

  if (
    lowAssignmentAverage &&
    assignmentAverage !== null &&
    classAssignmentAverage !== null
  ) {
    reasons.push("Due-assignment scores below average");
  }

  if (returnedDueAssignments.length > 0) {
    reasons.push(
      `${returnedDueAssignments[0].id.toUpperCase()} needs revision`,
    );
  }

  if (noRecentCadActivity) {
    reasons.push(`No CAD activity for ${daysSinceActive} days`);
  }

  if (stalledOnCurrentLesson) {
    reasons.push(`No lesson completed for ${daysOnCurrentLesson} days`);
  }

  if (repeatedRecentHelp) {
    reasons.push(
      `${recentHelpRequestCount} help requests in the last ${RECENT_HELP_DAYS} days`,
    );
  }

  if (paceDifference === null) {
    reasons.push("Progress data is unavailable");
  } else if (paceDifference < 0) {
    if (!farBelowExpected) {
      const difference = Math.abs(paceDifference);
      reasons.push(
        `${difference} ${difference === 1 ? "lesson" : "lessons"} behind`,
      );
    }
  } else if (paceDifference > 0) {
    reasons.push(
      `${paceDifference} ${paceDifference === 1 ? "lesson" : "lessons"} ahead`,
    );
  } else {
    reasons.push("At expected pace");
  }

  if (isDoingWell) {
    reasons.push("All due assignments received");
    if (quizAverage !== null) {
      reasons.push(`Average quiz score ${Math.round(quizAverage)}%`);
    }
    if (assignmentAverage !== null) {
      reasons.push(
        `Average due-assignment score ${Math.round(assignmentAverage)}%`,
      );
    }
  }

  return {
    student,
    detail,
    paceStatus,
    paceDifference,
    attentionLevel,
    isDoingWell,
    academicProblemCount,
    warningSignalCount,
    reasons,
    daysSinceActive,
    dueAssignmentsReceived,
    dueAssignmentsTotal: dueAssignments.length,
    missingDueAssignmentCount: missingDueAssignments.length,
    returnedDueAssignmentCount: returnedDueAssignments.length,
    helpRequestCount: detail.helpRequests?.length ?? null,
    recentHelpRequestCount,
    assignments,
    quizzes,
  };
}

export function getStudentInsights(data: DashboardData) {
  const attentionOrder: Record<AttentionLevel, number> = {
    high: 0,
    check: 1,
    none: 2,
    unknown: 3,
  };

  const quizScoresById: Record<
    string,
    Array<{ studentId: string; score: number }>
  > = Object.fromEntries(
    data.course.quizzes.map((quiz) => [
      quiz.id,
      Object.entries(data.studentDetails).flatMap(([studentId, detail]) => {
        const score = detail.quizAttempts[quiz.id]?.at(-1);
        return typeof score === "number" ? [{ studentId, score }] : [];
      }),
    ]),
  );
  const dueAssignmentScores = data.studentSummaries.flatMap((student) =>
    getAssignmentRows(data.course, data.studentDetails[student.id]).flatMap(
      (assignment) =>
        assignment.isDue && assignment.score !== undefined
          ? [assignment.score]
          : [],
    ),
  );
  const classAssignmentAverage = average(dueAssignmentScores);

  return data.studentSummaries
    .map((student) => {
      const peerQuizAverages: Record<string, number | null> =
        Object.fromEntries(
          data.course.quizzes.map((quiz) => {
            const peerScores = quizScoresById[quiz.id]
              .filter((result) => result.studentId !== student.id)
              .map((result) => result.score);

            return [
              quiz.id,
              peerScores.length >= MIN_QUIZ_PEERS
                ? average(peerScores)
                : null,
            ];
          }),
        );

      return getStudentInsight(
        data.course,
        student,
        data.studentDetails[student.id],
        peerQuizAverages,
        classAssignmentAverage,
      );
    })
    .sort((first, second) => {
      const attentionDifference =
        attentionOrder[first.attentionLevel] -
        attentionOrder[second.attentionLevel];
      if (attentionDifference !== 0) return attentionDifference;

      const firstLessons = first.student.progress.lessonsCompleted ?? Infinity;
      const secondLessons = second.student.progress.lessonsCompleted ?? Infinity;
      if (firstLessons !== secondLessons) return firstLessons - secondLessons;

      if (first.academicProblemCount !== second.academicProblemCount) {
        return second.academicProblemCount - first.academicProblemCount;
      }

      if (first.warningSignalCount !== second.warningSignalCount) {
        return second.warningSignalCount - first.warningSignalCount;
      }

      return (first.student.name ?? "").localeCompare(
        second.student.name ?? "",
      );
    });
}

export function getClassSummary(
  course: Course,
  students: StudentInsight[],
): ClassSummary {
  const studentsWithProgress = students.filter(
    (student) => typeof student.student.progress.lessonsCompleted === "number",
  );
  const lessonsCompleted = studentsWithProgress.reduce(
    (total, student) =>
      total + (student.student.progress.lessonsCompleted ?? 0),
    0,
  );
  const averageLessons = lessonsCompleted / studentsWithProgress.length;
  const dueWorkReceived = students.reduce(
    (total, student) => total + student.dueAssignmentsReceived,
    0,
  );
  const dueWorkTotal = students.reduce(
    (total, student) => total + student.dueAssignmentsTotal,
    0,
  );
  const paceCounts: Record<PaceStatus, number> = {
    ahead: 0,
    "on-pace": 0,
    below: 0,
    missing: 0,
  };

  for (const student of students) {
    paceCounts[student.paceStatus] += 1;
  }

  return {
    totalStudents: students.length,
    studentsWithProgress: studentsWithProgress.length,
    averageLessons: Number(averageLessons.toFixed(1)),
    highAttentionCount: students.filter(
      (student) => student.attentionLevel === "high",
    ).length,
    attentionCount: students.filter(
      (student) => student.attentionLevel === "check",
    ).length,
    doingWellCount: students.filter((student) => student.isDoingWell).length,
    missingDueSubmissionCount: students.reduce(
      (total, student) => total + student.missingDueAssignmentCount,
      0,
    ),
    studentsMissingDueSubmissions: students.filter(
      (student) => student.missingDueAssignmentCount > 0,
    ).length,
    returnedDueSubmissionCount: students.reduce(
      (total, student) => total + student.returnedDueAssignmentCount,
      0,
    ),
    missingProgressCount: paceCounts.missing,
    oneLessonBelowCount: students.filter(
      (student) => student.paceDifference === -1,
    ).length,
    dueWorkReceived,
    dueWorkTotal,
    paceCounts,
  };
}

export function getModuleInsights(data: DashboardData): ModuleInsight[] {
  return data.course.modules.map((module, index) => {
    const lessonPrefix = `${index + 1}.`;
    const moduleQuizIds = data.course.quizzes
      .filter((quiz) => quiz.moduleId === module.moduleId)
      .map((quiz) => quiz.id);
    const dueAssignmentIds = data.course.assignments
      .filter(
        (assignment) =>
          assignment.moduleId === module.moduleId &&
          Date.parse(assignment.dueAt) < Date.parse(data.course.snapshotAt),
      )
      .map((assignment) => assignment.id);

    const studentsInModule = data.studentSummaries.filter(
      (student) => student.progress.currentModule === module.title,
    ).length;
    const studentsRequestingHelp = Object.values(data.studentDetails).filter(
      (detail) =>
        (detail.helpRequests ?? []).some((request) =>
          request.lessonId.startsWith(lessonPrefix),
        ),
    ).length;
    const helpRequestCount = Object.values(data.studentDetails).reduce(
      (total, detail) =>
        total +
        (detail.helpRequests ?? []).filter((request) =>
          request.lessonId.startsWith(lessonPrefix),
        ).length,
      0,
    );
    const studentsWithHelpData = Object.values(data.studentDetails).filter(
      (detail) => detail.helpRequests !== null,
    ).length;
    const quizScores = Object.values(data.studentDetails).flatMap((detail) =>
      moduleQuizIds
        .map((quizId) => detail.quizAttempts[quizId]?.at(-1))
        .filter((score): score is number => typeof score === "number"),
    );

    let missingDueAssignments = 0;
    let returnedAssignments = 0;
    for (const detail of Object.values(data.studentDetails)) {
      for (const assignmentId of dueAssignmentIds) {
        const submission = getLatestSubmission(detail, assignmentId);
        if (
          !submission ||
          submission.status === "not_started" ||
          submission.status === "in_progress"
        ) {
          missingDueAssignments += 1;
        }
        if (submission?.status === "returned") returnedAssignments += 1;
      }
    }

    return {
      moduleId: module.moduleId,
      title: module.title,
      studentsInModule,
      helpRequestCount,
      studentsRequestingHelp,
      studentsWithHelpData,
      quizAverage: quizScores.length
        ? Math.round(
            (quizScores.reduce((total, score) => total + score, 0) /
              quizScores.length) *
              10,
          ) / 10
        : null,
      quizStudentCount: quizScores.length,
      hasDueAssignment: dueAssignmentIds.length > 0,
      missingDueAssignments,
      returnedAssignments,
    };
  });
}

function getClassQuizAverage(modules: ModuleInsight[]) {
  const quizScoreTotal = modules.reduce(
    (total, module) =>
      total + (module.quizAverage ?? 0) * module.quizStudentCount,
    0,
  );
  const quizScoreCount = modules.reduce(
    (total, module) => total + module.quizStudentCount,
    0,
  );

  return quizScoreCount > 0 ? quizScoreTotal / quizScoreCount : null;
}

export function getModuleChallengeSignals(
  module: ModuleInsight,
  totalStudents: number,
  classQuizAverage: number | null,
): ModuleChallengeSignals {
  const quizSignalAvailable =
    module.quizAverage !== null && classQuizAverage !== null;
  const helpSignalAvailable = module.studentsWithHelpData > 0;
  const missingSignalAvailable = module.hasDueAssignment;

  const lowQuizAverage =
    module.quizAverage !== null &&
    classQuizAverage !== null &&
    module.quizAverage <= classQuizAverage - MODULE_QUIZ_GAP;
  const highHelpShare =
    helpSignalAvailable &&
    totalStudents > 0 &&
    module.studentsRequestingHelp / totalStudents >= MODULE_HELP_SHARE;
  const highMissingShare =
    missingSignalAvailable &&
    totalStudents > 0 &&
    module.missingDueAssignments / totalStudents >= MODULE_MISSING_SHARE;

  return {
    lowQuizAverage,
    highHelpShare,
    highMissingShare,
    availableSignalCount: [
      quizSignalAvailable,
      helpSignalAvailable,
      missingSignalAvailable,
    ].filter(Boolean).length,
    challengeSignalCount: [lowQuizAverage, highHelpShare, highMissingShare].filter(
      Boolean,
    ).length,
  };
}

export function getModuleChallenge(
  modules: ModuleInsight[],
  totalStudents: number,
): ModuleChallenge {
  const classQuizAverage = getClassQuizAverage(modules);
  const evaluatedModules = modules.map((module) => ({
    module,
    signals: getModuleChallengeSignals(
      module,
      totalStudents,
      classQuizAverage,
    ),
  }));
  const challengingModules = evaluatedModules
    .filter(({ signals }) => signals.challengeSignalCount >= 2)
    .sort(
      (first, second) =>
        second.signals.challengeSignalCount -
        first.signals.challengeSignalCount,
    );

  if (challengingModules.length > 0) {
    return {
      status: "found",
      module: challengingModules[0].module,
      classQuizAverage,
    };
  }

  const hasEnoughData = evaluatedModules.some(
    ({ signals }) => signals.availableSignalCount >= 2,
  );

  return {
    status: hasEnoughData ? "none" : "insufficient",
    module: null,
    classQuizAverage,
  };
}

export function getPaceLabel(status: PaceStatus) {
  const labels: Record<PaceStatus, string> = {
    ahead: "Above pace",
    "on-pace": "At pace",
    below: "Below pace",
    missing: "No data",
  };

  return labels[status];
}

export function getPaceDifferenceLabel(student: StudentInsight) {
  if (student.paceDifference === null) return "Not available";
  if (student.paceDifference === 0) return "At expected pace";

  const difference = Math.abs(student.paceDifference);
  const direction = student.paceDifference > 0 ? "ahead" : "behind";
  return `${difference} ${difference === 1 ? "lesson" : "lessons"} ${direction}`;
}

export function getAssignmentStatusLabel(status: AssignmentStatus) {
  const labels: Record<AssignmentStatus, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    submitted: "Submitted",
    graded: "Graded",
    returned: "Needs revision",
  };

  return labels[status];
}
