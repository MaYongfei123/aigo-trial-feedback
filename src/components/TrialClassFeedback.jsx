import { ArrowLeft, CheckCircle2, ClipboardCopy, Database, Download, Edit3, ImagePlus, Minus, Plus, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { courseSystems, grades } from '../constants/assessment.js';

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  id: '',
  createdAt: '',
  studentName: '',
  grade: '',
  courseSystem: '',
  courseName: '',
  lessonDate: today,
  photoUrls: [],
  learningContent: '',
  performanceDescription: '',
  abilityObservation: '',
  strengths: '',
  improvements: '',
  nextSuggestion: '',
};

const courseDefaults = {
  机器人: {
    action: '完成结构搭建、测试和调整',
    concept: '结构传动、重心变化与任务执行',
    performance: '表现出较强的动手兴趣，愿意尝试不同结构方案，并能在老师引导下观察测试结果。',
    strengths: '动手积极性较高，能够较快进入任务状态，对作品效果有明显兴趣。',
    improvements: '后续可以继续加强结构稳定性和测试后复盘表达。',
    suggestion: '建议进入机器人基础阶段，通过更多结构任务与简单控制任务逐步建立系统能力。',
    abilities: ['结构理解能力：较好', '动手执行能力：较强', '程序理解能力：初步建立'],
  },
  Arduino: {
    action: '连接电子模块并完成互动作品',
    concept: '输入输出模块、电路连接与基础程序逻辑',
    performance: '能够保持较好的好奇心，愿意观察模块变化，并尝试理解程序和硬件之间的关系。',
    strengths: '对电子模块反馈较敏感，愿意主动观察现象并跟随步骤完成连接。',
    improvements: '后续可以继续加强程序语句和电路连接之间的对应理解。',
    suggestion: '建议进入 Arduino 基础阶段，从传感器、灯光和声音任务开始建立项目化思维。',
    abilities: ['电路连接能力：初步建立', '模块理解能力：较好', '程序逻辑能力：持续观察'],
  },
  三维设计: {
    action: '完成三维作品建模与展示',
    concept: '空间方位、基础建模工具与作品优化',
    performance: '对作品呈现有较强兴趣，能够跟随步骤完成基础造型，并愿意对细节进行调整。',
    strengths: '作品表达意愿较强，能够关注模型外观和细节变化。',
    improvements: '后续可以继续加强尺寸意识、空间关系和工具操作熟练度。',
    suggestion: '建议进入三维设计基础阶段，通过主题建模任务提升空间理解和工具熟练度。',
    abilities: ['空间理解能力：较好', '工具操作能力：初步建立', '作品表达能力：较强'],
  },
};

function splitTextItems(value = '') {
  return value
    .split(/[、,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRecord(record = {}) {
  return {
    ...record,
    id: record.id || record.recordId || '',
    recordId: record.recordId || record.id || '',
    lessonDate: record.lessonDate || record.trialDate || today,
    photoUrls: Array.isArray(record.photoUrls) ? record.photoUrls : record.photoUrl ? [record.photoUrl] : [],
    strengths: record.strengths || '',
    improvements: record.improvements || '',
  };
}

function findMatchedProject(projects, form) {
  const courseName = form.courseName.trim().toLowerCase();
  if (!courseName) return null;

  return (
    projects.find((project) => {
      const matchesName = (project.projectName || '').trim().toLowerCase() === courseName;
      const matchesSystem = !form.courseSystem || project.courseSystem === form.courseSystem;
      return matchesName && matchesSystem;
    }) ||
    projects.find((project) => {
      const projectName = (project.projectName || '').trim().toLowerCase();
      const matchesName = projectName && (projectName.includes(courseName) || courseName.includes(projectName));
      const matchesSystem = !form.courseSystem || project.courseSystem === form.courseSystem;
      return matchesName && matchesSystem;
    })
  );
}

function buildTrialFeedback(form, matchedProject) {
  const defaults = courseDefaults[form.courseSystem] || courseDefaults.机器人;
  const courseName = form.courseName.trim() || matchedProject?.projectName || '试听课程';
  const learningSource = matchedProject?.learningContent || defaults.concept;
  const abilityItems = splitTextItems(matchedProject?.relatedAbilities).slice(0, 3);
  const observationItems = abilityItems.length
    ? abilityItems.map((item, index) => `${item}：${index === 0 ? '较好' : index === 1 ? '较强' : '初步建立'}`)
    : defaults.abilities;
  const nextSuggestion = matchedProject?.stageOutcome
    ? `${matchedProject.stageOutcome} 后续建议继续通过同体系任务巩固课堂中观察到的能力亮点。`
    : defaults.suggestion;

  const generated = {
    learningContent: `本节课通过「${courseName}」任务，学习了${learningSource}，并在课堂中${defaults.action}。`,
    performanceDescription: `${form.studentName.trim() || '孩子'}在课堂中${defaults.performance}`,
    abilityObservation: observationItems.join('\n'),
    strengths: defaults.strengths,
    improvements: defaults.improvements,
    nextSuggestion,
  };

  return generated;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败，请重新选择图片。'));
    image.src = src;
  });
}

async function compressImageFile(file) {
  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceUrl);
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('图片处理失败，请重新选择图片。');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

const cropWidth = 1200;
const cropHeight = 750;

async function renderCroppedDataUrl(sourceDataUrl, crop) {
  const image = await loadImage(sourceDataUrl);
  const baseScale = Math.max(cropWidth / image.naturalWidth, cropHeight / image.naturalHeight);
  const scale = baseScale * crop.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const maxOffsetX = Math.max(0, (drawWidth - cropWidth) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - cropHeight) / 2);
  const offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, crop.offsetX));
  const offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, crop.offsetY));
  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('图片裁剪失败，请重新选择图片。');
  context.fillStyle = '#eef5fc';
  context.fillRect(0, 0, cropWidth, cropHeight);
  context.drawImage(
    image,
    (cropWidth - drawWidth) / 2 + offsetX,
    (cropHeight - drawHeight) / 2 + offsetY,
    drawWidth,
    drawHeight,
  );
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.84),
    crop: { ...crop, offsetX, offsetY },
  };
}

