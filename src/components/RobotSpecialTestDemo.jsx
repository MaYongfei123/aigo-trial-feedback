import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  Bug,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Route,
  Save,
  Trash2,
  X,
  Zap,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { grades } from '../constants/assessment.js';
import {
  deleteRobotSpecialTestRecord,
  loadRobotSpecialTestRecords,
  saveRobotSpecialTestRecord,
} from '../services/storage.js';

const today = new Date().toISOString().slice(0, 10);
const reactionRoundCount = 10;
const dotMaxWaitMs = 5000;
const pathGridSize = 5;
const pathStart = { row: 4, col: 0 };
const pathGoal = { row: 0, col: 4 };
const pathShortestSteps = 8;
const pathObstacles = [
  { row: 1, col: 1 },
  { row: 1, col: 3 },
  { row: 2, col: 3 },
  { row: 3, col: 1 },
  { row: 3, col: 2 },
];
const pathDirections = [
  { key: 'up', label: '上', delta: { row: -1, col: 0 } },
  { key: 'down', label: '下', delta: { row: 1, col: 0 } },
  { key: 'left', label: '左', delta: { row: 0, col: -1 } },
  { key: 'right', label: '右', delta: { row: 0, col: 1 } },
];

const testTypes = [
  {
    id: 'logic',
    name: '程序逻辑判断测试',
    icon: BrainCircuit,
    goal: '测试学生能否理解机器人程序流程。',
    description: '根据机器人程序描述，判断机器人在不同条件下会如何运动。',
    accent: 'logic',
    tags: ['程序理解', '流程判断'],
    questions: [
      {
        id: 'logic-1',
        prompt: '如果颜色传感器检测到黑色，机器人左转；否则直行。当机器人检测到白色时，它会做什么？',
        options: ['左转', '直行', '后退', '停止不动'],
        answer: 1,
        explanation: '白色不满足“检测到黑色”的条件，所以执行“否则直行”。',
      },
      {
        id: 'logic-2',
        prompt: '程序设定：先前进 2 秒，再右转 90 度，最后停止。机器人完成前进后下一步是什么？',
        options: ['继续前进', '右转 90 度', '左转 90 度', '倒退 2 秒'],
        answer: 1,
        explanation: '顺序程序会按步骤执行，前进后进入右转步骤。',
      },
      {
        id: 'logic-3',
        prompt: '循环程序要求机器人重复执行“前进 1 秒、检测障碍”。如果没有障碍，机器人会怎样？',
        options: ['退出循环', '重复前进和检测', '马上左转', '关闭电机'],
        answer: 1,
        explanation: '循环条件没有被障碍打断时，会继续重复同一组动作。',
      },
    ],
  },
  {
    id: 'debugging',
    name: '调试排错测试',
    icon: Bug,
    goal: '测试学生能否根据机器人异常表现判断可能原因。',
    description: '根据故障现象选择最可能的原因，观察学生的调试判断能力。',
    accent: 'debugging',
    tags: ['问题分析', '调试思维'],
    questions: [
      {
        id: 'debugging-1',
        prompt: '机器人循线时总是冲出黑线，可能原因是什么？',
        options: ['速度过快', '电池没电', '机械臂太短', '屏幕亮度太低'],
        answer: 0,
        explanation: '循线冲出黑线常见原因是速度太快，传感器或程序来不及修正方向。',
      },
      {
        id: 'debugging-2',
        prompt: '机器人原地打转，不向前走，优先检查哪一项？',
        options: ['左右电机方向或功率设置', '积木颜色是否好看', '屏幕字体大小', '任务海报位置'],
        answer: 0,
        explanation: '原地打转通常和左右电机方向、端口或功率设置不一致有关。',
      },
      {
        id: 'debugging-3',
        prompt: '机器人完全不启动，按下运行键没有反应，较合理的排查顺序是什么？',
        options: ['先检查电源和程序是否已下载', '先换比赛场地', '先调整机械臂长度', '先增加循环次数'],
        answer: 0,
        explanation: '无反应时应先排查电源、连接和程序下载这些基础条件。',
      },
    ],
  },
  {
    id: 'rules',
    name: '任务规则理解测试',
    icon: ClipboardCheck,
    goal: '测试学生能否理解竞赛任务规则、限制条件和得分逻辑。',
    description: '阅读任务规则，判断怎样做才符合竞赛要求。',
    accent: 'rules',
    tags: ['规则理解', '得分策略'],
    questions: [
      {
        id: 'rules-1',
        prompt: '规则要求机器人必须从基地出发，任务物品必须完全进入目标区才得分。如果物品压线，是否得分？',
        options: ['得分', '不得分', '看机器人速度决定', '只要碰到目标区就得分'],
        answer: 1,
        explanation: '题干要求“完全进入目标区”，压线不满足完整进入的条件。',
      },
      {
        id: 'rules-2',
        prompt: '任务限制机器人不能用手直接移动场地物品。比赛中物品卡住了，正确做法是什么？',
        options: ['让机器人继续尝试或按规则重启', '直接用手把物品放进目标区', '请同学偷偷移动', '忽略规则继续计分'],
        answer: 0,
        explanation: '规则限制人工移动物品，应按比赛允许的方式处理。',
      },
      {
        id: 'rules-3',
        prompt: '某任务每完成一个目标得 10 分，最多 30 分。机器人完成 4 个目标，应记录多少分？',
        options: ['40 分', '30 分', '20 分', '10 分'],
        answer: 1,
        explanation: '虽然完成 4 个目标理论为 40 分，但规则设置了 30 分上限。',
      },
    ],
  },
  {
    id: 'reaction-focus',
    name: '反应力与专注力测试',
    icon: Zap,
    goal: '测试学生能否快速捕捉视觉目标，并保持稳定专注。',
    description: '测试区域内会随机出现醒目的小圆点，学生需要尽快点击圆点。',
    accent: 'reaction',
    mode: 'reaction',
    rounds: reactionRoundCount,
    tags: ['视觉反应', '专注稳定'],
  },
  {
    id: 'path-planning',
    name: '路径规划能力测试',
    icon: Route,
    goal: '通过网格路线任务，观察学生的空间规划、任务拆解和规则执行能力。',
    description: '测试学生能否根据起点、终点和障碍物规划合理路线。',
    accent: 'path',
    mode: 'path',
    tags: ['路径规划', '任务拆解'],
  },
];

