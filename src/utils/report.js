import {
  getAbilityDimensions,
  getDimensionId,
  legacyAbilityDimensions,
  normalizeAbilityDimension,
  normalizeCourseInfo,
} from '../constants/assessment.js';

const adviceByDimension = {
  structure: '通过更多限时搭建和结构复刻任务，提升空间理解、稳定性判断和搭建效率。',
  programming: '建议用流程图、口述步骤和小段代码拆解，帮助学员建立清晰的程序逻辑。',
  debugging: '可以引导学员形成“观察现象、定位原因、尝试修正、验证结果”的排错习惯。',
  strategy: '下一阶段可增加开放任务，让学员先规划方案，再逐步执行并比较不同策略。',
  focus: '建议设置更明确的阶段目标和课堂检查点，帮助学员维持稳定投入。',
  review: '鼓励学员在作品完成后讲清楚思路、难点和改进方向，提升表达与复盘质量。',
  teamwork: '可以安排双人协作或小组挑战，让学员练习分工、沟通和共同解决问题。',
};

const robotDimensionAliases = {
  robot_structure: {
    keys: ['structure'],
    labels: ['结构能力'],
  },
  robot_programming: {
    keys: ['programming'],
    labels: [],
  },
  robot_debugging: {
    keys: ['debugging'],
    labels: [],
  },
  robot_execution: {
    keys: ['execution', 'task_execution', 'strategy'],
    labels: ['任务策略能力', '任务规划能力', '项目完成度'],
  },
  robot_strategy: {
    keys: ['strategy', 'task_strategy', 'planning'],
    labels: ['任务策略能力', '策略能力', '任务规划能力'],
  },
  robot_focus: {
    keys: ['focus'],
    labels: [],
  },
  robot_review: {
    keys: ['review'],
    labels: ['复盘表达能力'],
  },
  robot_teamwork: {
    keys: ['teamwork'],
    labels: ['团队合作能力'],
  },
};

export function getStageObservation(form = {}) {
  const stageObservation = form.stageObservation || {};
  return {
    assessmentCycle: (stageObservation.assessmentCycle || form.assessmentCycle || '').trim(),
    teacherComment: (stageObservation.teacherComment || form.teacherComment || '').trim(),
  };
}

export function getStageTimeText(form = {}) {
  const start = form.stageStartDate || '';
  const end = form.stageEndDate || form.assessmentDate || '';
  if (start && end && start !== end) return `${start} 至 ${end}`;
  return start || end || form.assessmentDate || '';
}

function shortenText(text, maxLength) {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, '').replace(/。+/g, '。');
  if (normalized.length <= maxLength) return normalized;
  const sentence = normalized.split(/[。！？]/)[0];
  return sentence && sentence.length <= maxLength ? sentence : normalized.slice(0, maxLength);
}

export function getScoreValue(scores = {}, dimensionOrKey) {
  const key = typeof dimensionOrKey === 'string' ? dimensionOrKey : getDimensionId(dimensionOrKey);
  const legacyKey = typeof dimensionOrKey === 'string' ? dimensionOrKey : dimensionOrKey?.key;
  const aliases = typeof dimensionOrKey === 'string' ? [] : robotDimensionAliases[key]?.keys || [];
  const value = [key, legacyKey, ...aliases, dimensionOrKey?.label].reduce(
    (matchedValue, candidate) => (matchedValue !== undefined || !candidate ? matchedValue : scores[candidate]),
    undefined,
  );
  return value === undefined || value === null || value === '' ? 3 : Number(value);
}

export function emptyScores() {
  return createEmptyScores(legacyAbilityDimensions);
}

export function createEmptyScores(dimensions) {
  return dimensions.reduce((result, dimension) => {
    result[getDimensionId(dimension)] = 3;
    return result;
  }, {});
}

