export const PRIMARY_COLOR = '#164A86';

export const courseSystems = ['机器人', 'Arduino', '三维设计'];

export const courseTypes = ['常规课', '竞赛课'];
export const courseFormats = courseTypes;

export const projectAbilityTagsByCourseSystem = {
  机器人: [
    '结构搭建能力',
    '程序理解能力',
    '程序调试能力',
    '规则理解能力',
    '任务执行能力',
    '策略规划能力',
    '课堂专注度',
    '表达复盘能力',
    '团队协作能力',
  ],
  Arduino: [
    '电路连接能力',
    '模块功能理解',
    '程序逻辑能力',
    '调试排错能力',
    '项目完整度',
    '应用迁移能力',
    '课堂专注度',
    '表达复盘能力',
  ],
  三维设计: [
    '空间理解能力',
    '工具操作能力',
    '造型设计能力',
    '结构合理性',
    '尺寸意识',
    '作品完整度',
    '优化迭代能力',
    '表达展示能力',
  ],
};

export function getProjectAbilityOptions(courseSystem) {
  return projectAbilityTagsByCourseSystem[courseSystem] || [];
}

export function getAssessmentTemplateName(courseSystem, courseFormat) {
  if (!courseSystem || !courseFormat) return '';
  return `${courseSystem}${courseFormat}测评模板`;
}

export function normalizeCourseTypes(form = {}) {
  if (Array.isArray(form.courseTypes)) {
    return form.courseTypes.filter((type) => courseTypes.includes(type));
  }

  const legacyType = form.courseType || form.courseFormat || '';
  return legacyType
    .split(/[\/、,，]+/)
    .map((type) => type.trim())
    .filter((type) => courseTypes.includes(type));
}

export function formatCourseTypes(value = {}) {
  const types = Array.isArray(value) ? value : normalizeCourseTypes(value);
  return types.length ? types.join(' / ') : '';
}

export function normalizeCourseInfo(form = {}) {
  const legacyCourse = form.courseType || '';
  const courseSystem = form.courseSystem || (legacyCourse ? '旧版课程类型' : '');
  const selectedCourseTypes = normalizeCourseTypes(form);
  const courseFormat = formatCourseTypes(selectedCourseTypes);
  const abilityStage = form.abilityStage || form.courseStage || legacyCourse;
  const assessmentTemplate =
    form.assessmentTemplate ||
    getAssessmentTemplateName(courseSystem, courseFormat) ||
    (legacyCourse ? '旧版测评模板' : '');

  return {
    courseSystem,
    abilityStage,
    courseTypes: selectedCourseTypes,
    courseFormat,
    courseType: courseFormat,
    courseStage: abilityStage,
    assessmentTemplate,
  };
}

export const grades = [
  '幼儿园',
  '一年级',
  '二年级',
  '三年级',
  '四年级',
  '五年级',
  '六年级',
  '初一',
  '初二',
  '初三',
];

export const legacyAbilityDimensions = [
  { key: 'structure', label: '结构搭建能力' },
  { key: 'programming', label: '程序理解能力' },
  { key: 'debugging', label: '调试排错能力' },
  { key: 'strategy', label: '任务策略能力' },
  { key: 'focus', label: '课堂专注度' },
  { key: 'review', label: '表达复盘能力' },
  { key: 'teamwork', label: '团队协作能力' },
];

export const abilityDimensionsByCourseSystem = {
  机器人: [
    { key: 'robot_structure', label: '结构搭建能力' },
    { key: 'robot_programming', label: '程序理解能力' },
    { key: 'robot_debugging', label: '调试排错能力' },
    { key: 'robot_execution', label: '任务执行能力' },
    { key: 'robot_strategy', label: '策略规划能力' },
    { key: 'robot_focus', label: '课堂专注度' },
    { key: 'robot_review', label: '表达复盘能力' },
    { key: 'robot_teamwork', label: '团队协作能力' },
  ],
  Arduino: [
    { key: 'arduino_circuit', label: '电路连接能力' },
    { key: 'arduino_module', label: '模块功能理解' },
    { key: 'arduino_logic', label: '程序逻辑能力' },
    { key: 'arduino_debugging', label: '调试排错能力' },
    { key: 'arduino_completion', label: '项目完整度' },
    { key: 'arduino_transfer', label: '应用迁移能力' },
    { key: 'arduino_focus', label: '课堂专注度' },
    { key: 'arduino_review', label: '表达复盘能力' },
  ],
  三维设计: [
    { key: 'design_space', label: '空间理解能力' },
    { key: 'design_tool', label: '工具操作能力' },
    { key: 'design_modeling', label: '造型设计能力' },
    { key: 'design_structure', label: '结构合理性' },
    { key: 'design_size', label: '尺寸意识' },
    { key: 'design_completion', label: '作品完整度' },
    { key: 'design_iteration', label: '优化迭代能力' },
    { key: 'design_presentation', label: '表达展示能力' },
  ],
};

export function getDimensionId(dimension = {}) {
  return dimension.id || dimension.key;
}

export function normalizeAbilityDimension(dimension) {
  const id = getDimensionId(dimension);
  return {
    ...dimension,
    id,
    key: dimension.key || id,
  };
}

export function getAbilityDimensions(courseSystem) {
  const dimensions = abilityDimensionsByCourseSystem[courseSystem] || legacyAbilityDimensions;
  return dimensions.map(normalizeAbilityDimension);
}

export const scoreReferenceStandards = [
  {
    score: 1,
    title: '需要大量帮助',
    description: '基本不能独立完成，需要老师持续提醒或直接协助。',
  },
  {
    score: 2,
    title: '能在提示下完成',
    description: '有基本理解，但依赖老师提示，容易中断或出错。',
  },
  {
    score: 3,
    title: '基本独立完成',
    description: '能完成主要任务，遇到问题需要少量引导。',
  },
  {
    score: 4,
    title: '表现较好',
    description: '能较稳定完成任务，并能主动调整或说明思路。',
  },
  {
    score: 5,
    title: '表现突出',
    description: '能独立完成并迁移应用，还能帮助同伴或提出优化方案。',
  },
];