function formatElapsed(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainSeconds = safeSeconds % 60;
  return `${minutes}分${String(remainSeconds).padStart(2, '0')}秒`;
}

function getAnalysis(accuracy) {
  if (accuracy >= 85) {
    return {
      label: '表现突出',
      advice: '可以继续增加开放式任务，让学员解释判断依据，并尝试自己设计类似题目。',
    };
  }

  if (accuracy >= 60) {
    return {
      label: '基本达成',
      advice: '建议继续用短任务做巩固，重点让学员说清“条件、现象、规则”之间的关系。',
    };
  }

  return {
    label: '需要继续练习',
    advice: '建议先回到单一知识点训练，用实物演示和逐步提问帮助学员建立稳定判断。',
  };
}

function createDot(round = 1) {
  return {
    round,
    appearedAt: Date.now(),
    position: {
      x: Math.round(Math.random() * 100),
      y: Math.round(Math.random() * 100),
    },
  };
}

function getReactionAnalysis(accuracy, averageReactionTime, fastestReactionTime, slowestReactionTime, misclickCount, timeoutCount) {
  const reactionGap = slowestReactionTime - fastestReactionTime;
  const hasFocusWave = fastestReactionTime > 0 && reactionGap >= 1200;
  let label = '需要加强视觉专注、目标捕捉和手眼协调训练';
  const adviceItems = ['建议先做低干扰的视觉搜索练习，再逐步提高目标出现速度和连续轮次。'];

  if (accuracy >= 90 && averageReactionTime < 900) {
    label = '视觉反应快，专注稳定性较好';
    adviceItems[0] = '可以继续加入方向、颜色或规则判断任务，提升视觉反应到机器人任务执行的迁移能力。';
  } else if (accuracy >= 80) {
    label = '能较好完成视觉搜索与点击任务，反应表现良好';
    adviceItems[0] = '建议继续保持 10 轮短测，逐步压缩目标反应时间，训练稳定性和准确率。';
  }

  if (misclickCount >= 3) {
    label = `${label}，误点偏多`;
    adviceItems.push('误点次数较多，说明操作时可能存在急于点击、目标确认不足或手眼协调不稳定的情况。');
  }

  if (hasFocusWave) {
    label = `${label}，但专注波动较明显`;
    adviceItems.push('最快与最慢反应时间差距较大，可增加短时专注保持练习。');
  }

  if (timeoutCount >= 2) {
    label = `${label}，目标搜索速度需要加强`;
    adviceItems.push('超时次数较多，建议加强持续注意力和视觉目标搜索速度训练。');
  }

  return { label, advice: adviceItems.join(' '), reactionGap };
}

function isSameCell(a, b) {
  return a.row === b.row && a.col === b.col;
}

function isPathObstacle(cell) {
  return pathObstacles.some((obstacle) => isSameCell(obstacle, cell));
}

function getPathAnalysis(isCompleted, validSteps, invalidMoves) {
  if (!isCompleted) {
    return {
      label: '未完成',
      advice: '建议从起点、目标、障碍三个要素开始练习任务拆解，先说出可行路线，再逐步执行。',
    };
  }

  if (invalidMoves >= 3) {
    return {
      label: '需要加强空间预判和规则执行',
      advice: '建议每次移动前先判断边界和障碍位置，用“先观察、再移动”的方式减少无效操作。',
    };
  }

  if (validSteps <= pathShortestSteps + 1) {
    return {
      label: '路径规划能力较好',
      advice: '可以增加更多障碍或指定必经点，让学员继续练习任务拆解和路线优化。',
    };
  }

  return {
    label: '能完成任务，但路径效率有提升空间',
    advice: '建议先比较不同路线的步数，再选择更短路径，逐步建立路径效率意识。',
  };
}