async function createPhotoItem(sourceDataUrl) {
  const crop = { zoom: 1, offsetX: 0, offsetY: 0 };
  const rendered = await renderCroppedDataUrl(sourceDataUrl, crop);
  return {
    id: crypto.randomUUID(),
    sourceDataUrl,
    croppedDataUrl: rendered.dataUrl,
    ...rendered.crop,
  };
}

function wrapCanvasText(context, text, maxWidth) {
  const lines = [];
  String(text || '未填写')
    .split('\n')
    .forEach((paragraph) => {
      if (!paragraph) {
        lines.push('');
        return;
      }
      let line = '';
      Array.from(paragraph).forEach((character) => {
        const nextLine = line + character;
        if (line && context.measureText(nextLine).width > maxWidth) {
          lines.push(line);
          line = character;
        } else {
          line = nextLine;
        }
      });
      if (line) lines.push(line);
    });
  return lines.length ? lines : ['未填写'];
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.lineTo(x + width - corner, y);
  context.quadraticCurveTo(x + width, y, x + width, y + corner);
  context.lineTo(x + width, y + height - corner);
  context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  context.lineTo(x + corner, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - corner);
  context.lineTo(x, y + corner);
  context.quadraticCurveTo(x, y, x + corner, y);
  context.closePath();
}

function drawCanvasSection(context, section, x, y, width) {
  const horizontalPadding = 34;
  const verticalPadding = 30;
  const titleLineHeight = 42;
  const bodyLineHeight = 48;
  context.font = '700 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  const titleLines = wrapCanvasText(context, section.title, width - horizontalPadding * 2);
  context.font = '400 27px "PingFang SC", "Microsoft YaHei", sans-serif';
  const bodyLines = wrapCanvasText(context, section.body, width - horizontalPadding * 2);
  const height =
    verticalPadding * 2 +
    titleLines.length * titleLineHeight +
    14 +
    bodyLines.length * bodyLineHeight;

  context.fillStyle = '#f8fbfe';
  context.strokeStyle = '#dce8f2';
  context.lineWidth = 2;
  drawRoundedRect(context, x, y, width, height, 14);
  context.fill();
  context.stroke();

  let textY = y + verticalPadding;
  context.textBaseline = 'top';
  context.fillStyle = '#164a86';
  context.font = '700 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  titleLines.forEach((line) => {
    context.fillText(line, x + horizontalPadding, textY);
    textY += titleLineHeight;
  });

  textY += 14;
  context.fillStyle = '#344b63';
  context.font = '400 27px "PingFang SC", "Microsoft YaHei", sans-serif';
  bodyLines.forEach((line) => {
    context.fillText(line, x + horizontalPadding, textY);
    textY += bodyLineHeight;
  });

  return height;
}