export function getRecordDimensions(record) {
  if (record?.dimensions?.length) return record.dimensions.map(normalizeAbilityDimension);
  const courseInfo = normalizeCourseInfo(record?.form || record || {});
  return getAbilityDimensions(courseInfo.courseSystem);
}

export function getScoreSummary(scores, dimensions = legacyAbilityDimensions) {
  const entries = dimensions.map((dimension) => {
    const normalized = normalizeAbilityDimension(dimension);
    return {
      ...normalized,
      score: getScoreValue(scores, normalized),
    };
  });
  const total = entries.reduce((sum, item) => sum + item.score, 0);
  const average = total / entries.length;
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter((item) => item.score >= 4);
  const improvements = [...entries]
    .filter((item) => item.score <= 3)
    .sort((a, b) => a.score - b.score);

  return {
    entries,
    average,
    strengths: strengths.length ? strengths.slice(0, 3) : sorted.slice(0, 2),
    improvements: improvements.length ? improvements.slice(0, 3) : sorted.slice(-2),
  };
}

export function getComparisonAnalysis(currentScores, currentDimensions, previousRecord) {
  if (!previousRecord) return null;

  const previousDimensions = getRecordDimensions(previousRecord);
  const previousScores = previousRecord.scores || {};
  const previousByKey = new Map(previousDimensions.map((dimension) => [getDimensionId(dimension), dimension]));
  const previousByLabel = new Map(previousDimensions.map((dimension) => [dimension.label, dimension]));
  const getPreviousDimension = (currentDimension) => {
    const aliasConfig = robotDimensionAliases[getDimensionId(currentDimension)] || {};
    const keyCandidates = [getDimensionId(currentDimension), currentDimension.key, ...(aliasConfig.keys || [])];
    const labelCandidates = [currentDimension.label, ...(aliasConfig.labels || [])];

    for (const candidate of keyCandidates) {
      if (candidate && previousByKey.has(candidate)) return previousByKey.get(candidate);
    }

    for (const candidate of labelCandidates) {
      if (candidate && previousByLabel.has(candidate)) return previousByLabel.get(candidate);
    }

    return null;
  };
  const entries = currentDimensions
    .map((dimension) => {
      const currentDimension = normalizeAbilityDimension(dimension);
      const previousDimension = getPreviousDimension(currentDimension);
      if (!previousDimension) return null;
      const currentScore = getScoreValue(currentScores, currentDimension);
      const previousScore = getScoreValue(previousScores, previousDimension);
      return {
        id: getDimensionId(currentDimension),
        key: currentDimension.key,
        label: currentDimension.label,
        currentScore,
        previousScore,
        change: currentScore - previousScore,
      };
    })
    .filter(Boolean);

  if (!entries.length) return null;

  const currentAverage = entries.reduce((sum, item) => sum + item.currentScore, 0) / entries.length;
  const previousAverage = entries.reduce((sum, item) => sum + item.previousScore, 0) / entries.length;
  const improved = entries.filter((item) => item.change > 0).sort((a, b) => b.change - a.change);
  const declined = entries.filter((item) => item.change < 0).sort((a, b) => a.change - b.change);
  const stable = entries.filter((item) => item.change === 0);

  return {
    previousRecordId: previousRecord.id,
    previousDate: getStageTimeText(previousRecord.form || previousRecord),
    currentAverage,
    previousAverage,
    averageChange: currentAverage - previousAverage,
    matchedCount: entries.length,
    currentDimensionCount: currentDimensions.length,
    isFullMatch: entries.length === currentDimensions.length,
    entries,
    improved,
    declined,
    stable,
    topImprovement: improved[0] || null,
  };
}