function getRecordTime(record) {
  const time = record?.createdAt ? new Date(record.createdAt).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function sortSpecialRecords(records) {
  return [...records].sort((a, b) => getRecordTime(b) - getRecordTime(a));
}

function getSpecialRecordTypeLabel(record) {
  if (record.testType === 'path_planning_test') return '路径规划类测试';
  if (record.testType === 'reaction_dot_test') return '交互反应类测试';
  return '知识理解类测试';
}

function getReactionHitCount(record) {
  if (typeof record.correctCount === 'number') return record.correctCount;
  return record.reactionStats?.trials?.filter((trial) => trial.isHit).length || 0;
}

function getReactionSummaryItems(record) {
  const stats = record.reactionStats || {};
  return [
    ['命中次数', getReactionHitCount(record)],
    ['命中率', `${record.accuracy ?? record.score ?? 0}%`],
    ['平均反应时间', `${stats.averageReactionTime ?? 0}ms`],
    ['最快反应时间', `${stats.fastestReactionTime ?? 0}ms`],
    ['最慢反应时间', `${stats.slowestReactionTime ?? 0}ms`],
    ['误点次数', stats.misclickCount ?? stats.misses?.length ?? 0],
    ['超时次数', stats.timeoutCount ?? stats.trials?.filter((trial) => trial.isTimeout).length ?? 0],
  ];
}

function getKnowledgeSummaryItems(record) {
  return [
    ['得分', `${record.score ?? 0}分`],
    ['正确率', `${record.accuracy ?? 0}%`],
    ['用时', record.usedTime || '未记录'],
  ];
}

function getPathSummaryItems(record) {
  const stats = record.pathStats || {};
  return [
    ['是否完成', stats.isCompleted ? '已完成' : '未完成'],
    ['总步数', stats.totalSteps ?? record.totalCount ?? 0],
    ['无效移动', stats.invalidMoves ?? 0],
    ['完成用时', stats.usedTime || record.usedTime || '未记录'],
    ['路径效率', `${stats.pathEfficiency ?? record.score ?? 0}%`],
  ];
}

export default function RobotSpecialTestDemo({ onBack }) {
  const [records, setRecords] = useState(loadRobotSpecialTestRecords);
  const [showRecords, setShowRecords] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [studentInfo, setStudentInfo] = useState({
    studentName: '',
    grade: '',
    testDate: today,
  });
  const [answers, setAnswers] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [savedRecordId, setSavedRecordId] = useState('');
  const [notice, setNotice] = useState('');
  const [reactionState, setReactionState] = useState({
    hasStarted: false,
    countdownValue: null,
    currentDot: null,
    missFeedback: false,
    misses: [],
    trials: [],
  });
  const [pathState, setPathState] = useState({
    hasStarted: false,
    position: pathStart,
    moves: [],
  });

  const selectedTest = useMemo(
    () => testTypes.find((test) => test.id === selectedTestId) || null,
    [selectedTestId],
  );
  const sortedRecords = useMemo(() => sortSpecialRecords(records), [records]);

  useEffect(() => {
    if (!startTime || result) return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [result, startTime]);

  useEffect(() => {
    if (!selectedTest || selectedTest.mode !== 'reaction' || !reactionState.hasStarted || !reactionState.currentDot || result) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      completeDotRound(false, Date.now(), true);
    }, dotMaxWaitMs);

    return () => window.clearTimeout(timer);
  }, [reactionState.currentDot, result, selectedTest]);

  useEffect(() => {
    if (!selectedTest || selectedTest.mode !== 'reaction' || reactionState.countdownValue === null || result) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => {
        if (reactionState.countdownValue === 3) {
          setReactionState((current) => ({ ...current, countdownValue: 2 }));
          return;
        }

        if (reactionState.countdownValue === 2) {
          setReactionState((current) => ({ ...current, countdownValue: 1 }));
          return;
        }

        if (reactionState.countdownValue === 1) {
          setReactionState((current) => ({ ...current, countdownValue: '开始' }));
          return;
        }

        const now = Date.now();
        setStartTime(now);
        setElapsedSeconds(0);
        setReactionState((current) => ({
          ...current,
          hasStarted: true,
          countdownValue: null,
          currentDot: createDot(1),
          missFeedback: false,
          misses: [],
          trials: [],
        }));
      },
      reactionState.countdownValue === '开始' ? 650 : 1000,
    );

    return () => window.clearTimeout(timer);
  }, [reactionState.countdownValue, result, selectedTest]);

  function updateStudentInfo(field, value) {
    setStudentInfo((current) => ({ ...current, [field]: value }));
  }

  function startTest(testId) {
    const nextTest = testTypes.find((test) => test.id === testId);
    setSelectedTestId(testId);
    setAnswers({});
    setResult(null);
    setSavedRecordId('');
    setNotice('');
    setElapsedSeconds(0);
    setStartTime(nextTest?.mode === 'reaction' || nextTest?.mode === 'path' ? null : Date.now());
    if (nextTest?.mode === 'reaction') {
      setReactionState({
        hasStarted: false,
        countdownValue: null,
        currentDot: null,
        missFeedback: false,
        misses: [],
        trials: [],
      });
    } else {
      setReactionState({
        hasStarted: false,
        countdownValue: null,
        currentDot: null,
        missFeedback: false,
        misses: [],
        trials: [],
      });
    }
    setPathState({
      hasStarted: false,
      position: pathStart,
      moves: [],
    });
  }

  function backToHome() {
    setSelectedTestId('');
    setAnswers({});
    setResult(null);
    setSavedRecordId('');
    setNotice('');
    setStartTime(null);
    setElapsedSeconds(0);
    setReactionState({
      hasStarted: false,
      countdownValue: null,
      currentDot: null,
      missFeedback: false,
      misses: [],
      trials: [],
    });
    setPathState({
      hasStarted: false,
      position: pathStart,
      moves: [],
    });
  }

  function beginReactionTest() {
    if (
      !selectedTest ||
      selectedTest.mode !== 'reaction' ||
      !isStudentInfoReady ||
      reactionState.hasStarted ||
      reactionState.countdownValue !== null ||
      result
    ) {
      return;
    }

    setStartTime(null);
    setElapsedSeconds(0);
    setReactionState({
      hasStarted: false,
      countdownValue: 3,
      currentDot: null,
      missFeedback: false,
      misses: [],
      trials: [],
    });
  }

  function beginPathTest() {
    if (!selectedTest || selectedTest.mode !== 'path' || !isStudentInfoReady || pathState.hasStarted || result) return;

    setStartTime(Date.now());
    setElapsedSeconds(0);
    setPathState({
      hasStarted: true,
      position: pathStart,
      moves: [],
    });
  }

  function finishPathTest(isCompleted, moves, finishedAt = Date.now()) {
    const validSteps = moves.filter((move) => move.isValid).length;
    const invalidMoves = moves.filter((move) => !move.isValid).length;
    const pathEfficiency = isCompleted && validSteps > 0 ? Math.min(100, Math.round((pathShortestSteps / validSteps) * 100)) : 0;
    const analysis = getPathAnalysis(isCompleted, validSteps, invalidMoves);
    const finalElapsedSeconds = startTime ? Math.max(1, Math.floor((finishedAt - startTime) / 1000)) : elapsedSeconds;

    setElapsedSeconds(finalElapsedSeconds);
    setResult({
      testName: selectedTest.name,
      recordType: 'path_planning_test',
      isCompleted,
      correctCount: isCompleted ? 1 : 0,
      wrongCount: invalidMoves,
      totalCount: moves.length,
      score: pathEfficiency,
      accuracy: pathEfficiency,
      elapsedSeconds: finalElapsedSeconds,
      totalSteps: validSteps,
      invalidMoves,
      pathEfficiency,
      moves,
      analysis: analysis.label,
      advice: analysis.advice,
    });
    setNotice('');
  }

  function handlePathMove(direction) {
    if (!selectedTest || selectedTest.mode !== 'path' || !pathState.hasStarted || result) return;

    const nextCell = {
      row: pathState.position.row + direction.delta.row,
      col: pathState.position.col + direction.delta.col,
    };
    const hitBoundary =
      nextCell.row < 0 || nextCell.row >= pathGridSize || nextCell.col < 0 || nextCell.col >= pathGridSize;
    const hitObstacle = !hitBoundary && isPathObstacle(nextCell);
    const isValid = !hitBoundary && !hitObstacle;
    const nextPosition = isValid ? nextCell : pathState.position;
    const move = {
      direction: direction.label,
      isValid,
      hitBoundary,
      hitObstacle,
      step: pathState.moves.length + 1,
      position: nextPosition,
    };
    const nextMoves = [...pathState.moves, move];
    const isCompleted = isValid && isSameCell(nextPosition, pathGoal);

    setPathState((current) => ({
      ...current,
      position: nextPosition,
      moves: nextMoves,
    }));

    if (isCompleted) {
      finishPathTest(true, nextMoves);
    }
  }

  function endPathTest() {
    if (!selectedTest || selectedTest.mode !== 'path' || !pathState.hasStarted || result) return;
    finishPathTest(false, pathState.moves);
  }

  function submitTest() {
    if (!selectedTest) return;

    const correctCount = selectedTest.questions.filter((question) => answers[question.id] === question.answer).length;
    const totalCount = selectedTest.questions.length;
    const wrongCount = totalCount - correctCount;
    const score = Math.round((correctCount / totalCount) * 100);
    const accuracy = Math.round((correctCount / totalCount) * 100);
    const finalElapsedSeconds = startTime ? Math.max(1, Math.floor((Date.now() - startTime) / 1000)) : elapsedSeconds;
    const analysis = getAnalysis(accuracy);

    setElapsedSeconds(finalElapsedSeconds);
    setResult({
      testName: selectedTest.name,
      recordType: `knowledge_${selectedTest.id}_test`,
      correctCount,
      wrongCount,
      totalCount,
      score,
      accuracy,
      elapsedSeconds: finalElapsedSeconds,
      analysis: analysis.label,
      advice: analysis.advice,
    });
    setNotice('');
  }

  function completeDotRound(isHit, clickedAt, isTimeout = false) {
    if (!selectedTest || selectedTest.mode !== 'reaction' || result || !reactionState.currentDot) return;

    const dot = reactionState.currentDot;
    const currentRoundMisses = reactionState.misses.filter((miss) => miss.round === dot.round);
    const trial = {
      round: dot.round,
      dotAppearedAt: new Date(dot.appearedAt).toISOString(),
      clickedAt: clickedAt ? new Date(clickedAt).toISOString() : '',
      reactionTimeMs: isTimeout ? dotMaxWaitMs : Math.max(0, clickedAt - dot.appearedAt),
      isHit,
      isTimeout,
      dotPosition: dot.position,
      missCount: currentRoundMisses.length,
    };
    const nextTrials = [...reactionState.trials, trial];

    if (nextTrials.length >= reactionRoundCount) {
      const hitCount = nextTrials.filter((item) => item.isHit).length;
      const timeoutCount = nextTrials.filter((item) => item.isTimeout).length;
      const accuracy = Math.round((hitCount / reactionRoundCount) * 100);
      const hitReactionTimes = nextTrials.filter((item) => item.isHit).map((item) => item.reactionTimeMs);
      const averageReactionTime = hitReactionTimes.length
        ? Math.round(hitReactionTimes.reduce((sum, reactionTime) => sum + reactionTime, 0) / hitReactionTimes.length)
        : 0;
      const fastestReactionTime = hitReactionTimes.length ? Math.min(...hitReactionTimes) : 0;
      const slowestReactionTime = hitReactionTimes.length ? Math.max(...hitReactionTimes) : 0;
      const misclickCount = reactionState.misses.length;
      const analysis = getReactionAnalysis(
        accuracy,
        averageReactionTime,
        fastestReactionTime,
        slowestReactionTime,
        misclickCount,
        timeoutCount,
      );
      const finalElapsedSeconds = startTime ? Math.max(1, Math.floor((Date.now() - startTime) / 1000)) : elapsedSeconds;

      setElapsedSeconds(finalElapsedSeconds);
      setReactionState((current) => ({
        ...current,
        currentDot: null,
        trials: nextTrials,
      }));
      setResult({
        testName: selectedTest.name,
        recordType: 'reaction_dot_test',
        correctCount: hitCount,
        wrongCount: reactionRoundCount - hitCount,
        totalCount: reactionRoundCount,
        score: accuracy,
        accuracy,
        elapsedSeconds: finalElapsedSeconds,
        averageReactionTime,
        fastestReactionTime,
        slowestReactionTime,
        misclickCount,
        timeoutCount,
        reactionGap: analysis.reactionGap,
        trials: nextTrials,
        misses: reactionState.misses,
        analysis: analysis.label,
        advice: analysis.advice,
      });
      setNotice('');
      return;
    }

    setReactionState((current) => ({
      ...current,
      hasStarted: true,
      countdownValue: null,
      currentDot: null,
      trials: nextTrials,
    }));

    window.setTimeout(() => {
      setReactionState((current) => ({
        ...current,
        hasStarted: true,
        countdownValue: null,
        currentDot: createDot(nextTrials.length + 1),
      }));
    }, 350);
  }

  function handleDotHit(event) {
    event.stopPropagation();
    if (!isStudentInfoReady || !reactionState.hasStarted || result) return;
    completeDotRound(true, Date.now());
  }

  function handleDotAreaMiss() {
    if (
      !selectedTest ||
      selectedTest.mode !== 'reaction' ||
      !reactionState.hasStarted ||
      !reactionState.currentDot ||
      result ||
      !isStudentInfoReady
    ) {
      return;
    }

    const clickedAt = Date.now();
    const dot = reactionState.currentDot;
    const miss = {
      round: dot.round,
      dotAppearedAt: new Date(dot.appearedAt).toISOString(),
      clickedAt: new Date(clickedAt).toISOString(),
      reactionTimeMs: Math.max(0, clickedAt - dot.appearedAt),
      isHit: false,
      dotPosition: dot.position,
    };

    setReactionState((current) => ({
      ...current,
      missFeedback: true,
      misses: [...current.misses, miss],
    }));

    window.setTimeout(() => {
      setReactionState((current) => ({
        ...current,
        missFeedback: false,
      }));
    }, 800);
  }

  function saveResult() {
    if (!result || savedRecordId) return;

    const record = {
      id: crypto.randomUUID(),
      studentName: studentInfo.studentName.trim(),
      grade: studentInfo.grade,
      testType: result.recordType,
      testName: result.testName,
      testDate: studentInfo.testDate,
      score: result.score,
      accuracy: result.accuracy,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
      totalCount: result.totalCount,
      usedTime: formatElapsed(result.elapsedSeconds),
      resultAnalysis: result.analysis,
      nextStepAdvice: result.advice,
      reactionStats:
        result.recordType === 'reaction_dot_test'
          ? {
              averageReactionTime: result.averageReactionTime,
              fastestReactionTime: result.fastestReactionTime,
              slowestReactionTime: result.slowestReactionTime,
              misclickCount: result.misclickCount,
              timeoutCount: result.timeoutCount,
              reactionGap: result.reactionGap,
              trials: result.trials,
              misses: result.misses,
            }
          : undefined,
      pathStats:
        result.recordType === 'path_planning_test'
          ? {
              isCompleted: result.isCompleted,
              totalSteps: result.totalSteps,
              invalidMoves: result.invalidMoves,
              usedTime: formatElapsed(result.elapsedSeconds),
              pathEfficiency: result.pathEfficiency,
              moves: result.moves,
            }
          : undefined,
      createdAt: new Date().toISOString(),
    };
    const nextRecords = saveRobotSpecialTestRecord(record);
    setRecords(nextRecords);
    setSavedRecordId(record.id);
    setNotice('专项测试记录已保存。');
  }

  function handleDeleteSpecialRecord(recordId) {
    const target = records.find((record) => record.id === recordId);
    const ok = window.confirm(`确认删除「${target?.testName || target?.testType || '专项测试'}」这条记录吗？`);
    if (!ok) return;

    const nextRecords = deleteRobotSpecialTestRecord(recordId);
    setRecords(nextRecords);
  }

  function renderSpecialRecords() {
    return (
      <div className="specialRecordsDrawer">
        <div className="specialRecordsDrawerHeader">
          <div>
            <h2>专项测试记录</h2>
            <span>共 {records.length} 条</span>
          </div>
          <button className="iconButton" type="button" aria-label="关闭专项测试记录" onClick={() => setShowRecords(false)}>
            <X size={18} />
          </button>
        </div>

        {!sortedRecords.length ? (
          <div className="emptyState">暂无专项测试记录，完成并保存一次测试后将在这里显示。</div>
        ) : (
          <div className="specialRecordList">
            {sortedRecords.map((record) => {
              const isReactionRecord = record.testType === 'reaction_dot_test';
              const isPathRecord = record.testType === 'path_planning_test';
              const summaryItems = isPathRecord
                ? getPathSummaryItems(record)
                : isReactionRecord
                  ? getReactionSummaryItems(record)
                  : getKnowledgeSummaryItems(record);

              return (
                <article className="specialRecordCard" key={record.id}>
                  <div className="specialRecordHeader">
                    <div>
                      <span>{getSpecialRecordTypeLabel(record)}</span>
                      <h3>{record.testName || record.testType || '专项测试'}</h3>
                    </div>
                    <button
                      className="iconButton danger"
                      type="button"
                      aria-label="删除专项测试记录"
                      onClick={() => handleDeleteSpecialRecord(record.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="specialRecordMeta">
                    <span>学员：{record.studentName || '未填写'}</span>
                    <span>年级：{record.grade || '未填写'}</span>
                    <span>日期：{record.testDate || '未填写'}</span>
                  </div>

                  <div className="specialRecordSummary">
                    {summaryItems.map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="specialRecordText">
                    <div>
                      <span>分析内容</span>
                      <p>{record.resultAnalysis || '暂无分析内容'}</p>
                    </div>
                    <div>
                      <span>下一步建议</span>
                      <p>{record.nextStepAdvice || '暂无下一步建议'}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isStudentInfoReady = studentInfo.studentName.trim() && studentInfo.grade && studentInfo.testDate;
  const isReactionTest = selectedTest?.mode === 'reaction';
  const isPathTest = selectedTest?.mode === 'path';
  const answeredCount = selectedTest && !isReactionTest && !isPathTest
    ? selectedTest.questions.filter((question) => answers[question.id] !== undefined).length
    : 0;
  const allAnswered = selectedTest && !isReactionTest && !isPathTest ? answeredCount === selectedTest.questions.length : false;
  const reactionRound = reactionState.hasStarted ? Math.min(reactionState.trials.length + 1, reactionRoundCount) : 0;
  const pathValidSteps = pathState.moves.filter((move) => move.isValid).length;
  const pathInvalidMoves = pathState.moves.length - pathValidSteps;

  if (!selectedTest) {
    return (
      <section className="pagePanel robotDemoPage">
        <div className="pageTopbar">
          <button className="secondaryButton" type="button" onClick={onBack}>
            <ArrowLeft size={18} />
            返回测评首页
          </button>
          <div>
            <span>专项能力测评</span>
            <h1>机器人能力实验室</h1>
          </div>
        </div>

        <div className="robotDemoIntro">
          <div>
            <Bot size={28} />
            <strong>机器人能力实验室</strong>
            <span>通过知识判断与交互任务，记录学生在程序理解、规则分析、调试思维和反应专注方面的专项表现。</span>
          </div>
          <div className="robotDemoRecordCount">
            <span>已保存专项记录</span>
            <strong>{records.length}</strong>
            <button className="secondaryButton" type="button" onClick={() => setShowRecords(true)}>
              查看记录
            </button>
          </div>
        </div>

        <div className="robotLabSectionHeader">
          <div>
            <h2>知识理解类测试</h2>
            <p>适合观察学生对程序流程、任务规则和异常现象的理解能力。</p>
          </div>
        </div>

        <div className="robotTestCards">
          {testTypes
            .filter((test) => !test.mode)
            .map((test) => {
            const Icon = test.icon;
            return (
              <article className={`robotTestCard ${test.accent}`} key={test.id}>
                <div className="robotTestIcon">
                  <Icon size={24} />
                </div>
                <h2>{test.name}</h2>
                <p>{test.goal}</p>
                <div className="robotAbilityTags">
                  {test.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <span>{test.questions.length} 道题 · 基础测评</span>
                <button className="primaryButton" type="button" onClick={() => startTest(test.id)}>
                  开始测试
                </button>
              </article>
            );
            })}
        </div>

        <div className="robotLabSectionHeader">
          <div>
            <h2>交互反应类测试</h2>
            <p>适合观察学生的视觉反应、手眼协调与专注稳定性。</p>
          </div>
        </div>

        <div className="robotTestCards single">
          {testTypes
            .filter((test) => test.mode === 'reaction')
            .map((test) => {
              const Icon = test.icon;
              return (
                <article className={`robotTestCard ${test.accent}`} key={test.id}>
                  <div className="robotTestIcon">
                    <Icon size={24} />
                  </div>
                  <h2>{test.name}</h2>
                  <p>{test.goal}</p>
                  <div className="robotAbilityTags">
                    {test.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <span>{test.rounds} 轮 · 点击圆点任务</span>
                  <button className="primaryButton" type="button" onClick={() => startTest(test.id)}>
                    开始测试
                  </button>
                </article>
              );
            })}
        </div>

        <div className="robotLabSectionHeader">
          <div>
            <h2>路径规划类测试</h2>
            <p>适合观察学生的空间路径规划、任务拆解与规则执行能力。</p>
          </div>
        </div>

        <div className="robotTestCards single">
          {testTypes
            .filter((test) => test.mode === 'path')
            .map((test) => {
              const Icon = test.icon;
              return (
                <article className={`robotTestCard ${test.accent}`} key={test.id}>
                  <div className="robotTestIcon">
                    <Icon size={24} />
                  </div>
                  <h2>{test.name}</h2>
                  <p>{test.description}</p>
                  <div className="robotAbilityTags">
                    {test.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <span>5×5 网格 · 到达目标任务</span>
                  <button className="primaryButton" type="button" onClick={() => startTest(test.id)}>
                    开始测试
                  </button>
                </article>
              );
            })}
        </div>

        {showRecords && (
          <div className="specialRecordsOverlay" role="presentation" onClick={() => setShowRecords(false)}>
            <div role="dialog" aria-modal="true" aria-label="专项测试记录" onClick={(event) => event.stopPropagation()}>
              {renderSpecialRecords()}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="pagePanel robotDemoPage">
      <div className="pageTopbar">
        <button className="secondaryButton" type="button" onClick={backToHome}>
          <ArrowLeft size={18} />
          返回专项测试首页
        </button>
        <div>
          <span>机器人能力实验室</span>
          <h1>{selectedTest.name}</h1>
        </div>
      </div>

      <div className="robotTestLayout">
        <div className="robotTestMain">
          <div className="robotTestInfo">
            <div className="panelHeader compact">
              <h2>测试说明</h2>
              <span>
                {isReactionTest
                  ? `${reactionRoundCount} 轮`
                  : isPathTest
                    ? `${pathGridSize}×${pathGridSize} 网格`
                    : `${selectedTest.questions.length} 道题`}
              </span>
            </div>
            <p>{selectedTest.description}</p>
            <p>{selectedTest.goal}</p>
          </div>

          <div className="robotStudentForm">
            <label>
              <UserRound size={16} />
              学员姓名
              <input
                value={studentInfo.studentName}
                onChange={(event) => updateStudentInfo('studentName', event.target.value)}
                placeholder="请输入姓名"
              />
            </label>
            <label>
              年级
              <select value={studentInfo.grade} onChange={(event) => updateStudentInfo('grade', event.target.value)}>
                <option value="">请选择年级</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <CalendarDays size={16} />
              测试日期
              <input
                type="date"
                value={studentInfo.testDate}
                onChange={(event) => updateStudentInfo('testDate', event.target.value)}
              />
            </label>
          </div>

          {isReactionTest ? (
              <div className="reactionStage">
                <div className="panelHeader compact">
                  <h2>点击圆点</h2>
                <span>
                  {reactionState.hasStarted
                    ? `第 ${reactionRound}/${reactionRoundCount} 轮`
                    : reactionState.countdownValue !== null
                      ? '倒计时'
                      : '准备中'}
                </span>
              </div>
              <div className="reactionDotArea" role="button" tabIndex={0} onClick={handleDotAreaMiss}>
                {!isStudentInfoReady ? (
                  <span className="reactionDotHint">请先填写学员信息</span>
                ) : reactionState.countdownValue !== null ? (
                  <div className="reactionCountdown" aria-live="polite">{reactionState.countdownValue}</div>
                ) : !reactionState.hasStarted ? (
                  <div className="reactionStartBox">
                    <strong>点击圆点测试</strong>
                    <p>请集中注意力。</p>
                    <p>点击开始后，圆点会随机出现在区域内。</p>
                    <p>请尽快点击圆点。</p>
                    <button className="primaryButton narrow" type="button" onClick={beginReactionTest}>
                      我准备好了，开始测试
                    </button>
                  </div>
                ) : reactionState.currentDot ? (
                  <button
                    className="reactionDot"
                    type="button"
                    aria-label="点击圆点"
                    style={{
                      left: `clamp(40px, ${reactionState.currentDot.position.x}%, calc(100% - 40px))`,
                      top: `clamp(40px, ${reactionState.currentDot.position.y}%, calc(100% - 40px))`,
                    }}
                    onClick={handleDotHit}
                  />
                ) : (
                  <span className="reactionDotHint">{result ? '测试已完成' : '准备下一个圆点'}</span>
                )}
                {reactionState.missFeedback && (
                  <span className="reactionMissFeedback">未命中，请看准圆点再点击</span>
                )}
              </div>
              <div className="reactionTrialList">
                {reactionState.trials.map((trial, index) => (
                  <span className={trial.isHit ? 'ready' : 'wrong'} key={`${trial.round}-${index}`}>
                    {trial.round}. {trial.isTimeout ? '超时' : '命中'} · {trial.reactionTimeMs}ms · 误点 {trial.missCount}
                  </span>
                ))}
                {reactionState.misses.length > 0 && <span className="wrong">累计误点 {reactionState.misses.length}</span>}
              </div>
            </div>
          ) : isPathTest ? (
            <div className="pathStage">
              <div className="panelHeader compact">
                <h2>路径规划</h2>
                <span>{pathState.hasStarted ? `有效 ${pathValidSteps} 步 · 无效 ${pathInvalidMoves} 次` : '准备中'}</span>
              </div>

              {!isStudentInfoReady ? (
                <div className="pathStartBox">
                  <strong>请先填写学员信息</strong>
                  <p>填写姓名、年级和日期后即可开始路径规划任务。</p>
                </div>
              ) : !pathState.hasStarted ? (
                <div className="pathStartBox">
                  <strong>路径规划能力测试</strong>
                  <p>观察起点 S、终点 G 和障碍物位置。</p>
                  <p>点击开始后，用方向按钮控制机器人到达目标。</p>
                  <button className="primaryButton narrow" type="button" onClick={beginPathTest}>
                    开始测试
                  </button>
                </div>
              ) : (
                <>
                  <div className="pathGrid" aria-label="5×5 路径规划网格">
                    {Array.from({ length: pathGridSize * pathGridSize }, (_, index) => {
                      const cell = {
                        row: Math.floor(index / pathGridSize),
                        col: index % pathGridSize,
                      };
                      const isStart = isSameCell(cell, pathStart);
                      const isGoal = isSameCell(cell, pathGoal);
                      const isObstacle = isPathObstacle(cell);
                      const hasRobot = isSameCell(cell, pathState.position);
                      const className = [
                        'pathCell',
                        isStart ? 'start' : '',
                        isGoal ? 'goal' : '',
                        isObstacle ? 'obstacle' : '',
                        hasRobot ? 'robot' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <div className={className} key={`${cell.row}-${cell.col}`}>
                          {isStart && <span className="pathCellMarker">S</span>}
                          {isGoal && <span className="pathCellMarker">G</span>}
                          {hasRobot && <strong>R</strong>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pathControls" aria-label="机器人移动方向">
                    {pathDirections.map((direction) => (
                      <button
                        className="secondaryButton"
                        type="button"
                        key={direction.key}
                        disabled={Boolean(result)}
                        onClick={() => handlePathMove(direction)}
                      >
                        {direction.label}
                      </button>
                    ))}
                  </div>

                  <div className="pathMoveLog">
                    {pathState.moves.slice(-6).map((move) => (
                      <span className={move.isValid ? 'ready' : 'wrong'} key={move.step}>
                        {move.step}. {move.direction} ·{' '}
                        {move.isValid ? '有效' : move.hitBoundary ? '撞边界' : move.hitObstacle ? '撞障碍' : '无效'}
                      </span>
                    ))}
                  </div>

                  <button className="secondaryButton" type="button" disabled={Boolean(result)} onClick={endPathTest}>
                    结束测试并查看结果
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="robotQuestionList">
              <div className="panelHeader compact">
                <h2>题目列表</h2>
                <span>
                  已答 {answeredCount}/{selectedTest.questions.length}
                </span>
              </div>
              {selectedTest.questions.map((question, index) => (
                <article className="robotQuestion" key={question.id}>
                  <strong>
                    {index + 1}. {question.prompt}
                  </strong>
                  <div className="robotOptions">
                    {question.options.map((option, optionIndex) => (
                      <label className="robotOption" key={option}>
                        <input
                          checked={answers[question.id] === optionIndex}
                          name={question.id}
                          type="radio"
                          onChange={() =>
                            setAnswers((current) => ({
                              ...current,
                              [question.id]: optionIndex,
                            }))
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {result && (
                    <p className={answers[question.id] === question.answer ? 'answerRight' : 'answerWrong'}>
                      {answers[question.id] === question.answer ? '回答正确' : '回答错误'}：{question.explanation}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="robotResultPanel">
          <div className="robotTimer">
            <Clock3 size={18} />
            <span>用时</span>
            <strong>{formatElapsed(result?.elapsedSeconds ?? elapsedSeconds)}</strong>
          </div>

          {!result ? (
            <>
              <div className="robotChecklist">
                <span className={isStudentInfoReady ? 'ready' : ''}>
                  <CheckCircle2 size={16} />
                  学员信息
                </span>
                <span className={(isReactionTest ? reactionState.trials.length === reactionRoundCount : allAnswered) ? 'ready' : ''}>
                  <CheckCircle2 size={16} />
                  {isReactionTest ? `完成 ${reactionRoundCount} 轮` : isPathTest ? '到达目标' : '完成答题'}
                </span>
              </div>
              {!isReactionTest && !isPathTest && (
                <button
                  className="primaryButton"
                  type="button"
                  disabled={!isStudentInfoReady || !allAnswered}
                  onClick={submitTest}
                >
                  生成结果
                </button>
              )}
            </>
          ) : (
            <div className="robotResultCard">
              <span>测试结果</span>
              <h2>{result.testName}</h2>
              <div className="robotResultStudent">
                <div>
                  <span>学员姓名</span>
                  <strong>{studentInfo.studentName || '未填写'}</strong>
                </div>
                <div>
                  <span>年级</span>
                  <strong>{studentInfo.grade || '未填写'}</strong>
                </div>
                <div>
                  <span>测试日期</span>
                  <strong>{studentInfo.testDate || '未填写'}</strong>
                </div>
              </div>
              <div className="robotScore">
                <strong>{result.score}</strong>
                <span>
                  {result.recordType === 'reaction_dot_test'
                    ? '% 命中率'
                    : result.recordType === 'path_planning_test'
                      ? '% 路径效率'
                      : '分'}
                </span>
              </div>
              <div className="robotResultStats">
                <div>
                  <span>
                    {result.recordType === 'reaction_dot_test'
                      ? '命中率'
                      : result.recordType === 'path_planning_test'
                        ? '是否完成'
                        : '正确率'}
                  </span>
                  <strong>{result.recordType === 'path_planning_test' ? (result.isCompleted ? '已完成' : '未完成') : `${result.accuracy}%`}</strong>
                </div>
                <div>
                  <span>
                    {result.recordType === 'reaction_dot_test'
                      ? '命中次数'
                      : result.recordType === 'path_planning_test'
                        ? '总步数'
                        : '正确题数'}
                  </span>
                  <strong>{result.recordType === 'path_planning_test' ? result.totalSteps : result.correctCount}</strong>
                </div>
                <div>
                  <span>
                    {result.recordType === 'reaction_dot_test'
                      ? '总轮次'
                      : result.recordType === 'path_planning_test'
                        ? '无效移动'
                        : '错误题数'}
                  </span>
                  <strong>
                    {result.recordType === 'reaction_dot_test'
                      ? result.totalCount
                      : result.recordType === 'path_planning_test'
                        ? result.invalidMoves
                        : result.wrongCount}
                  </strong>
                </div>
              </div>
              {result.recordType === 'reaction_dot_test' && (
                <div className="robotResultStats reactionStats">
                  <div>
                    <span>平均反应</span>
                    <strong>{result.averageReactionTime}ms</strong>
                  </div>
                  <div>
                    <span>最快反应</span>
                    <strong>{result.fastestReactionTime}ms</strong>
                  </div>
                  <div>
                    <span>最慢反应</span>
                    <strong>{result.slowestReactionTime}ms</strong>
                  </div>
                  <div>
                    <span>误点次数</span>
                    <strong>{result.misclickCount}</strong>
                  </div>
                  <div>
                    <span>超时次数</span>
                    <strong>{result.timeoutCount}</strong>
                  </div>
                </div>
              )}
              {result.recordType === 'path_planning_test' && (
                <div className="robotResultStats pathStats">
                  <div>
                    <span>完成用时</span>
                    <strong>{formatElapsed(result.elapsedSeconds)}</strong>
                  </div>
                  <div>
                    <span>路径效率</span>
                    <strong>{result.pathEfficiency}%</strong>
                  </div>
                </div>
              )}
              <div className="robotResultAnalysis">
                <span>
                  {result.recordType === 'reaction_dot_test'
                    ? '专注稳定性分析'
                    : result.recordType === 'path_planning_test'
                      ? '路径规划分析'
                      : '结果分析'}
                </span>
                <strong>{result.analysis}</strong>
                <p>{result.advice}</p>
              </div>
              <button className="primaryButton" type="button" disabled={Boolean(savedRecordId)} onClick={saveResult}>
                <Save size={18} />
                {savedRecordId ? '已保存记录' : '保存测试记录'}
              </button>
              {notice && <div className="notice">{notice}</div>}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