async function createTrialShareCanvas(record, cardData, photos) {
  const width = 1200;
  const outerMargin = 40;
  const qrSize = 120;
  const cardX = 40;
  const cardY = 200;
  const cardWidth = width - cardX * 2;
  const cardPadding = 30;
  const contentX = cardX + cardPadding;
  const contentWidth = cardWidth - cardPadding * 2;
  const sectionGap = 22;
  const sections = [
    { title: '本节课学习内容', body: record.learningContent },
    { title: '课堂表现', body: record.performanceDescription },
    { title: '能力观察点', body: splitTextItems(record.abilityObservation).map((item) => `• ${item}`).join('\n') },
    { title: '教师评价', body: `优点：${record.strengths || '未填写'}\n不足：${record.improvements || '未填写'}` },
    { title: '后续学习建议', body: record.nextSuggestion },
  ];
  const measurementCanvas = document.createElement('canvas');
  const measurementContext = measurementCanvas.getContext('2d');
  if (!measurementContext) throw new Error('无法创建导出画布，请稍后重试。');

  const mainTitle = `${cardData.studentName || '未命名学员'}的试听课记录`;
  const subtitle = `${cardData.courseName || '试听课程'} · ${record.courseSystem || '创客课程'} · ${cardData.lessonDate || '未填写日期'}`;
  measurementContext.font = '700 48px "PingFang SC", "Microsoft YaHei", sans-serif';
  const mainTitleLines = wrapCanvasText(measurementContext, mainTitle, contentWidth);
  measurementContext.font = '400 25px "PingFang SC", "Microsoft YaHei", sans-serif';
  const subtitleLines = wrapCanvasText(measurementContext, subtitle, contentWidth);
  const sectionHeights = sections.map((section) => {
    measurementContext.font = '700 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    const titleLines = wrapCanvasText(measurementContext, section.title, contentWidth - 68);
    measurementContext.font = '400 27px "PingFang SC", "Microsoft YaHei", sans-serif';
    const bodyLines = wrapCanvasText(measurementContext, section.body, contentWidth - 68);
    return 60 + titleLines.length * 42 + 14 + bodyLines.length * 48;
  });

  const displayPhotos = photos.slice(0, 2);
  const loadedPhotos = await Promise.all(
    displayPhotos.map((photoUrl) =>
      loadImage(photoUrl).catch(() => {
        throw new Error('图片加载失败，请重新上传照片后再导出');
      }),
    ),
  );
  const qrImage = await loadImage(`${import.meta.env.BASE_URL}qrcode.jpg`).catch(() => {
    throw new Error('二维码加载失败，请确认 public/qrcode.jpg 文件存在。');
  });
  const photoHeight = loadedPhotos.length === 1 ? Math.round(contentWidth / 1.6) : loadedPhotos.length === 2 ? 322 : 0;
  const headerHeight = 54 + mainTitleLines.length * 62 + 18 + subtitleLines.length * 38 + 36;
  const cardHeight =
    cardPadding +
    headerHeight +
    (photoHeight ? photoHeight + 34 : 0) +
    sectionHeights.reduce((sum, height) => sum + height, 0) +
    sectionGap * (sections.length - 1) +
    cardPadding;
  const totalHeight = cardY + cardHeight + outerMargin;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建导出画布，请稍后重试。');

  context.fillStyle = 'rgb(60, 125, 255)';
  context.fillRect(0, 0, width, totalHeight);

  const qrAspectRatio = qrImage.naturalWidth / qrImage.naturalHeight;
  const qrDrawWidth = qrAspectRatio >= 1 ? qrSize : qrSize * qrAspectRatio;
  const qrDrawHeight = qrAspectRatio >= 1 ? qrSize / qrAspectRatio : qrSize;
  context.fillStyle = '#ffffff';
  drawRoundedRect(context, outerMargin, outerMargin, qrSize, qrSize, 12);
  context.fill();
  context.drawImage(
    qrImage,
    outerMargin + (qrSize - qrDrawWidth) / 2,
    outerMargin + (qrSize - qrDrawHeight) / 2,
    qrDrawWidth,
    qrDrawHeight,
  );

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.font = '700 42px "PingFang SC", "Microsoft YaHei", sans-serif';
  const brandText = '爱高创客机器人竞赛中心';
  const brandAreaX = 200;
  const brandAreaWidth = width - brandAreaX - 60;
  const brandCenterX = brandAreaX + brandAreaWidth / 2;
  const brandY = 102;
  const brandTextWidth = context.measureText(brandText).width;
  context.fillText(brandText, brandCenterX, brandY);

  context.save();
  context.globalAlpha = 0.85;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 3;
  context.lineCap = 'round';
  const lineGap = 28;
  const lineLength = 105;
  const leftLineEnd = brandCenterX - brandTextWidth / 2 - lineGap;
  context.beginPath();
  context.moveTo(leftLineEnd - lineLength, brandY);
  context.lineTo(leftLineEnd, brandY);
  const rightLineStart = brandCenterX + brandTextWidth / 2 + lineGap;
  context.moveTo(rightLineStart, brandY);
  context.lineTo(rightLineStart + lineLength, brandY);
  context.stroke();
  context.restore();

  context.fillStyle = '#ffffff';
  context.font = '400 16px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText('扫码添加老师微信', outerMargin + qrSize / 2, outerMargin + qrSize + 20);

  context.save();
  context.shadowColor = 'rgba(16, 32, 51, 0.2)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 10;
  context.fillStyle = '#ffffff';
  drawRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 24);
  context.fill();
  context.restore();

  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.fillStyle = '#164a86';
  context.font = '700 24px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText('爱高创客试听课学习反馈', cardX + cardWidth / 2, cardY + cardPadding);
  context.fillStyle = '#12365d';
  context.font = '700 48px "PingFang SC", "Microsoft YaHei", sans-serif';
  let headerY = cardY + cardPadding + 48;
  mainTitleLines.forEach((line) => {
    context.fillText(line, cardX + cardWidth / 2, headerY);
    headerY += 62;
  });
  headerY += 18;
  context.fillStyle = '#536b82';
  context.font = '400 25px "PingFang SC", "Microsoft YaHei", sans-serif';
  subtitleLines.forEach((line) => {
    context.fillText(line, cardX + cardWidth / 2, headerY);
    headerY += 38;
  });

  let currentY = cardY + cardPadding + headerHeight;
  if (loadedPhotos.length === 1) {
    context.drawImage(loadedPhotos[0], contentX, currentY, contentWidth, photoHeight);
    currentY += photoHeight + 34;
  } else if (loadedPhotos.length === 2) {
    const photoGap = 20;
    const photoWidth = (contentWidth - photoGap) / 2;
    context.drawImage(loadedPhotos[0], contentX, currentY, photoWidth, photoHeight);
    context.drawImage(loadedPhotos[1], contentX + photoWidth + photoGap, currentY, photoWidth, photoHeight);
    currentY += photoHeight + 34;
  }

  context.textAlign = 'left';
  sections.forEach((section, index) => {
    currentY += drawCanvasSection(context, section, contentX, currentY, contentWidth);
    if (index < sections.length - 1) currentY += sectionGap;
  });

  return canvas;
}

