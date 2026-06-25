import { ArrowLeft, Database, Save, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import HistoryList from './components/HistoryList.jsx';
import ParentShareCard from './components/ParentShareCard.jsx';
import ProjectLibrary from './components/ProjectLibrary.jsx';
import RadarScoreChart from './components/RadarScoreChart.jsx';
import ReportPhotoFrame, { defaultReportPhotoCrop, normalizeReportPhotoCrop } from './components/ReportPhotoFrame.jsx';
import RobotSpecialTestDemo from './components/RobotSpecialTestDemo.jsx';
import ScoreInput from './components/ScoreInput.jsx';
import TrialClassFeedback from './components/TrialClassFeedback.jsx';
import FeatureCards from './components/home/FeatureCards.jsx';
import HomeHeader from './components/home/HomeHeader.jsx';
import SecondaryMenu from './components/home/SecondaryMenu.jsx';
import {
  getAbilityDimensions,
  getDimensionId,
  grades,
} from './constants/assessment.js';
import {
  deleteProject,
  deleteRecord,
  deleteTrialClassRecord,
  loadProjects,
  loadRecords,
  loadTrialClassRecords,
  saveProject,
  saveRecord,
  saveTrialClassRecord,
} from './services/storage.js';
import {
  createEmptyScores,
  generateReport,
  getScoreSummary,
  getScoreValue,
} from './utils/report.js';

const routePaths = new Set(['/', '/report', '/report/preview', '/trial', '/lab', '/history', '/library']);

const initialForm = {
  studentName: '',
  grade: '',
  courseSystem: '',
  abilityStage: '',
  projectIds: [],
  projectId: '',
  projectName: '',
  projectLearningContent: '',
  projectAbilities: '',
  projectParentReportDescription: '',
  stageStartDate: '',
  stageEndDate: '',
  assessmentDate: '',
  teacher: '',
  stageObservation: {
    assessmentCycle: '',
    teacherComment: '',
  },
};

function createRecord(form, currentAssessment, report, comparisonAssessment) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    form: { ...form },
    scores: { ...currentAssessment.scores },
    dimensions: currentAssessment.dimensions,
    comparison: comparisonAssessment,
    report: { ...report },
  };
}

function getTimeValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function getRecordSortValues(record) {
  const assessmentTime = getTimeValue(
    record?.form?.stageEndDate ||
      record?.form?.stageStartDate ||
      record?.form?.assessmentDate ||
      record?.assessmentDate,
  );
  const createdTime = record?.createdAt ? new Date(record.createdAt).getTime() : 0;
  return {
    assessmentTime,
    createdTime: Number.isNaN(createdTime) ? 0 : createdTime,
  };
}

function sortAssessmentRecords(records) {
  return [...records].sort((a, b) => {
    const aValues = getRecordSortValues(a);
    const bValues = getRecordSortValues(b);
    return bValues.assessmentTime - aValues.assessmentTime || bValues.createdTime - aValues.createdTime;
  });
}

function normalizeRoute(path) {
  const cleanPath = path.replace(/\/+$/, '') || '/';
  return routePaths.has(cleanPath) ? cleanPath : '/';
}

function getRouteFromLocation() {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  let path = window.location.pathname;

  if (normalizedBase !== '/' && path.startsWith(normalizedBase)) {
    path = `/${path.slice(normalizedBase.length)}`;
  }

  return normalizeRoute(path);
}

function getUrlForRoute(path) {
  const base = import.meta.env.BASE_URL || '/';
  if (base === '/') return path;
  return `${base.replace(/\/$/, '')}${path}`;
}

function clearSelectedProjectFields(form) {
  return {
    ...form,
    projectIds: [],
    projectId: '',
    projectName: '',
    projectLearningContent: '',
    projectAbilities: '',
    projectParentReportDescription: '',
  };
}

