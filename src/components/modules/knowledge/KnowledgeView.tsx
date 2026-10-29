import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Network,
  List,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  BookOpen,
  FileText,
  Sparkles,
  Link2
} from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'course' | 'note' | 'term';
  courseId?: string;
  isBridge?: boolean;
  x: number;
  y: number;
  size: number;
  color: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'contains' | 'mentions' | 'bridge';
}

export const KnowledgeView: React.FC = () => {
  const { courses, notes, navigateToCourse, calculateCumulativeGpa } = useApp();

  const [activeTab, setActiveTab] = useState<'graph' | 'catalogue'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [bridgesOnly, setBridgesOnly] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Canvas Zoom / Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { courseGrades } = calculateCumulativeGpa();

  // Build Graph Nodes & Edges from real notes & courses
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Courses nodes
  courses.forEach((c, idx) => {
    const angle = (idx / courses.length) * 2 * Math.PI;
    const radius = 220;
    nodes.push({
      id: c.id,
      label: `${c.code}: ${c.name}`,
      type: 'course',
      courseId: c.id,
      x: 350 + Math.cos(angle) * radius,
      y: 250 + Math.sin(angle) * radius,
      size: 24,
      color: c.color
    });
  });

  // Notes nodes
  notes.filter(n => !n.inTrash).forEach((n, idx) => {
    const parentCourse = courses.find(c => c.id === n.courseId);
    const parentNode = nodes.find(nd => nd.id === n.courseId);
    const offsetX = (idx % 2 === 0 ? 1 : -1) * (50 + idx * 10);
    const offsetY = (idx % 3 === 0 ? 1 : -1) * (40 + idx * 8);

    const x = parentNode ? parentNode.x + offsetX : 350 + offsetX;
    const y = parentNode ? parentNode.y + offsetY : 250 + offsetY;

    nodes.push({
      id: n.id,
      label: n.title,
      type: 'note',
      courseId: n.courseId,
      x,
      y,
      size: 14,
      color: parentCourse ? parentCourse.color : '#64748b'
    });

    if (parentNode) {
      edges.push({ source: parentNode.id, target: n.id, type: 'contains' });
    }
  });

  // Bridge Terms (shared across multiple courses)
  const bridgeTerms = [
    { term: 'Gradient Descent & Convex Optimization', courses: ['course_ai401', 'course_math210'] },
    { term: 'Eigenvalues & Dimensionality Reduction', courses: ['course_math210', 'course_ai401'] },
    { term: 'Logarithmic Complexity Bounding', courses: ['course_cs302', 'course_web250'] }
  ];

  bridgeTerms.forEach((b, idx) => {
    const termNodeId = `term_bridge_${idx}`;
    nodes.push({
      id: termNodeId,
      label: b.term,
      type: 'term',
      isBridge: true,
      x: 350 + (idx - 1) * 80,
      y: 250 + (idx % 2 === 0 ? 40 : -40),
      size: 16,
      color: '#2563eb' // Clean crisp bridge blue
    });

    b.courses.forEach(cid => {
      edges.push({ source: cid, target: termNodeId, type: 'bridge' });
    });
  });

  // Filter nodes
  const displayNodes = nodes.filter(n => {
    if (bridgesOnly && !n.isBridge) return false;
    if (!searchQuery) return true;
    return n.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab !== 'graph') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw Edges
    edges.forEach(e => {
      const src = displayNodes.find(n => n.id === e.source);
      const tgt = displayNodes.find(n => n.id === e.target);
      if (!src || !tgt) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = e.type === 'bridge' ? '#3b82f6' : '#cbd5e1';
      ctx.lineWidth = e.type === 'bridge' ? 2 : 1;
      if (e.type === 'bridge') {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    });

    // Draw Nodes
    displayNodes.forEach(n => {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, 2 * Math.PI);
      ctx.fillStyle = n.color;
      ctx.fill();

      if (selectedNode?.id === n.id) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw Label
      ctx.font = n.type === 'course' ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText(n.label.slice(0, 24), n.x, n.y + n.size + 12);
    });

    ctx.restore();
  }, [displayNodes, zoom, pan, selectedNode, activeTab]);

  // Terminology Catalogue data
  const termsList = [
    { term: 'AVL Tree Invariant', courseCode: 'CS 302', courseId: 'course_cs302', count: 4, isBridge: false, gpa: '3.8 (A)' },
    { term: 'Gradient Descent', courseCode: 'AI 401 & MATH 210', courseId: 'course_ai401', count: 7, isBridge: true, gpa: '3.7 (A-)' },
    { term: 'Eigenvalues & Eigendecomposition', courseCode: 'MATH 210 & AI 401', courseId: 'course_math210', count: 6, isBridge: true, gpa: '3.3 (B+)' },
    { term: 'Principal Component Analysis (PCA)', courseCode: 'AI 401 & MATH 210', courseId: 'course_ai401', count: 5, isBridge: true, gpa: '3.7 (A-)' },
    { term: 'Single Right Rotation', courseCode: 'CS 302', courseId: 'course_cs302', count: 3, isBridge: false, gpa: '3.8 (A)' },
    { term: 'Adam Optimizer', courseCode: 'AI 401', courseId: 'course_ai401', count: 3, isBridge: false, gpa: '3.7 (A-)' },
    { term: 'Double Left-Right Rotation', courseCode: 'CS 302', courseId: 'course_cs302', count: 4, isBridge: false, gpa: '3.8 (A)' },
    { term: 'Redis Distributed Caching', courseCode: 'WEB 250', courseId: 'course_web250', count: 2, isBridge: false, gpa: '3.9 (A)' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Knowledge Graph & Terminology
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Visualize relationships across courses, lecture notes, and cross-course bridge concepts.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs font-medium">
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'graph'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-blue-600" />
            <span>Interactive Graph</span>
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeTab === 'catalogue'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terminology Catalogue ({termsList.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'graph' ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter nodes..."
                  className="pl-8 pr-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setBridgesOnly(!bridgesOnly)}
                className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                  bridgesOnly
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-800'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                Cross-Course Bridges Only
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-mono mr-2">
                {displayNodes.length} Nodes • {edges.length} Edges
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.15, 2))}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.5))}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Canvas */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 relative overflow-hidden h-[480px]">
            <canvas
              ref={canvasRef}
              width={750}
              height={480}
              onMouseDown={e => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={e => {
                if (!isDragging) return;
                setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Minimap Box in Corner */}
            <div className="absolute bottom-3 right-3 w-28 h-20 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-md p-1 pointer-events-none shadow-sm flex items-center justify-center text-[9px] text-slate-400 font-mono">
              Minimap (Live)
            </div>
          </div>
        </div>
      ) : (
        /* Terminology Catalogue */
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-3 bg-slate-50/70 dark:bg-slate-950/40 grid grid-cols-12 text-xs font-semibold text-slate-500">
            <div className="col-span-5">Concept / Highlighted Term</div>
            <div className="col-span-4">Associated Course</div>
            <div className="col-span-2 text-center">Frequency</div>
            <div className="col-span-1 text-right">GPA</div>
          </div>

          {termsList.map((item, idx) => (
            <div key={idx} className="p-3.5 grid grid-cols-12 items-center text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="col-span-5 flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">{item.term}</span>
                {item.isBridge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                    Bridge
                  </span>
                )}
              </div>
              <div className="col-span-4 text-slate-600 dark:text-slate-400">
                {item.courseCode}
              </div>
              <div className="col-span-2 text-center font-mono text-slate-500">
                {item.count} occurrences
              </div>
              <div className="col-span-1 text-right font-mono font-semibold text-emerald-600">
                {item.gpa}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