function buildRecord(form) {
  return {
    id: form.id || '',
    createdAt: form.createdAt || '',
    studentName: form.studentName.trim(),
    grade: form.grade,
    courseSystem: form.courseSystem,
    courseName: form.courseName.trim(),
    lessonDate: form.lessonDate,
    learningContent: form.learningContent.trim(),
    performanceDescription: form.performanceDescription.trim(),
    abilityObservation: form.abilityObservation.trim(),
    strengths: form.strengths.trim(),
    improvements: form.improvements.trim(),
    nextSuggestion: form.nextSuggestion.trim(),
  };
}

function createShareCardData(record) {
  return {
    studentName: record.studentName,
    courseName: record.courseName,
    grade: record.grade,
    lessonDate: record.lessonDate || record.trialDate,
    abilityObservation: record.abilityObservation,
    recordId: record.recordId || record.id,
  };
}

function createTempRecord(record) {
  const recordId = `temp-${crypto.randomUUID()}`;
  return normalizeRecord({
    ...record,
    id: recordId,
    recordId,
    createdAt: new Date().toISOString(),
    status: 'saving',
  });
}

function getFriendlyErrorMessage(error) {
  const message = typeof error === 'string' ? error : error?.message || '';
  if (error?.quotaExceeded || /quota|exceeded|storage/i.test(message)) {
    return '本地存储空间不足，请删除部分旧记录或减少图片大小。';
  }
  return message || '保存失败，请稍后重试。';
}

async function parseCreateRecordResult(result) {
  if (typeof Response !== 'undefined' && result instanceof Response) {
    const data = await result.json().catch(() => ({}));
    if (data.quotaExceeded) {
      throw new Error('本地存储空间不足，请删除部分旧记录或减少图片大小。');
    }
    if (!result.ok || !data.success) {
      throw new Error(data.message || data.error || '保存失败');
    }
    return data;
  }

  if (result?.quotaExceeded) {
    throw new Error('本地存储空间不足，请删除部分旧记录或减少图片大小。');
  }

  if (!result?.success) {
    throw new Error(result?.message || result?.error || '保存失败');
  }

  return result;
}