export function generateReport(form, scores, dimensions = getAbilityDimensions(form.courseSystem), comparison = null) {
  const summary = getScoreSummary(scores, dimensions);
  const courseInfo = normalizeCourseInfo(form);
  const stageObservation = getStageObservation(form);
  const strengthNames = summary.strengths.map((item) => item.label).join('、');
  const improvementNames = summary.improvements.map((item) => item.label).join('、');
  const advice = summary.improvements
    .slice(0, 2)
    .map((item) => adviceByDimension[item.key] || `建议围绕${item.label}安排更明确的小任务和过程反馈。`)
    .join('');

  let level = '整体能力发展较为均衡';
  if (summary.average >= 4.5) {
    level = '综合表现突出，具备较强的创客学习主动性和任务完成能力';
  } else if (summary.average >= 3.8) {
    level = '综合表现良好，多数能力维度已形成较稳定的学习表现';
  } else if (summary.average < 3) {
    level = '当前仍处于能力建立阶段，需要更多结构化引导和正向反馈';
  }

  const name = form.studentName || '该学员';
  const stageContext = `本阶段围绕所选学习内容与${courseInfo.courseFormat || '课程类型'}进行能力测评。`;
  const cycleText = stageObservation.assessmentCycle ? `测评周期：${stageObservation.assessmentCycle}。` : '';
  const strengthDetail = `这些维度体现出学员当前较稳定的能力基础，可作为后续阶段继续巩固的方向。`;
  const improvementDetail = `这些维度是下一阶段观察和训练的重点，建议通过阶段任务持续跟进。`;
  const nextStepDetail =
    advice || `下一阶段建议围绕${improvementNames}设置更清晰的小目标，并继续观察能力变化。`;
  const teacherMessage = stageObservation.teacherComment
    ? stageObservation.teacherComment
    : `${name}本阶段能力结构已经形成可观察记录，后续可通过持续测评关注成长变化。`;

  if (comparison) {
    const improvedNames = comparison.improved.map((item) => item.label).join('、') || '整体能力结构';
    const declinedNames = comparison.declined.map((item) => item.label).join('、') || '暂无明显下降维度';
    const topText = comparison.topImprovement
      ? `${comparison.topImprovement.label}提升 ${comparison.topImprovement.change} 分`
      : '各项能力整体保持稳定';
    const changeText = `${comparison.previousAverage.toFixed(1)} 分到 ${comparison.currentAverage.toFixed(1)} 分，变化 ${comparison.averageChange >= 0 ? '+' : ''}${comparison.averageChange.toFixed(1)} 分`;

    return {
      reportType: '阶段成长对比报告',
      overall: `${cycleText}${stageContext}${name}本次为阶段成长对比测评，综合得分从 ${changeText}。`,
      strengths: `${name}本阶段进步维度主要体现在：${improvedNames}。其中${topText}，这是本次报告最值得关注的成长点。`,
      improvements: `${name}仍需关注的维度为：${declinedNames}。后续会结合阶段任务继续观察这些能力的稳定性。`,
      nextSteps: `下一阶段建议继续巩固${improvedNames}，同时围绕${declinedNames}设置更清晰的小目标。`,
      teacherMessage: stageObservation.teacherComment || `${name}本阶段已经呈现出成长变化，我们会继续通过阶段任务帮助孩子稳步提升。`,
    };
  }

  return {
    reportType: '阶段能力基线报告',
    overall: `${cycleText}${stageContext}${name}阶段测评平均得分为 ${summary.average.toFixed(1)} 分，${level}。`,
    strengths: `${name}目前较明显的优势能力为：${strengthNames}。${strengthDetail}`,
    improvements: `${name}下一阶段可重点关注：${improvementNames}。${improvementDetail}`,
    nextSteps: nextStepDetail,
    teacherMessage,
  };
}