function splitProjectText(value = '') {
  return value
    .split(/[、,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueProjectItems(items) {
  return [...new Set(items.filter(Boolean))];
}

function summarizeProjects(selectedProjects) {
  const projectNames = selectedProjects.map((project) => project.projectName).filter(Boolean);
  const learningItems = uniqueProjectItems(selectedProjects.flatMap((project) => splitProjectText(project.learningContent)));
  const abilityItems = uniqueProjectItems(selectedProjects.flatMap((project) => splitProjectText(project.relatedAbilities)));
  const parentParagraphs = selectedProjects
    .filter((project) => project.parentReportDescription)
    .map((project) => `【${project.projectName || '学习内容'}】${project.parentReportDescription}`);

  return {
    projectIds: selectedProjects.map((project) => project.id),
    projectId: selectedProjects[0]?.id || '',
    projectName: projectNames.join('、'),
    projectLearningContent: learningItems.join('、'),
    projectAbilities: abilityItems.join('、'),
    projectParentReportDescription: parentParagraphs.join('\n'),
  };
}

function collectSummaryKeywords(...values) {
  const rawText = values.join('、');
  const knownProjectPatterns = [
    /[一二三四五六七八九十\d]+轴机械臂/g,
    /笛卡尔机械臂/g,
    /火星家园挑战/g,
    /机械臂抓举/g,
    /机械臂控制算法/g,
    /资源运输(?:任务|项目)?/g,
    /机械臂装车(?:实测|任务)?/g,
  ];
  const knownItems = knownProjectPatterns.flatMap((pattern) => rawText.match(pattern) || []);
  const shortItems = rawText
    .split(/[、,，;；\n。！？\s]+/)
    .map((item) =>
      item
        .replace(/^【.*?】/, '')
        .replace(/^(本阶段|本学期|学习内容|家长报告描述|家长报告|整体来看|后续可以|后续可|我们|围绕|通过|同时|又)/, '')
        .replace(/(展开|进行|认识了|学习了|接触了|训练|练习|实测).*$/, '')
        .replace(/各类/g, '')
        .replace(/项目$/, '任务')
        .trim(),
    )
    .filter((item) => item.length >= 2 && item.length <= 24)
    .filter((item) => !/(老师引导|家长反馈|阶段学习成果|持续学习与实践|综合输出|孩子|学员|理解|参与度|完成了|能完成|比较|较快|独立|稳定|合作|后续|课堂)/.test(item));

  return uniqueProjectItems([...knownItems, ...shortItems]).slice(0, 8);
}

function splitTeacherSentences(...values) {
  return values
    .join('。')
    .split(/[。！？\n]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function findStudentAlias(form, sentences) {
  const explicitName = form.studentName?.trim();
  if (explicitName) return explicitName;

  const aliasSentence = sentences.find((sentence) => /^[\u4e00-\u9fa5]{2,4}(能|在|参与|完成|理解|表现|可以|对)/.test(sentence));
  const alias = aliasSentence?.match(/^([\u4e00-\u9fa5]{2,4})(?=能|在|参与|完成|理解|表现|可以|对)/)?.[1];
  return alias && !['孩子', '学员', '老师', '课程'].includes(alias) ? alias : '孩子';
}

function extractBehaviorNotes(sentences) {
  return sentences
    .filter((sentence) => /(能|完成|理解|参与|合作|稳定|调试|制作|表达|复盘|加强|较快|比较快|投入)/.test(sentence))
    .map((sentence) =>
      sentence
        .replace(/^(家长报告描述|学习内容总结|本学期典型课程|本学期课程列表|摘要)[:：]?/, '')
        .trim(),
    )
    .filter((sentence) => sentence.length >= 6 && sentence.length <= 70)
    .slice(0, 2);
}

function inferLearningTheme(keywords) {
  const text = keywords.join('、');

  if (/机械臂|抓举|笛卡尔|三轴/.test(text)) {
    return {
      topic: '机械臂结构与控制',
      shortTopic: '机械臂类',
      knowledge: '机械臂的运动方式、抓取结构、任务执行流程以及基础控制算法',
      relation: '结构设计、程序控制和任务目标之间的关系',
      review: '结构稳定性、动作顺序和程序控制',
    };
  }

  if (/Arduino|电路|传感器|模块|灯|声|电机/.test(text)) {
    return {
      topic: '电子模块与程序控制',
      shortTopic: '电子创客',
      knowledge: '基础电路连接、模块功能、传感器反馈和程序控制逻辑',
      relation: '硬件连接、程序指令和实际效果之间的关系',
      review: '连接稳定性、程序顺序和问题排查',
    };
  }

  if (/三维|建模|模型|打印|结构|尺寸/.test(text)) {
    return {
      topic: '三维建模与结构设计',
      shortTopic: '三维设计',
      knowledge: '空间结构、工具操作、尺寸意识和模型优化方法',
      relation: '设计想法、模型结构和实际成品之间的关系',
      review: '比例关系、结构合理性和细节表达',
    };
  }

  return {
    topic: '项目任务与创客实践',
    shortTopic: '创客项目',
    knowledge: '任务理解、方案设计、动手操作和基础调试方法',
    relation: '项目目标、操作步骤和作品效果之间的关系',
    review: '任务规划、操作细节和复盘表达',
  };
}

function formatKeywordSummary(keywords) {
  return keywords.join('、');
}

function hasConcreteBehavior(sentences) {
  return sentences.some((sentence) => /(在.+(?:项目|任务|挑战)|完成|制作|调试|结构稳定|控制方式|参与度|合作项目|复盘|表达)/.test(sentence));
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromLocation);
  const [form, setForm] = useState(initialForm);
  const [scores, setScores] = useState(() => createEmptyScores(getAbilityDimensions(initialForm.courseSystem)));
  const [records, setRecords] = useState(loadRecords);
  const [projects, setProjects] = useState(loadProjects);
  const [trialClassRecords, setTrialClassRecords] = useState(loadTrialClassRecords);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [notice, setNotice] = useState('');
  const [summaryPolishStatus, setSummaryPolishStatus] = useState('idle');
  const [summaryPolishHint, setSummaryPolishHint] = useState('');
  const [highlightPhoto, setHighlightPhoto] = useState(null);
  const [highlightPhotoNotice, setHighlightPhotoNotice] = useState('');
  const highlightPhotoDragRef = useRef(null);

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteFromLocation());
      window.scrollTo(0, 0);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigateTo(path) {
    const nextRoute = normalizeRoute(path);
    window.history.pushState({}, '', getUrlForRoute(nextRoute));
    setRoute(nextRoute);
    window.scrollTo(0, 0);
  }

  const currentDimensions = useMemo(() => getAbilityDimensions(form.courseSystem), [form.courseSystem]);
  const currentAssessment = useMemo(
    () => ({
      scores,
      dimensions: currentDimensions,
    }),
    [scores, currentDimensions],
  );
  const summary = useMemo(() => getScoreSummary(scores, currentDimensions), [scores, currentDimensions]);
  const availableProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesGrade = !form.grade || project.applicableGrade === form.grade;
        const matchesSystem = !form.courseSystem || project.courseSystem === form.courseSystem;
        return matchesGrade && matchesSystem;
      }),
    [form.courseSystem, form.grade, projects],
  );
  const report = useMemo(
    () => generateReport(form, scores, currentDimensions, null),
    [form, scores, currentDimensions],
  );
  const filteredRecords = useMemo(() => {
    const keyword = searchName.trim().toLowerCase();
    if (!keyword) return records;
    return records.filter((record) => (record.form.studentName || '').toLowerCase().includes(keyword));
  }, [records, searchName]);

  function updateForm(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      return field === 'grade' && value !== current.grade ? clearSelectedProjectFields(next) : next;
    });
  }

  function updateStageDate(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      return {
        ...next,
        assessmentDate: next.stageEndDate || next.stageStartDate || current.assessmentDate,
      };
    });
  }

  function updateProjectField(field, value) {
    if (field === 'projectParentReportDescription') {
      setSummaryPolishHint('');
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleProjectToggle(projectId) {
    setForm((current) => {
      const currentProjectIds = Array.isArray(current.projectIds)
        ? current.projectIds
        : current.projectId
          ? [current.projectId]
          : [];
      const nextProjectIds = currentProjectIds.includes(projectId)
        ? currentProjectIds.filter((id) => id !== projectId)
        : [...currentProjectIds, projectId];
      const selectedProjects = projects.filter((project) => nextProjectIds.includes(project.id));

      return {
        ...current,
        ...summarizeProjects(selectedProjects),
      };
    });
  }

  function updateScore(key, value) {
    setScores((current) => ({ ...current, [key]: value }));
  }

  function handleHighlightPhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setHighlightPhotoNotice('');

    if (!file) return;

    const isHeic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/i.test(file.type);
    if (isHeic) {
      setHighlightPhoto(null);
      setHighlightPhotoNotice('电脑端可能无法预览 iPhone 原图 HEIC，建议用手机端上传或转为 JPG。');
      return;
    }

    if (!/image\/(jpeg|png|webp)/i.test(file.type)) {
      setHighlightPhotoNotice('请上传 JPG、PNG 或 WEBP 格式的图片。');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const image = new Image();
      image.onload = () => {
        setHighlightPhoto({
          dataUrl,
          name: file.name,
          orientation: image.naturalWidth >= image.naturalHeight ? 'landscape' : 'portrait',
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          crop: defaultReportPhotoCrop,
        });
      };
      image.onerror = () => setHighlightPhotoNotice('图片预览失败，请重新选择 JPG、PNG 或 WEBP 图片。');
      image.src = dataUrl;
    };
    reader.onerror = () => setHighlightPhotoNotice('图片读取失败，请重新选择。');
    reader.readAsDataURL(file);
  }

  function clearHighlightPhoto() {
    setHighlightPhoto(null);
    setHighlightPhotoNotice('');
    highlightPhotoDragRef.current = null;
  }

  function updateHighlightPhotoCrop(nextCrop) {
    setHighlightPhoto((current) => {
      if (!current) return current;
      return {
        ...current,
        crop: normalizeReportPhotoCrop({
          ...(current.crop || defaultReportPhotoCrop),
          ...nextCrop,
        }),
      };
    });
  }

  function resizeHighlightPhoto(delta) {
    setHighlightPhoto((current) => {
      if (!current) return current;
      const crop = normalizeReportPhotoCrop(current.crop || defaultReportPhotoCrop);
      return {
        ...current,
        crop: normalizeReportPhotoCrop({
          ...crop,
          scale: crop.scale + delta,
        }),
      };
    });
  }

  function resetHighlightPhotoCrop() {
    updateHighlightPhotoCrop(defaultReportPhotoCrop);
  }

  function startHighlightPhotoDrag(event) {
    if (!highlightPhoto) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const crop = normalizeReportPhotoCrop(highlightPhoto.crop || defaultReportPhotoCrop);
    highlightPhotoDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: crop.offsetX,
      startOffsetY: crop.offsetY,
      width: bounds.width || 1,
      height: bounds.height || 1,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveHighlightPhotoDrag(event) {
    const drag = highlightPhotoDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const offsetX = drag.startOffsetX + ((event.clientX - drag.startX) / drag.width) * 100;
    const offsetY = drag.startOffsetY + ((event.clientY - drag.startY) / drag.height) * 100;
    updateHighlightPhotoCrop({ offsetX, offsetY });
  }

  function endHighlightPhotoDrag(event) {
    if (highlightPhotoDragRef.current?.pointerId === event.pointerId) {
      highlightPhotoDragRef.current = null;
    }
  }

  function handlePolishLearningSummary() {
    setSummaryPolishStatus('working');
    setSummaryPolishHint('');

    window.setTimeout(() => {
      setForm((current) => {
        const dimensions = getAbilityDimensions(current.courseSystem);
        const scoreSummary = getScoreSummary(scores, dimensions);
        const teacherSentences = splitTeacherSentences(
          current.projectName,
          current.projectLearningContent,
          current.projectParentReportDescription,
        );
        const keywords = collectSummaryKeywords(
          current.projectName,
          current.projectLearningContent,
          current.projectParentReportDescription,
        );
        const theme = inferLearningTheme(keywords);
        const keywordText = keywords.length ? formatKeywordSummary(keywords) : current.projectName.trim();
        const studentAlias = findStudentAlias(current, teacherSentences);
        const behaviorNotes = extractBehaviorNotes(teacherSentences);
        const hasDetails = hasConcreteBehavior(teacherSentences);
        const strengthsText = scoreSummary.strengths.slice(0, 2).map((item) => item.label).join('、');
        const improvementsText = scoreSummary.improvements.slice(0, 2).map((item) => item.label).join('、');
        const representativeProject = keywords.find((item) => /项目|挑战|任务|机械臂|运输|笛卡尔/.test(item)) || theme.shortTopic;
        const behaviorText = behaviorNotes.length ? behaviorNotes.join('；') : '';
        const strengthSentence = strengthsText ? `也能看出${strengthsText}方面有一些比较稳定的基础` : '课堂中能跟上任务节奏';
        const improvementSentence = improvementsText
          ? `后续可以继续加强${improvementsText}，尤其是完成作品后的复盘表达`
          : `后续可以继续加强调试和复盘表达`;

        const polishedProjectName = keywordText || current.projectName;
        const learningContent = `本阶段课程主要围绕${theme.topic}展开，重点接触了${keywords.slice(0, 3).join('、') || theme.shortTopic}等内容。学习过程中，孩子逐步理解了${theme.knowledge}，也开始把${theme.relation}联系起来。`;
        const parentDescription = hasDetails
          ? `这学期${studentAlias}在${representativeProject}相关任务中有比较具体的表现：${behaviorText}。从这些细节能看出，${studentAlias}对${theme.review}有了更实际的理解，${strengthSentence}。${improvementSentence}，把“为什么这样做、哪里还能改”说得更清楚。`
          : `本阶段可以看出${studentAlias}对${theme.topic}相关内容接受较快，课堂中能较快理解任务要求并跟上操作节奏。${improvementSentence}，如果能结合一个具体项目说明自己的设计思路和调整过程，反馈会更有说服力。`;

        setSummaryPolishHint(
          hasDetails
            ? ''
            : '建议补充一个具体项目或课堂表现，生成的家长反馈会更有针对性。',
        );

        return {
          ...current,
          projectName: polishedProjectName || current.projectName,
          projectLearningContent: learningContent,
          projectParentReportDescription: parentDescription,
        };
      });
      setSummaryPolishStatus('done');
    }, 300);
  }

  function handleSave() {
    const requiredFieldsMissing =
      !form.studentName.trim() || !form.grade || !form.projectParentReportDescription.trim();

    if (requiredFieldsMissing) {
      setNotice('请先填写学员姓名、年级和学习报告内容，再生成分享卡片。');
      return;
    }

    const normalizedForm = {
      ...form,
      startDate: form.stageStartDate,
      endDate: form.stageEndDate,
      assessmentDate: form.stageEndDate || form.stageStartDate || form.assessmentDate,
    };
    const record = createRecord(normalizedForm, currentAssessment, report, null);
    const nextRecords = saveRecord(record);
    setRecords(nextRecords);
    setSelectedRecord(record);
    setNotice('');
    navigateTo('/report/preview');
  }

  function handleOpenReport(record) {
    setSelectedRecord(record);
    setHighlightPhoto(null);
    navigateTo('/report/preview');
  }

  function handleDelete(recordId) {
    const target = records.find((record) => record.id === recordId);
    const ok = window.confirm(`确认删除 ${target?.form.studentName || '该学员'} 的这条测评记录吗？`);
    if (!ok) return;

    const nextRecords = deleteRecord(recordId);
    setRecords(nextRecords);
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(null);
      navigateTo('/history');
    }
    setNotice('记录已删除。');
  }

  function handleSaveProject(project) {
    const nextProjects = saveProject(project);
    setProjects(nextProjects);
    setNotice('项目资料已保存。');
  }

  function handleDeleteProject(projectId) {
    const nextProjects = deleteProject(projectId);
    setProjects(nextProjects);
    const selectedProjectIds = Array.isArray(form.projectIds) ? form.projectIds : form.projectId ? [form.projectId] : [];
    if (selectedProjectIds.includes(projectId)) {
      setForm((current) => clearSelectedProjectFields(current));
    }
    setNotice('项目资料已删除。');
  }

  function handleSaveTrialClassRecord(record) {
    const result = saveTrialClassRecord(record);
    if (!result?.success || !result?.data?.id) {
      throw new Error(result?.error || '试听课记录保存失败，请稍后重试。');
    }
    setTrialClassRecords(result.records);
    setNotice('试听课记录已保存。');
    return result;
  }

  function handleDeleteTrialClassRecord(recordId) {
    const nextRecords = deleteTrialClassRecord(recordId);
    setTrialClassRecords(nextRecords);
    setNotice('试听课记录已删除。');
  }

  function renderHome() {
    return (
      <section className="homeDashboard">
        <HomeHeader />
        <FeatureCards onNavigate={navigateTo} />
        <SecondaryMenu onNavigate={navigateTo} />
      </section>
    );
  }

  function renderReportBuilder() {
    const selectedProjectCount = Array.isArray(form.projectIds) ? form.projectIds.length : form.projectId ? 1 : 0;

    return (
      <section className="reportBuilderPage">
        <section className="reportBuilderModule">
          <div className="panelHeader">
            <h2>学员基础信息</h2>
            <span>阶段报告</span>
          </div>

          <div className="formGrid reportBasicGrid">
            <label>
              姓名
              <input
                value={form.studentName}
                onChange={(event) => updateForm('studentName', event.target.value)}
                placeholder="请输入学员姓名"
              />
            </label>
            <label>
              年级
              <select value={form.grade} onChange={(event) => updateForm('grade', event.target.value)}>
                <option value="">请选择年级</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label>
              授课老师
              <input
                value={form.teacher}
                onChange={(event) => updateForm('teacher', event.target.value)}
                placeholder="请输入授课老师姓名"
              />
            </label>
            <div className="learningPeriodField">
              学习周期
              <div>
                <label>
                  开始日期
                  <input
                    type="date"
                    value={form.stageStartDate}
                    onChange={(event) => updateStageDate('stageStartDate', event.target.value)}
                  />
                </label>
                <label>
                  结束日期
                  <input
                    type="date"
                    value={form.stageEndDate}
                    onChange={(event) => updateStageDate('stageEndDate', event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="highlightPhotoField">
              <div>
                <strong>本学期靓照</strong>
                <span>上传一张本学期最有代表性的课堂照片或作品照片，横版、竖版均可。</span>
              </div>
              <label className="photoUploadButton">
                上传照片
                <input accept="image/jpeg,image/png,image/webp,.heic,.heif" type="file" onChange={handleHighlightPhotoChange} />
              </label>
              {highlightPhoto && (
                <div className="highlightPhotoCropEditor">
                  <div className="highlightPhotoCropHeader">
                    <div>
                      <strong>本学期靓照调整</strong>
                      <span>拖动照片调整显示区域，可适当放大或缩小。</span>
                    </div>
                    <button className="secondaryButton" type="button" onClick={clearHighlightPhoto}>
                      删除照片
                    </button>
                  </div>
                  <ReportPhotoFrame
                    alt="本学期靓照调整预览"
                    className="highlightPhotoCropViewport"
                    interactive
                    onPointerCancel={endHighlightPhotoDrag}
                    onPointerDown={startHighlightPhotoDrag}
                    onPointerMove={moveHighlightPhotoDrag}
                    onPointerUp={endHighlightPhotoDrag}
                    photo={highlightPhoto}
                  />
                  <div className="highlightPhotoCropControls">
                    <button className="secondaryButton" type="button" onClick={() => resizeHighlightPhoto(-0.1)}>
                      缩小
                    </button>
                    <button className="secondaryButton" type="button" onClick={() => resizeHighlightPhoto(0.1)}>
                      放大
                    </button>
                    <button className="secondaryButton" type="button" onClick={resetHighlightPhotoCrop}>
                      重置
                    </button>
                  </div>
                </div>
              )}
              {highlightPhotoNotice && <span className="fieldHint warning">{highlightPhotoNotice}</span>}
            </div>
          </div>
        </section>

        <section className="reportBuilderModule">
          <div className="panelHeader reportSummaryHeader">
            <div>
              <h2>学习内容 & 项目总结</h2>
              <span>{availableProjects.length ? `${availableProjects.length} 个课程内容 · 已选 ${selectedProjectCount}` : '手动填写'}</span>
            </div>
            <button
              className={`summaryPolishButton ${summaryPolishStatus === 'done' ? 'done' : ''}`}
              type="button"
              onClick={handlePolishLearningSummary}
              disabled={summaryPolishStatus === 'working'}
            >
              {summaryPolishStatus === 'working'
                ? '正在整理...'
                : summaryPolishStatus === 'done'
                  ? '已整理，可继续修改'
                  : '一键整理学习总结'}
            </button>
          </div>

          <div className="projectMultiSelect reportCourseList" aria-label="本学期课程列表">
            {availableProjects.map((project) => {
              const selectedProjectIds = Array.isArray(form.projectIds)
                ? form.projectIds
                : form.projectId
                  ? [form.projectId]
                  : [];
              const isSelected = selectedProjectIds.includes(project.id);
              return (
                <button
                  className={`projectSelectOption ${isSelected ? 'active' : ''}`}
                  key={project.id}
                  type="button"
                  onClick={() => handleProjectToggle(project.id)}
                >
                  <strong>{project.projectName}</strong>
                  <span>{project.learningContent || '暂无学习内容描述'}</span>
                </button>
              );
            })}
          </div>

          {!availableProjects.length && (
            <div className="comparisonNotice">暂无可选课程内容，可直接手动填写本学期典型课程和项目。</div>
          )}

          <div className="reportSummaryGrid">
            <label>
              本学期典型课程 / 项目
              <textarea
                value={form.projectName}
                onChange={(event) => updateProjectField('projectName', event.target.value)}
                placeholder="例如：三轴机械臂、笛卡尔机械臂、火星家园挑战、机械臂抓举"
              />
            </label>
            <label>
              学习内容总结
              <textarea
                value={form.projectLearningContent}
                onChange={(event) => updateProjectField('projectLearningContent', event.target.value)}
                placeholder="概括本阶段学习主题、项目任务和完成情况"
              />
            </label>
            <label>
              家长报告描述
              <textarea
                value={form.projectParentReportDescription}
                onChange={(event) => updateProjectField('projectParentReportDescription', event.target.value)}
                placeholder={`建议围绕一个具体项目来写，例如：
在某个项目中，孩子做了什么？体现出什么能力？后续可以继续加强什么？`}
              />
              {summaryPolishHint && <span className="fieldHint warning">{summaryPolishHint}</span>}
            </label>
          </div>
        </section>

        <section className="reportBuilderModule">
          <div className="panelHeader">
            <h2>阶段能力雷达图 + 评价</h2>
            <span>{currentDimensions.length} 维能力画像</span>
          </div>

          <div className="reportAbilityGrid">
            <div className="scoreSection reportScorePanel">
              {currentDimensions.map((dimension) => (
                <ScoreInput
                  key={getDimensionId(dimension)}
                  dimension={dimension}
                  value={getScoreValue(scores, dimension)}
                  onChange={updateScore}
                />
              ))}
            </div>

            <div className="reportEvaluationPanel">
              <h3>阶段能力画像</h3>
              <RadarScoreChart currentAssessment={currentAssessment} comparisonAssessment={null} />
            </div>

            <div className="reportBuilderActions">
              <button className="primaryButton" type="button" onClick={handleSave}>
                <Save size={18} />
                保存并预览分享卡片
              </button>
              {notice && <div className="notice">{notice}</div>}
            </div>
          </div>
        </section>
      </section>
    );
  }

  function renderAssessment() {
    return renderReportBuilder();
  }

  function renderHistory() {
    return (
      <section className="pagePanel">
        <div className="pageTopbar">
          <button className="secondaryButton" type="button" onClick={() => navigateTo('/')}>
            <ArrowLeft size={18} />
            返回首页
          </button>
          <div>
            <span>共 {records.length} 条记录</span>
            <h1>历史测评记录</h1>
          </div>
        </div>

        {notice && <div className="notice standalone">{notice}</div>}

        <div className="historyToolbar">
          <label className="searchBox">
            <Search size={18} />
            <input
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              placeholder="按学员姓名搜索"
            />
          </label>
          <div className="storageHint inline">
            <Database size={16} />
            数据保存在浏览器 localStorage，刷新页面后仍然存在。
          </div>
        </div>

        <HistoryList records={filteredRecords} onOpenReport={handleOpenReport} onDelete={handleDelete} />
      </section>
    );
  }

  function renderReport() {
    const record = selectedRecord || records[0];
    if (!record) {
      return (
        <section className="pagePanel">
          <div className="emptyState">
            <strong>还没有可查看的报告</strong>
            <span>请先保存一条测评记录。</span>
          </div>
          <button className="primaryButton narrow" type="button" onClick={() => navigateTo('/report')}>
            返回报告系统
          </button>
        </section>
      );
    }

    return (
      <section className="reportPage">
        {notice && <div className="notice standalone">{notice}</div>}
        <ParentShareCard
          record={record}
          onBackEdit={() => navigateTo('/report')}
          highlightPhoto={highlightPhoto}
        />
      </section>
    );
  }

  return (
    <main className="appShell">
      {route === '/' && renderHome()}
      {route === '/report' && renderAssessment()}
      {route === '/history' && renderHistory()}
      {route === '/library' && (
        <ProjectLibrary
          projects={projects}
          notice={notice}
          onBack={() => navigateTo('/')}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}
      {route === '/report/preview' && renderReport()}
      {route === '/trial' && (
        <TrialClassFeedback
          projects={projects}
          records={trialClassRecords}
          notice={notice}
          onBack={() => navigateTo('/')}
          onSave={handleSaveTrialClassRecord}
          onDelete={handleDeleteTrialClassRecord}
        />
      )}
      {route === '/lab' && <RobotSpecialTestDemo onBack={() => navigateTo('/')} />}
    </main>
  );
}