function getRecordDateValue(record) {
  const time = new Date(record.lessonDate || record.trialDate || record.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildTrialText(record, shareCardData) {
  return [
    `【爱高创客试听课学习反馈】`,
    `记录编号：${shareCardData?.recordId || record.id || '未生成'}`,
    `学员：${record.studentName || '未填写'}`,
    `课程：${record.courseName || '未填写'}（${record.courseSystem || '未填写'}）`,
    `日期：${record.lessonDate || record.trialDate || '未填写'}`,
    '',
    `本节课学习内容：${record.learningContent || '未填写'}`,
    `课堂表现：${record.performanceDescription || '未填写'}`,
    `能力观察点：`,
    record.abilityObservation || '未填写',
    `优点：${record.strengths || '未填写'}`,
    `不足：${record.improvements || '未填写'}`,
    `后续学习建议：${record.nextSuggestion || '未填写'}`,
  ].join('\n');
}

export default function TrialClassFeedback({ projects, records, notice, onBack, onSave, onDelete }) {
  const [form, setForm] = useState(emptyForm);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [shareCardData, setShareCardData] = useState(null);
  const [mode, setMode] = useState('editor');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [localToast, setLocalToast] = useState('');
  const [optimisticRecords, setOptimisticRecords] = useState([]);
  const [photoItems, setPhotoItems] = useState([]);
  const [activeCropId, setActiveCropId] = useState('');
  const photoItemsRef = useRef([]);
  const dragStateRef = useRef(null);

  const normalizedRecords = useMemo(() => {
    const recordMap = new Map();
    records.map(normalizeRecord).forEach((record) => {
      recordMap.set(record.recordId || record.id, record);
    });
    optimisticRecords.forEach((record) => {
      recordMap.set(record.recordId || record.id, record);
    });
    return [...recordMap.values()];
  }, [optimisticRecords, records]);
  const matchedProject = useMemo(() => findMatchedProject(projects, form), [form, projects]);
  const sortedRecords = useMemo(
    () => [...normalizedRecords].sort((a, b) => getRecordDateValue(b) - getRecordDateValue(a)),
    [normalizedRecords],
  );
  const matchingProjects = useMemo(
    () =>
      projects.filter((project) => {
        const matchesSystem = !form.courseSystem || project.courseSystem === form.courseSystem;
        const matchesGrade = !form.grade || !project.applicableGrade || project.applicableGrade === form.grade;
        return matchesSystem && matchesGrade;
      }),
    [form.courseSystem, form.grade, projects],
  );

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (saveStatus === 'saved') setSaveStatus('idle');
  }

  function replacePhotoItems(nextItems) {
    photoItemsRef.current = nextItems;
    setPhotoItems(nextItems);
  }

  async function commitPhotoCrop(photoItem) {
    try {
      const rendered = await renderCroppedDataUrl(photoItem.sourceDataUrl, photoItem);
      const currentItem = photoItemsRef.current.find((item) => item.id === photoItem.id);
      if (
        !currentItem ||
        currentItem.zoom !== photoItem.zoom ||
        currentItem.offsetX !== photoItem.offsetX ||
        currentItem.offsetY !== photoItem.offsetY
      ) {
        return;
      }
      const nextItems = photoItemsRef.current.map((item) =>
        item.id === photoItem.id
          ? {
              ...item,
              ...rendered.crop,
              croppedDataUrl: rendered.dataUrl,
            }
          : item,
      );
      replacePhotoItems(nextItems);
      setForm((current) => ({
        ...current,
        photoUrls: nextItems.map((item) => item.croppedDataUrl),
      }));
      setSaveStatus('idle');
    } catch (error) {
      setLocalToast(getFriendlyErrorMessage(error));
    }
  }

  async function updatePhotoCrop(photoId, changes) {
    const nextItems = photoItemsRef.current.map((item) =>
      item.id === photoId ? { ...item, ...changes } : item,
    );
    replacePhotoItems(nextItems);
    const nextItem = nextItems.find((item) => item.id === photoId);
    if (nextItem) await commitPhotoCrop(nextItem);
  }

  function handleCropPointerDown(event, photoId) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const item = photoItemsRef.current.find((photo) => photo.id === photoId);
    if (!item) return;
    setActiveCropId(photoId);
    dragStateRef.current = {
      photoId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: item.offsetX,
      startOffsetY: item.offsetY,
      viewportWidth: event.currentTarget.clientWidth,
      viewportHeight: event.currentTarget.clientHeight,
    };
  }

  function handleCropPointerMove(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const offsetX = drag.startOffsetX + ((event.clientX - drag.startX) * cropWidth) / drag.viewportWidth;
    const offsetY = drag.startOffsetY + ((event.clientY - drag.startY) * cropHeight) / drag.viewportHeight;
    const nextItems = photoItemsRef.current.map((item) =>
      item.id === drag.photoId ? { ...item, offsetX, offsetY } : item,
    );
    replacePhotoItems(nextItems);
  }

  async function handleCropPointerUp(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    const item = photoItemsRef.current.find((photo) => photo.id === drag.photoId);
    if (item) await commitPhotoCrop(item);
    setActiveCropId('');
  }

  async function handlePhotosChange(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const sourceDataUrls = await Promise.all(files.map(compressImageFile));
      const newItems = await Promise.all(sourceDataUrls.map(createPhotoItem));
      const nextItems = [...photoItemsRef.current, ...newItems];
      replacePhotoItems(nextItems);
      setForm((current) => ({
        ...current,
        photoUrls: nextItems.map((item) => item.croppedDataUrl),
      }));
      setSaveStatus('idle');
    } catch (error) {
      setLocalToast(getFriendlyErrorMessage(error) || '图片读取失败，请重新选择课堂照片。');
    } finally {
      event.target.value = '';
    }
  }

  function removePhoto(index) {
    const nextItems = photoItemsRef.current.filter((_, itemIndex) => itemIndex !== index);
    replacePhotoItems(nextItems);
    setForm((current) => ({
      ...current,
      photoUrls: nextItems.map((item) => item.croppedDataUrl),
    }));
    setSaveStatus('idle');
  }

  function handleGenerate() {
    if (!form.courseSystem || !form.courseName.trim()) {
      setLocalToast('请先选择课程体系并填写课程名称。');
      return;
    }

    const generated = buildTrialFeedback(form, matchedProject);
    setForm((current) => ({
      ...current,
      ...generated,
    }));
    setSaveStatus('idle');
    setLocalToast('已生成课堂记录和教师评价，可继续手动修改。');
  }

  function validateForm() {
    const missing = [
      ['studentName', '学员姓名'],
      ['grade', '年级'],
      ['courseSystem', '试听课程类型'],
      ['courseName', '课程名称'],
      ['lessonDate', '试听日期'],
      ['learningContent', '本节学习内容'],
      ['performanceDescription', '课堂表现描述'],
      ['abilityObservation', '能力观察点'],
      ['strengths', '优点'],
      ['improvements', '不足'],
      ['nextSuggestion', '后续学习建议'],
    ]
      .filter(([field]) => !form[field]?.trim())
      .map(([, label]) => label);

    if (missing.length) {
      setLocalToast(`请先填写：${missing.join('、')}`);
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (saveStatus === 'saved' || isSaving) return;
    if (!validateForm()) return;

    setIsSaving(true);
    setSaveStatus('saving');
    setLocalToast('');
    const draftRecord = buildRecord(form);
    const previewPhotos = [...form.photoUrls];
    const tempRecord = createTempRecord({
      ...draftRecord,
      photoUrls: previewPhotos,
      imageUrl: previewPhotos[0] || '',
    });
    setOptimisticRecords((current) => [tempRecord, ...current]);

    try {
      const result = await parseCreateRecordResult(await Promise.resolve(onSave(draftRecord)));
      const apiRecord = result?.data;
      const apiRecordId = apiRecord?.recordId || apiRecord?.id;

      if (!apiRecordId) {
        throw new Error(result?.error || '保存失败：没有返回记录编号，请重新保存。');
      }

      const savedRecord = normalizeRecord({
        ...draftRecord,
        ...apiRecord,
        id: apiRecord.id || apiRecordId,
        recordId: apiRecordId,
        photoUrls: previewPhotos,
        imageUrl: previewPhotos[0] || '',
        status: 'saved',
      });
      const nextShareCardData = createShareCardData(savedRecord);

      if (!nextShareCardData.recordId) {
        throw new Error('分享卡片生成失败：缺少记录编号。');
      }

      setOptimisticRecords((current) =>
        current.map((record) => ((record.recordId || record.id) === tempRecord.recordId ? savedRecord : record)),
      );
      setForm((current) => ({
        ...current,
        id: savedRecord.id,
        createdAt: savedRecord.createdAt,
      }));
      setSelectedRecord(savedRecord);
      setShareCardData(nextShareCardData);
      setCopied(false);
      setMode('share');
      setSaveStatus('saved');
      setLocalToast('保存成功，分享卡片已生成。');
    } catch (error) {
      setOptimisticRecords((current) =>
        current.filter((record) => (record.recordId || record.id) !== tempRecord.recordId),
      );
      setSelectedRecord(null);
      setShareCardData(null);
      setMode('editor');
      setSaveStatus('idle');
      setLocalToast(getFriendlyErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function handleNew() {
    setForm(emptyForm);
    replacePhotoItems([]);
    setActiveCropId('');
    setSelectedRecord(null);
    setShareCardData(null);
    setCopied(false);
    setIsSaving(false);
    setSaveStatus('idle');
    setLocalToast('');
    setMode('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleEdit(record) {
    const normalizedRecord = normalizeRecord(record);
    const editablePhotoItems = normalizedRecord.photoUrls.map((photoUrl) => ({
      id: crypto.randomUUID(),
      sourceDataUrl: photoUrl,
      croppedDataUrl: photoUrl,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    }));
    replacePhotoItems(editablePhotoItems);
    setActiveCropId('');
    setForm({
      ...emptyForm,
      ...normalizedRecord,
      lessonDate: normalizedRecord.lessonDate || normalizedRecord.trialDate || today,
    });
    setSelectedRecord(normalizedRecord);
    setShareCardData(normalizedRecord.id ? createShareCardData(normalizedRecord) : null);
    setCopied(false);
    setIsSaving(false);
    setSaveStatus('idle');
    setMode('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleOpenShare(record) {
    const normalizedRecord = normalizeRecord(record);
    if (normalizedRecord.status === 'saving') {
      setLocalToast('记录正在保存中，保存成功后会自动生成分享卡片。');
      return;
    }
    if (normalizedRecord.status === 'failed') {
      setLocalToast('这条记录保存失败，请检查后重新保存。');
      return;
    }
    if (!normalizedRecord.id) {
      setLocalToast('这条记录缺少记录编号，无法生成分享卡片。');
      return;
    }

    setSelectedRecord(normalizedRecord);
    setShareCardData(createShareCardData(normalizedRecord));
    setCopied(false);
    setMode('share');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copyText(record) {
    const text = buildTrialText(record, shareCardData);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
  }

  async function exportShareCard() {
    const record = selectedRecord || sortedRecords[0];
    if (!record || !shareCardData?.recordId) {
      setLocalToast('请先保存成功并生成分享卡片。');
      return;
    }

    setExporting(true);
    try {
      const photos = Array.isArray(record.photoUrls) ? record.photoUrls : [];
      const canvas = await createTrialShareCanvas(record, shareCardData, photos);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${record.studentName || '学员'}-试听课学习反馈-${record.lessonDate || record.trialDate || today}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      setLocalToast(error?.message || '导出图片失败，请稍后重试。');
    } finally {
      setExporting(false);
    }
  }

  function confirmDelete(record) {
    const ok = window.confirm(`确认删除「${record.studentName || '该学员'}」的试听课记录吗？`);
    if (!ok) return;
    if (record.status === 'saving' || record.status === 'failed') {
      setOptimisticRecords((current) => current.filter((item) => (item.recordId || item.id) !== (record.recordId || record.id)));
      return;
    }
    onDelete(record.id);
    setOptimisticRecords((current) => current.filter((item) => (item.recordId || item.id) !== (record.recordId || record.id)));
    if (selectedRecord?.id === record.id) {
      setSelectedRecord(null);
      setShareCardData(null);
      setMode('editor');
    }
    setIsSaving(false);
  }

  function renderEditor() {
    const saveButtonText =
      isSaving ? '正在保存...' : saveStatus === 'saved' ? '已生成分享卡片' : '保存并生成卡片';

    return (
      <div className="trialLayout">
        <div className="trialEditor">
          <div className="panelHeader">
            <h2>{form.id ? '编辑试听课记录' : '创建试听课记录'}</h2>
            <span>作品展示与家长反馈</span>
          </div>

          <div className="formGrid">
            <label>
              学员姓名
              <input value={form.studentName} onChange={(event) => updateForm('studentName', event.target.value)} placeholder="请输入姓名" />
            </label>
            <label>
              年级
              <select value={form.grade} onChange={(event) => updateForm('grade', event.target.value)}>
                <option value="">请选择年级</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label>
              试听课程类型
              <select value={form.courseSystem} onChange={(event) => updateForm('courseSystem', event.target.value)}>
                <option value="">请选择课程类型</option>
                {courseSystems.map((system) => (
                  <option key={system} value={system}>{system}</option>
                ))}
              </select>
            </label>
            <label>
              试听日期
              <input type="date" value={form.lessonDate} onChange={(event) => updateForm('lessonDate', event.target.value)} />
            </label>
          </div>

          <div className="trialCourseBox">
            <label>
              课程名称
              <input
                list="trial-project-options"
                value={form.courseName}
                onChange={(event) => updateForm('courseName', event.target.value)}
                placeholder="可选择项目库，也可以手动输入"
              />
              <datalist id="trial-project-options">
                {matchingProjects.map((project) => (
                  <option key={project.id} value={project.projectName} />
                ))}
              </datalist>
            </label>
            <div className={`trialMatchHint ${matchedProject ? 'active' : ''}`}>
              {matchedProject
                ? `已匹配项目资料库：${matchedProject.projectName}，生成时会带出学习内容和对应能力。`
                : '未强制绑定项目库，课程名称可自由填写。'}
            </div>
          </div>

          <div className="trialPhotoUploader">
            <label>
              上传课堂照片
              <input type="file" accept="image/*" multiple onChange={handlePhotosChange} />
            </label>
            <div className="trialCropList">
              {photoItems.map((photo, index) => (
                <div className="trialCropEditor" key={photo.id}>
                  <div className="trialCropHeader">
                    <strong>课堂照片 {index + 1}</strong>
                    <button className="iconButton danger" type="button" aria-label="移除照片" onClick={() => removePhoto(index)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div
                    className="trialCropViewport"
                    onPointerDown={(event) => handleCropPointerDown(event, photo.id)}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                  >
                    <img
                      src={activeCropId === photo.id ? photo.sourceDataUrl : photo.croppedDataUrl}
                      alt={`调整课堂照片 ${index + 1}`}
                      draggable="false"
                      style={{
                        transform:
                          activeCropId === photo.id
                            ? `translate(${(photo.offsetX / cropWidth) * 100}%, ${(photo.offsetY / cropHeight) * 100}%) scale(${photo.zoom})`
                            : 'none',
                      }}
                    />
                    <span>拖动照片调整显示区域</span>
                  </div>
                  <div className="trialCropControls">
                    <button
                      className="iconButton"
                      type="button"
                      aria-label="缩小照片"
                      onClick={() => updatePhotoCrop(photo.id, { zoom: Math.max(1, photo.zoom - 0.1) })}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={photo.zoom}
                      aria-label={`照片 ${index + 1} 缩放`}
                      onChange={(event) => updatePhotoCrop(photo.id, { zoom: Number(event.target.value) })}
                    />
                    <button
                      className="iconButton"
                      type="button"
                      aria-label="放大照片"
                      onClick={() => updatePhotoCrop(photo.id, { zoom: Math.min(3, photo.zoom + 0.1) })}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="secondaryButton trialCropReset"
                      type="button"
                      onClick={() => updatePhotoCrop(photo.id, { zoom: 1, offsetX: 0, offsetY: 0 })}
                    >
                      <RotateCcw size={16} />
                      重置
                    </button>
                  </div>
                </div>
              ))}
              {!photoItems.length && (
                <div className="trialPhotoEmpty">
                  <ImagePlus size={22} />
                  <span>课堂照片仅用于当前页面预览，不会保存到本地记录</span>
                </div>
              )}
            </div>
            {photoItems.length > 2 && <div className="trialPhotoLimitNotice">当前卡片最多展示 2 张照片。</div>}
          </div>

          <button className="secondaryButton trialGenerateButton" type="button" onClick={handleGenerate}>
            <Sparkles size={18} />
            自动生成试听课反馈
          </button>

          <div className="trialGeneratedFields">
            <div className="trialFieldGroup">
              <div className="panelHeader compact">
                <h2>课堂记录</h2>
                <span>客观数据</span>
              </div>
              <label>
                本节学习内容
                <textarea value={form.learningContent} onChange={(event) => updateForm('learningContent', event.target.value)} />
              </label>
              <label>
                课堂表现描述
                <textarea value={form.performanceDescription} onChange={(event) => updateForm('performanceDescription', event.target.value)} />
              </label>
              <label>
                能力观察点
                <textarea value={form.abilityObservation} onChange={(event) => updateForm('abilityObservation', event.target.value)} />
              </label>
            </div>

            <div className="trialFieldGroup">
              <div className="panelHeader compact">
                <h2>教师评价</h2>
                <span>专业分析</span>
              </div>
              <label>
                优点
                <textarea value={form.strengths} onChange={(event) => updateForm('strengths', event.target.value)} />
              </label>
              <label>
                不足
                <textarea value={form.improvements} onChange={(event) => updateForm('improvements', event.target.value)} />
              </label>
              <label>
                后续学习建议
                <textarea value={form.nextSuggestion} onChange={(event) => updateForm('nextSuggestion', event.target.value)} />
              </label>
            </div>

          </div>

          <button className="primaryButton" type="button" onClick={handleSave} disabled={isSaving || saveStatus === 'saved'}>
            {saveStatus === 'saved' ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {saveButtonText}
          </button>
        </div>

        <div className="trialRecordPanel">
          <div className="panelHeader">
            <h2>试听课记录</h2>
            <span>{normalizedRecords.length} 条</span>
          </div>
          <button className="secondaryButton trialNewButton" type="button" onClick={handleNew}>
            <Plus size={18} />
            新建记录
          </button>
          <div className="trialRecordList">
            {sortedRecords.map((record) => (
              <article className="trialRecordCard" key={record.id}>
                <button type="button" onClick={() => handleOpenShare(record)}>
                  <strong>{record.studentName || '未命名学员'}</strong>
                  <span>{record.courseName || '未填写课程'} · {record.lessonDate || record.trialDate || '未填写日期'}</span>
                  {record.status && <em className={`trialRecordStatus ${record.status}`}>{record.status === 'saving' ? '保存中' : record.status === 'failed' ? '保存失败' : '已保存'}</em>}
                </button>
                <div className="trialRecordActions">
                  <button className="iconButton" type="button" aria-label="编辑试听课记录" onClick={() => handleEdit(record)}>
                    <Edit3 size={16} />
                  </button>
                  <button className="iconButton danger" type="button" aria-label="删除试听课记录" onClick={() => confirmDelete(record)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
            {!sortedRecords.length && (
              <div className="emptyState">
                <strong>还没有试听课记录</strong>
                <span>创建并保存后，会在这里看到历史反馈。</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderShare() {
    const record = selectedRecord || sortedRecords[0];
    if (!record) return renderEditor();
    const cardData = shareCardData || (record.id ? createShareCardData(record) : null);
    const abilityItems = splitTextItems(record.abilityObservation);
    const photos = Array.isArray(record.photoUrls) ? record.photoUrls : [];

    if (!cardData?.recordId) {
      return (
        <div className="emptyState">
          <strong>分享卡片尚未生成</strong>
          <span>请先保存记录，保存成功后系统会生成卡片编号。</span>
        </div>
      );
    }

    return (
      <section className="trialSharePage">
        <div
          className="trialShareCard"
          id="trial-share-card"
          data-record-id={cardData.recordId}
        >
          <div className="trialShareHeader">
            <span>爱高创客试听课学习反馈</span>
            <h2>{cardData.studentName || '未命名学员'}的试听课记录</h2>
            <p>{cardData.courseName || '试听课程'} · {record.courseSystem || '创客课程'} · {cardData.lessonDate || '未填写日期'}</p>
          </div>

          <div className={`trialSharePhotos ${photos.length === 1 ? 'single' : 'double'}`}>
            {photos.slice(0, 2).map((photoUrl, index) => (
              <img key={`${photoUrl.slice(0, 32)}-${index}`} src={photoUrl} alt={`课堂照片 ${index + 1}`} />
            ))}
          </div>
          {photos.length > 2 && <div className="trialPhotoLimitNotice">当前卡片最多展示 2 张照片。</div>}

          <div className="trialShareSections">
            <section>
              <h3>本节课学习内容</h3>
              <p>{record.learningContent}</p>
            </section>
            <section>
              <h3>课堂表现</h3>
              <p>{record.performanceDescription}</p>
            </section>
            <section>
              <h3>能力观察点</h3>
              <div className="trialAbilityList">
                {abilityItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>
            <section>
              <h3>教师评价</h3>
              <p>优点：{record.strengths}</p>
              <p>不足：{record.improvements}</p>
            </section>
            <section>
              <h3>后续学习建议</h3>
              <p>{record.nextSuggestion}</p>
            </section>
          </div>

        </div>

        <div className="shareCardActions">
          <button className="copyButton compact" type="button" onClick={exportShareCard} disabled={exporting}>
            <Download size={18} />
            {exporting ? '正在导出...' : '导出 PNG 图片'}
          </button>
          <button className="copyButton compact" type="button" onClick={() => copyText(record)}>
            <ClipboardCopy size={18} />
            {copied ? '已复制文字版反馈' : '复制文字版反馈'}
          </button>
          <button className="secondaryButton" type="button" onClick={() => handleEdit(record)}>
            返回编辑
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pagePanel trialPage">
      <div className="pageTopbar">
        <button className="secondaryButton" type="button" onClick={onBack}>
          <ArrowLeft size={18} />
          返回测评首页
        </button>
        <div>
          <span>试听课 / 前三节课</span>
          <h1>试听课学习反馈</h1>
        </div>
      </div>

      {(localToast || notice) && <div className="notice standalone">{localToast || notice}</div>}

      <div className="experienceNotice trialExperienceNotice">
        <Database size={18} />
        <div>
          <strong>当前为测试体验版，数据仅保存在当前浏览器中。</strong>
          <span>请生成卡片后及时导出 PNG 图片保存，暂不支持多设备同步和多人共享记录。</span>
        </div>
      </div>

      <div className="reportModeSwitch">
        <button className={`secondaryButton ${mode === 'editor' ? 'active' : ''}`} type="button" onClick={() => setMode('editor')}>
          创建记录
        </button>
        <button
          className={`secondaryButton ${mode === 'share' ? 'active' : ''}`}
          type="button"
          onClick={() => sortedRecords.length && handleOpenShare(selectedRecord || sortedRecords[0])}
          disabled={!sortedRecords.length}
        >
          分享卡片
        </button>
      </div>

      {mode === 'share' ? renderShare() : renderEditor()}
    </section>
  );
}