function getRecordForm(record) {
  const sourceForm = record.form || record || {};
  const courseInfo = normalizeCourseInfo(sourceForm);
  const stageObservation = getStageObservation(sourceForm);
  const projectIds = Array.isArray(sourceForm.projectIds)
    ? sourceForm.projectIds
    : sourceForm.projectId
      ? [sourceForm.projectId]
      : record.projectId
        ? [record.projectId]
        : [];
  const stageStartDate = sourceForm.stageStartDate || '';
  const stageEndDate = sourceForm.stageEndDate || sourceForm.assessmentDate || record.assessmentDate || '';
  return {
    studentName: sourceForm.studentName || record.studentName || '',
    grade: sourceForm.grade || record.grade || '',
    courseSystem: courseInfo.courseSystem,
    abilityStage: courseInfo.abilityStage,
    courseFormat: courseInfo.courseFormat,
    courseStage: courseInfo.courseStage,
    assessmentTemplate: courseInfo.assessmentTemplate,
    projectIds,
    projectId: sourceForm.projectId || projectIds[0] || record.projectId || '',
    projectName: sourceForm.projectName || record.projectName || '',
    projectLearningContent: sourceForm.projectLearningContent || record.projectLearningContent || '',
    projectAbilities: sourceForm.projectAbilities || record.projectAbilities || '',
    projectStageOutcome: sourceForm.projectStageOutcome || record.projectStageOutcome || '',
    projectParentReportDescription: sourceForm.projectParentReportDescription || record.projectParentReportDescription || '',
    stageStartDate,
    stageEndDate,
    assessmentDate: sourceForm.assessmentDate || stageEndDate || stageStartDate || record.assessmentDate || '',
    teacher: sourceForm.teacher || record.teacher || '',
    stageObservation,
  };
}

function getRecordReport(record) {
  return record.report || generateReport(getRecordForm(record), record.scores || emptyScores(), getRecordDimensions(record));
}

function getShareAbilityHighlights(summary) {
  const maxScore = Math.max(...summary.entries.map((item) => item.score));
  const minScore = Math.min(...summary.entries.map((item) => item.score));

  if (maxScore === minScore) {
    return {
      isBalanced: true,
      strengths: [],
      improvements: [],
    };
  }

  const byHighScore = [...summary.entries].sort((a, b) => b.score - a.score);
  const strengths = byHighScore.slice(0, 3);
  const strengthKeys = new Set(strengths.map((item) => item.key));
  const improvements = [...summary.entries]
    .filter((item) => !strengthKeys.has(item.key))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  return {
    isBalanced: false,
    strengths,
    improvements: improvements.length ? improvements : byHighScore.slice(-1),
  };
}

function buildShortAdvice(highlights) {
  if (highlights.isBalanced) {
    return '建议继续保持稳定参与，逐步增加更有挑战的项目任务。';
  }

  const targets = highlights.improvements.map((item) => item.label).join('、');
  return `下阶段可重点关注${targets}，用小目标帮助孩子稳步提升。`;
}

function buildShortAdviceWithStageObservation(highlights, stageObservation) {
  return buildShortAdvice(highlights);
}

function buildShortTeacherMessage(name, highlights, stageObservation) {
  if (stageObservation.teacherComment) {
    return shortenText(stageObservation.teacherComment, 38);
  }

  if (highlights.isBalanced) {
    return `${name}整体表现比较均衡，课堂状态稳定，继续保持。`;
  }

  const strengths = highlights.strengths.slice(0, 2).map((item) => item.label).join('、');
  return `${name}在${strengths}上有亮点，期待把优势带到更多任务中。`;
}

