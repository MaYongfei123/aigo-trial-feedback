import { courseTypes } from '../constants/assessment.js';

const STORAGE_KEY = 'aigo_assessment_records_v1';
const PROJECTS_STORAGE_KEY = 'aigo_project_library_v1';
const ROBOT_SPECIAL_TEST_STORAGE_KEY = 'aigo_robot_special_test_records_v1';
const TRIAL_CLASS_RECORDS_STORAGE_KEY = 'trialClassRecords';

const defaultProjects = [
  {
    id: 'sample-garden-robot',
    createdAt: '2026-06-11T00:00:00.000Z',
    updatedAt: '2026-06-11T00:00:00.000Z',
    projectName: '园艺机器人',
    applicableGrade: '三年级',
    courseSystem: '机器人',
    abilityStage: '进阶阶段',
    courseFormat: '竞赛课',
    learningContent: '机器人比例循线算法、机器人寻找路口、简单控制机械臂',
    relatedAbilities: '程序调试能力、规则理解能力',
    stageOutcome: '本阶段完成「园艺机器人」项目，围绕竞赛任务中的路线行驶、路口判断和简单机械臂控制展开训练。',
    parentReportDescription:
      '本阶段孩子参与了「园艺机器人」项目，学习了比例循线、路口判断和简单机械臂控制等内容。该项目重点训练孩子对竞赛规则的理解，以及在测试中不断调整程序、提升任务稳定性的能力。',
    notes: '',
  },
];

export function loadRecords() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecord(record) {
  const records = loadRecords();
  const nextRecords = [record, ...records];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function deleteRecord(recordId) {
  const nextRecords = loadRecords().filter((record) => record.id !== recordId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function clearRecords() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function normalizeProject(project) {
  const courseFormat = courseTypes.includes(project.courseFormat) ? project.courseFormat : '';
  return {
    id: project.id || crypto.randomUUID(),
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
    projectName: project.projectName || '',
    applicableGrade: project.applicableGrade || '',
    courseSystem: project.courseSystem || '',
    abilityStage: project.abilityStage || '',
    courseFormat,
    learningContent: project.learningContent || '',
    relatedAbilities: project.relatedAbilities || '',
    stageOutcome: project.stageOutcome || '',
    parentReportDescription: project.parentReportDescription || '',
    notes: project.notes || '',
  };
}

export function loadProjects() {
  try {
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw === null) {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(defaultProjects));
      return defaultProjects;
    }
    const projects = JSON.parse(raw);
    return Array.isArray(projects) ? projects.map(normalizeProject) : defaultProjects;
  } catch {
    return defaultProjects;
  }
}

export function saveProject(project) {
  const projects = loadProjects();
  const now = new Date().toISOString();
  const nextProject = normalizeProject({
    ...project,
    updatedAt: now,
    createdAt: project.createdAt || now,
  });
  const exists = projects.some((item) => item.id === nextProject.id);
  const nextProjects = exists
    ? projects.map((item) => (item.id === nextProject.id ? nextProject : item))
    : [nextProject, ...projects];
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  return nextProjects;
}

export function deleteProject(projectId) {
  const nextProjects = loadProjects().filter((project) => project.id !== projectId);
  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
  return nextProjects;
}

export function loadRobotSpecialTestRecords() {
  try {
    const raw = window.localStorage.getItem(ROBOT_SPECIAL_TEST_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function saveRobotSpecialTestRecord(record) {
  const records = loadRobotSpecialTestRecords();
  const nextRecords = [record, ...records];
  window.localStorage.setItem(ROBOT_SPECIAL_TEST_STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function deleteRobotSpecialTestRecord(recordId) {
  const nextRecords = loadRobotSpecialTestRecords().filter((record) => record.id !== recordId);
  window.localStorage.setItem(ROBOT_SPECIAL_TEST_STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function loadTrialClassRecords() {
  try {
    const raw = window.localStorage.getItem(TRIAL_CLASS_RECORDS_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    return Array.isArray(records) ? records.map(normalizeTrialClassStorageRecord) : [];
  } catch {
    return [];
  }
}

function normalizeTrialClassStorageRecord(record = {}) {
  return {
    id: record.id || record.recordId || crypto.randomUUID(),
    studentName: record.studentName || '',
    grade: record.grade || '',
    courseSystem: record.courseSystem || '',
    lessonDate: record.lessonDate || record.trialDate || '',
    courseName: record.courseName || '',
    learningContent: record.learningContent || '',
    performanceDescription: record.performanceDescription || '',
    abilityObservation: record.abilityObservation || '',
    strengths: record.strengths || '',
    improvements: record.improvements || '',
    nextSuggestion: record.nextSuggestion || '',
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

export function saveTrialClassRecord(record) {
  try {
    const records = loadTrialClassRecords();
    const nextRecord = normalizeTrialClassStorageRecord({
      ...record,
      id: record.id || record.recordId || crypto.randomUUID(),
      createdAt: record.createdAt || new Date().toISOString(),
    });
    const exists = records.some((item) => item.id === nextRecord.id);
    const nextRecords = exists
      ? records.map((item) => (item.id === nextRecord.id ? nextRecord : item))
      : [nextRecord, ...records];
    window.localStorage.setItem(TRIAL_CLASS_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
    return {
      success: true,
      data: nextRecord,
      records: nextRecords,
    };
  } catch (error) {
    return {
      success: false,
      quotaExceeded:
        error?.name === 'QuotaExceededError' ||
        error?.code === 22 ||
        /quota|exceeded/i.test(error?.message || ''),
      message:
        error?.name === 'QuotaExceededError' || error?.code === 22 || /quota|exceeded/i.test(error?.message || '')
          ? '本地存储空间不足，请删除部分旧记录或减少图片大小。'
          : error?.message || '保存失败',
    };
  }
}

export function deleteTrialClassRecord(recordId) {
  const nextRecords = loadTrialClassRecords().filter((record) => record.id !== recordId);
  window.localStorage.setItem(TRIAL_CLASS_RECORDS_STORAGE_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}
