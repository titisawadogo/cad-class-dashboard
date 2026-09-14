"use client";

import Image from "next/image";
import { Fragment, useState } from "react";
import {
  getClassSummary,
  getModuleChallenge,
  getModuleInsights,
  getStudentInsights,
} from "../lib/dashboard";
import type { DashboardData } from "../types";
import ClassOverview from "./ClassOverview";
import ModuleOverview from "./ModuleOverview";
import StudentDetail from "./StudentDetail";
import StudentOverview from "./StudentOverview";

export default function Dashboard({ data }: { data: DashboardData }) {
  const students = getStudentInsights(data);
  const classSummary = getClassSummary(data.course, students);
  const modules = getModuleInsights(data);
  const moduleChallenge = getModuleChallenge(
    modules,
    classSummary.totalStudents,
  );

  const [selectedId, setSelectedId] = useState(students[0].student.id);
  const selectedStudent =
    students.find((student) => student.student.id === selectedId) ?? students[0];

  const weekNumber = data.course.weeksElapsed + 1;
  const [sectionName, term] = data.course.section.split(/\s[\u2013\u2014]\s/);
  const courseDetails = [
    `Instructor: ${data.course.instructor}`,
    sectionName.replace("Section ", "Section: "),
    `Term: ${term}`,
    `${classSummary.totalStudents} students`,
  ];

  return (
    <main className="dashboard-main">
      <header className="course-header">
        <div className="course-identity">
          <Image
            src="/autodesk-logo.svg"
            alt="Autodesk"
            width={1592}
            height={164}
            style={{ height: "auto", width: "140px" }}
            priority
          />
          <div>
            <h1>
              {data.course.code}: {data.course.title}
            </h1>
            <div className="course-meta">
              {courseDetails.map((detail, index) => (
                <Fragment key={detail}>
                  {index > 0 && <span className="meta-dot" aria-hidden="true" />}
                  <span>{detail}</span>
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="week-summary" aria-label={`Week ${weekNumber} of 12`}>
          <div>
            <strong>Week {weekNumber} of 12</strong>
            <span>Date: {formatDate(data.course.snapshotAt)}</span>
          </div>
          <div className="week-track" aria-hidden="true">
            <span style={{ width: `${(weekNumber / 12) * 100}%` }} />
          </div>
        </div>
      </header>

      <ClassOverview
        course={data.course}
        moduleChallenge={moduleChallenge}
        summary={classSummary}
      />

      <div className="dashboard-grid">
        <div className="main-column">
          <StudentOverview
            course={data.course}
            onSelect={setSelectedId}
            selectedId={selectedStudent.student.id}
            students={students}
            summary={classSummary}
          />
          <ModuleOverview
            moduleChallenge={moduleChallenge}
            modules={modules}
            totalStudents={classSummary.totalStudents}
          />
        </div>

        <StudentDetail course={data.course} student={selectedStudent} />
      </div>
    </main>
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