export function buildParentReportText(record) {
  const form = getRecordForm(record);
  const report = getRecordReport(record);
  const stageObservation = getStageObservation(form);
  const stageTimeText = getStageTimeText(form) || '未填写';
  const scores = record.scores || emptyScores();
  const summary = getScoreSummary(scores, getRecordDimensions(record));
  const name = form.studentName || '孩子';
  const strengths = summary.strengths.map((item) => `${item.label}${item.score}分`).join('、');
  const improvements = summary.improvements.map((item) => `${item.label}${item.score}分`).join('、');
  const courseText = [form.courseSystem || '创客课程', form.courseFormat || '当前课程类型']
    .filter(Boolean)
    .join(' · ');
  const projectLines =
    form.projectName || form.projectParentReportDescription || form.projectLearningContent
      ? [
          ``,
          form.projectName ? `本阶段内容摘要：${form.projectName}` : null,
          form.projectLearningContent ? `学习内容：${form.projectLearningContent}` : null,
          form.projectAbilities ? `对应能力：${form.projectAbilities}` : null,
          form.projectParentReportDescription ? `项目说明：${form.projectParentReportDescription}` : null,
        ]
      : [];
  const teacherMessage =
    report.teacherMessage ||
    `${name}在课堂中已经积累了不少可见的成长。接下来我们会继续关注作品完成、表达复盘和独立解决问题的过程。`;

  if (record.comparison) {
    return [
      `【爱高创客阶段成长对比报告】`,
      `${name}家长您好，孩子本次 ${courseText} 测评已完成。`,
      `课程体系：${form.courseSystem || '未填写'}`,
      `课程类型：${form.courseFormat || '未填写'}`,
      stageObservation.assessmentCycle ? `测评周期：${stageObservation.assessmentCycle}` : null,
      `阶段时间：${stageTimeText}`,
      `授课老师：${form.teacher || '未填写'}`,
      `上次平均分：${record.comparison.previousAverage.toFixed(1)} / 5`,
      `本次平均分：${record.comparison.currentAverage.toFixed(1)} / 5`,
      `平均分变化：${record.comparison.averageChange >= 0 ? '+' : ''}${record.comparison.averageChange.toFixed(1)} 分`,
      ...projectLines,
      ``,
      record.comparison.improved.length
        ? `进步维度：${record.comparison.improved.map((item) => `${item.label}+${item.change}`).join('、')}`
        : `进步维度：整体保持稳定`,
      record.comparison.declined.length
        ? `需要继续关注：${record.comparison.declined.map((item) => `${item.label}${item.change}`).join('、')}`
        : `需要继续关注：暂无明显下降维度`,
      record.comparison.topImprovement
        ? `进步最大维度：${record.comparison.topImprovement.label}+${record.comparison.topImprovement.change}`
        : null,
      ``,
      `下一阶段建议：${report.nextSteps}`,
      `老师寄语：${teacherMessage}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `【爱高创客阶段测评报告】`,
    `${name}家长您好，孩子本次 ${courseText} 测评已完成。`,
    `课程体系：${form.courseSystem || '未填写'}`,
    `课程类型：${form.courseFormat || '未填写'}`,
    stageObservation.assessmentCycle ? `测评周期：${stageObservation.assessmentCycle}` : null,
    `阶段时间：${stageTimeText}`,
    `授课老师：${form.teacher || '未填写'}`,
    `综合得分：${summary.average.toFixed(1)} / 5`,
    ...projectLines,
    ``,
    `当前优势：孩子比较突出的地方是 ${strengths}。这些表现说明孩子在阶段学习中已经有了比较清晰的优势点。`,
    `待提升方向：接下来建议重点关注 ${improvements}。我们会在后续阶段中通过能力评分持续观察变化。`,
    ``,
    `下一阶段建议：${report.nextSteps}`,
    `老师寄语：${teacherMessage}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function getShareCardContent(record) {
  const form = getRecordForm(record);
  const stageObservation = getStageObservation(form);
  const stageTimeText = getStageTimeText(form) || '未填写';
  const scores = record.scores || emptyScores();
  const summary = getScoreSummary(scores, getRecordDimensions(record));
  const highlights = getShareAbilityHighlights(summary);
  const name = form.studentName || '未命名学员';
  const comparison = record.comparison || null;

  return {
    name,
    grade: form.grade || '未填写',
    courseSystem: form.courseSystem || '未填写',
    abilityStage: form.abilityStage || '未填写',
    courseFormat: form.courseFormat || '未填写',
    courseType: form.courseFormat || '未填写',
    courseStage: form.courseStage || form.abilityStage || '未填写',
    projectName: form.projectName || '',
    projectLearningContent: form.projectLearningContent || '',
    projectAbilities: form.projectAbilities || '',
    projectStageOutcome: form.projectStageOutcome || '',
    projectParentReportDescription: form.projectParentReportDescription || '',
    assessmentDate: stageTimeText,
    stageTime: stageTimeText,
    teacher: form.teacher || '未填写',
    score: summary.average.toFixed(1),
    isBalanced: highlights.isBalanced,
    strengths: highlights.strengths.map((item) => item.label),
    improvements: highlights.improvements.map((item) => item.label),
    cycleSummary: stageObservation.assessmentCycle ? shortenText(stageObservation.assessmentCycle, 32) : '',
    nextSteps: buildShortAdviceWithStageObservation(highlights, stageObservation),
    teacherMessage: buildShortTeacherMessage(name, highlights, stageObservation),
    comparison: comparison
      ? {
          averageChange: comparison.averageChange,
          improved: comparison.improved || [],
          declined: comparison.declined || [],
          topImprovement: comparison.topImprovement || null,
          previousAverage: comparison.previousAverage,
          currentAverage: comparison.currentAverage,
        }
      : null,
  };
}

export function buildShareCardReportText(record) {
  const content = getShareCardContent(record);

  if (content.comparison) {
    return [
      `【爱高创客阶段成长对比报告】`,
      `学员：${content.name}`,
      `年级：${content.grade}`,
      `课程体系：${content.courseSystem}`,
      `课程类型：${content.courseType}`,
      content.cycleSummary ? `测评周期：${content.cycleSummary}` : null,
      `阶段时间：${content.stageTime}`,
      `本次得分：${content.comparison.currentAverage.toFixed(1)} / 5`,
      `上次得分：${content.comparison.previousAverage.toFixed(1)} / 5`,
      `分数变化：${content.comparison.averageChange >= 0 ? '+' : ''}${content.comparison.averageChange.toFixed(1)} 分`,
      content.comparison.improved.length
        ? `进步维度：${content.comparison.improved.map((item) => `${item.label}+${item.change}`).join('、')}`
        : `进步维度：整体保持稳定`,
      content.comparison.topImprovement
        ? `进步最大维度：${content.comparison.topImprovement.label}+${content.comparison.topImprovement.change}`
        : null,
      `下一阶段建议：${content.nextSteps}`,
      `老师寄语：${content.teacherMessage}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `【爱高创客阶段能力测评报告】`,
    `学员：${content.name}`,
    `年级：${content.grade}`,
    `课程体系：${content.courseSystem}`,
    `课程类型：${content.courseType}`,
    content.cycleSummary ? `测评周期：${content.cycleSummary}` : null,
    `阶段时间：${content.stageTime}`,
    `老师：${content.teacher}`,
    `综合得分：${content.score} / 5`,
    content.comparison
      ? `相比上次：${content.comparison.averageChange >= 0 ? '+' : ''}${content.comparison.averageChange.toFixed(1)} 分`
      : null,
    content.comparison?.improved?.length
      ? `进步维度：${content.comparison.improved.map((item) => `${item.label}+${item.change}`).join('、')}`
      : null,
    content.isBalanced
      ? `能力表现：整体表现较为均衡`
      : `优势能力：${content.strengths.join('、')}`,
    content.isBalanced ? null : `待提升能力：${content.improvements.join('、')}`,
    `下一阶段建议：${content.nextSteps}`,
    `老师寄语：${content.teacherMessage}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function toRadarData(scores, dimensions = legacyAbilityDimensions) {
  return dimensions.map((dimension) => {
    const normalized = normalizeAbilityDimension(dimension);
    return {
      dimension: normalized.label,
      score: getScoreValue(scores, normalized),
      fullMark: 5,
    };
  });
}
