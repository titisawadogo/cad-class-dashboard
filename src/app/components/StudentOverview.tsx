"use client";

import { useState } from "react";
import {
  getPaceDifferenceLabel,
  getPaceLabel,
} from "../lib/dashboard";
import type { ClassSummary, StudentInsight } from "../lib/dashboard";
import type { AttentionLevel, Course, PaceStatus } from "../types";

const STUDENTS_PER_PAGE = 8;

type StudentFilter =
  | "attention"
  | "doing-well"
  | "below"
  | "on-pace"
  | "ahead"
  | "missing"
  | "all";

interface StudentOverviewProps {
  course: Course;
  students: StudentInsight[];
  summary: ClassSummary;
  selectedId: string;
  onSelect: (studentId: string) => void;
}

export default function StudentOverview({
  course,
  students,
  summary,
  selectedId,
  onSelect,
}: StudentOverviewProps) {
  const [activeFilter, setActiveFilter] =
    useState<StudentFilter>("attention");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredStudents = sortStudents(
    students.filter((student) => {
      const name = student.student.name ?? "";
      const matchesSearch = name
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesFilter(student, activeFilter) && matchesSearch;
    }),
    activeFilter,
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE),
  );
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * STUDENTS_PER_PAGE;
  const visibleStudents = filteredStudents.slice(
    pageStart,
    pageStart + STUDENTS_PER_PAGE,
  );

  const filters: Array<{ id: StudentFilter; label: string; count: number }> = [
    {
      id: "attention",
      label: "Watch list",
      count: summary.highAttentionCount + summary.attentionCount,
    },
    { id: "doing-well", label: "Doing well", count: summary.doingWellCount },
    { id: "below", label: "Below pace", count: summary.paceCounts.below },
    {
      id: "on-pace",
      label: "At pace",
      count: summary.paceCounts["on-pace"],
    },
    { id: "ahead", label: "Above pace", count: summary.paceCounts.ahead },
    { id: "missing", label: "No data", count: summary.paceCounts.missing },
    { id: "all", label: "All", count: summary.totalStudents },
  ];

  function changeFilter(filter: StudentFilter) {
    setActiveFilter(filter);
    setPage(1);

    const firstMatch = sortStudents(
      students.filter((student) => matchesFilter(student, filter)),
      filter,
    )[0];
    if (firstMatch) onSelect(firstMatch.student.id);
  }

  return (
    <section className="panel students-panel" aria-labelledby="students-title">
      <div className="section-heading table-heading">
        <h2 id="students-title">Student overview</h2>
        <label className="search-box">
          <span>Search students</span>
          <input
            aria-label="Search students"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search students"
            type="search"
            value={query}
          />
        </label>
      </div>

      <div className="student-filters" aria-label="Filter students">
        {filters.map((filter) => (
          <button
            aria-pressed={activeFilter === filter.id}
            className={activeFilter === filter.id ? "active" : ""}
            key={filter.id}
            onClick={() => changeFilter(filter.id)}
            type="button"
          >
            {filter.label} <span>{filter.count}</span>
          </button>
        ))}
      </div>

      <div className="student-table-wrap">
        <div className="student-table">
          <div className="student-table-header">
            <span>Name</span>
            <span>Lessons</span>
            <span>Compared with expected</span>
            <span>Due assignments</span>
            <span>Reason</span>
          </div>

          {visibleStudents.length === 0 ? (
            <div className="empty-row">No results.</div>
          ) : (
            visibleStudents.map((student) => (
              <StudentRow
                course={course}
                isSelected={selectedId === student.student.id}
                key={student.student.id}
                onSelect={() => onSelect(student.student.id)}
                student={student}
              />
            ))
          )}
        </div>
      </div>

      <div className="pagination-row">
        <div className="pagination-controls" aria-label="Student pages">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (number) => (
              <button
                aria-current={number === currentPage ? "page" : undefined}
                className={number === currentPage ? "active" : ""}
                key={number}
                onClick={() => setPage(number)}
                type="button"
              >
                {number}
              </button>
            ),
          )}
          <button
            disabled={currentPage === pageCount}
            onClick={() =>
              setPage((value) => Math.min(pageCount, value + 1))
            }
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function matchesFilter(student: StudentInsight, filter: StudentFilter) {
  if (filter === "all") return true;
  if (filter === "attention") {
    return (
      student.attentionLevel === "high" ||
      student.attentionLevel === "check"
    );
  }
  if (filter === "doing-well") return student.isDoingWell;
  return student.paceStatus === filter;
}

function sortStudents(
  students: StudentInsight[],
  filter: StudentFilter,
): StudentInsight[] {
  const sorted = [...students];
  const lessons = (student: StudentInsight) =>
    student.student.progress.lessonsCompleted ?? Infinity;

  if (filter === "ahead" || filter === "doing-well") {
    return sorted.sort((first, second) => lessons(second) - lessons(first));
  }

  if (filter === "below") {
    return sorted.sort((first, second) => lessons(first) - lessons(second));
  }

  return sorted;
}

export function getInitials(name: string | null) {
  if (!name) return "?";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PaceBadge({ status }: { status: PaceStatus }) {
  return (
    <span className={`pace-badge pace-${status}`}>
      <span aria-hidden="true" />
      {getPaceLabel(status)}
    </span>
  );
}

function AttentionBadge({ level }: { level: AttentionLevel }) {
  if (level === "none") return null;

  const labels: Record<Exclude<AttentionLevel, "none">, string> = {
    high: "High priority",
    check: "Needs attention",
    unknown: "Unknown",
  };

  return (
    <span className={`attention-badge attention-${level}`}>
      {labels[level]}
    </span>
  );
}

export function StudentStatusBadge({ student }: { student: StudentInsight }) {
  if (student.isDoingWell) {
    return <span className="attention-badge doing-well-badge">Doing well</span>;
  }

  return <AttentionBadge level={student.attentionLevel} />;
}

function StudentRow({
  course,
  student,
  isSelected,
  onSelect,
}: {
  course: Course;
  student: StudentInsight;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const lessonsCompleted = student.student.progress.lessonsCompleted;
  const progressPercent =
    typeof lessonsCompleted === "number"
      ? Math.round((lessonsCompleted / course.lessonsTotal) * 100)
      : 0;
  const assignmentLabel =
    student.missingDueAssignmentCount > 0
      ? `${student.missingDueAssignmentCount} missing`
      : student.returnedDueAssignmentCount > 0
        ? `${student.returnedDueAssignmentCount} needs revision`
        : "received";

  return (
    <button
      className={isSelected ? "student-row selected" : "student-row"}
      onClick={onSelect}
      type="button"
    >
      <span className="student-name">
        <span className="avatar">{getInitials(student.student.name)}</span>
        <strong>{student.student.name ?? "Unnamed student"}</strong>
      </span>

      <span className="lesson-progress">
        <strong>
          {typeof lessonsCompleted === "number"
            ? `${lessonsCompleted} / ${course.lessonsTotal}`
            : "No data"}
        </strong>
        <span className="progress-track" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </span>
      </span>

      <span className="pace-cell">
        <PaceBadge status={student.paceStatus} />
        <small>{getPaceDifferenceLabel(student)}</small>
      </span>

      <span className="due-work">
        <strong>
          {student.dueAssignmentsReceived} / {student.dueAssignmentsTotal}
        </strong>
        <small>{assignmentLabel}</small>
      </span>

      <span className="student-reason">
        <StudentStatusBadge student={student} />
        <span>{student.reasons[0]}</span>
      </span>
    </button>
  );
}
