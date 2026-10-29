import {
  Course,
  Assignment,
  Task,
  Note,
  CalendarEvent,
  InboxItem,
  DocumentFile,
  Flashcard,
  FlashcardDeck,
  FocusSession,
  Quiz,
  Exam,
  GradeItem,
  AiMemory,
  DailyPlan,
  ReminderLog,
  AppNotification,
  IntegrationConnector,
  GitHubRepo,
  UserAccount
} from '../types';

export const initialUser: UserAccount = {
  id: 'usr_demo_882',
  name: 'Alex Rivera',
  email: 'alex.rivera@uel.ac.uk',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  isDemo: true
};

export const initialCourses: Course[] = [
  {
    id: 'course_cs302',
    name: 'Data Structures & Algorithms',
    code: 'CS 302',
    instructor: 'Dr. Evelyn Vance',
    color: '#0284c7', // Sky Blue
    location: 'Turing Hall 101',
    creditHours: 4,
    term: 'Fall 2026',
    syllabusUrl: 'https://canvas.uel.ac.uk/courses/cs302/syllabus',
    links: [
      { label: 'Course GitHub Org', url: 'https://github.com/uel-cs302-fall26' },
      { label: 'Lecture Slide Repository', url: 'https://slides.cs302.edu' }
    ],
    isArchived: false,
    meetingSlots: [
      { id: 'ms_1', day: 1, startTime: '09:00', endTime: '10:30', type: 'lecture', location: 'Turing Hall 101' },
      { id: 'ms_2', day: 3, startTime: '09:00', endTime: '10:30', type: 'lecture', location: 'Turing Hall 101' },
      { id: 'ms_3', day: 5, startTime: '14:00', endTime: '16:00', type: 'lab', location: 'Computer Lab 3B' }
    ]
  },
  {
    id: 'course_ai401',
    name: 'Artificial Intelligence & Machine Learning',
    code: 'AI 401',
    instructor: 'Prof. Marcus Chen',
    color: '#059669', // Emerald
    location: 'Lovelace Auditorium',
    creditHours: 4,
    term: 'Fall 2026',
    syllabusUrl: 'https://canvas.uel.ac.uk/courses/ai401/syllabus',
    links: [
      { label: 'Kaggle Competition', url: 'https://kaggle.com/c/uel-ai401' },
      { label: 'Course JupyterHub', url: 'https://jupyter.uel.ac.uk/ai401' }
    ],
    isArchived: false,
    meetingSlots: [
      { id: 'ms_4', day: 1, startTime: '13:00', endTime: '14:30', type: 'lecture', location: 'Lovelace Auditorium' },
      { id: 'ms_5', day: 3, startTime: '13:00', endTime: '14:30', type: 'lecture', location: 'Lovelace Auditorium' },
      { id: 'ms_6', day: 4, startTime: '15:00', endTime: '16:30', type: 'seminar', location: 'Seminar Room 204' }
    ]
  },
  {
    id: 'course_math210',
    name: 'Linear Algebra & Optimization',
    code: 'MATH 210',
    instructor: 'Dr. Sarah Al-Mansoor',
    color: '#475569', // Slate
    location: 'Euler Hall 204',
    creditHours: 3,
    term: 'Fall 2026',
    syllabusUrl: 'https://canvas.uel.ac.uk/courses/math210/syllabus',
    links: [
      { label: 'Wolfram Alpha Course Portal', url: 'https://wolframalpha.com' }
    ],
    isArchived: false,
    meetingSlots: [
      { id: 'ms_7', day: 2, startTime: '11:00', endTime: '12:30', type: 'lecture', location: 'Euler Hall 204' },
      { id: 'ms_8', day: 4, startTime: '11:00', endTime: '12:30', type: 'tutorial', location: 'Euler Hall 204' }
    ]
  },
  {
    id: 'course_web250',
    name: 'Modern Web Architecture & Cloud Systems',
    code: 'WEB 250',
    instructor: 'Liam Gallagher',
    color: '#d97706', // Amber
    location: 'Berners-Lee Studio 3',
    creditHours: 3,
    term: 'Fall 2026',
    syllabusUrl: 'https://canvas.uel.ac.uk/courses/web250/syllabus',
    links: [
      { label: 'AWS Educate Classroom', url: 'https://awseducate.com' }
    ],
    isArchived: false,
    meetingSlots: [
      { id: 'ms_9', day: 2, startTime: '14:00', endTime: '16:00', type: 'lecture', location: 'Berners-Lee Studio 3' },
      { id: 'ms_10', day: 4, startTime: '09:00', endTime: '11:00', type: 'lab', location: 'Cloud Lab 1' }
    ]
  }
];

export const initialAssignments: Assignment[] = [
  {
    id: 'asg_1',
    title: 'Balanced Binary Search Trees & AVL Rotations',
    description: 'Implement AVL tree insertions, left-right double rotations, and analyze rebalancing complexity.',
    courseId: 'course_cs302',
    type: 'homework',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 18 * 3600 * 1000).toISOString(), // Due tonight/tomorrow
    estimatedMinutes: 120,
    submissionUrl: 'https://gradescope.com/courses/cs302/asg3',
    links: ['https://slides.cs302.edu/avl-trees.pdf'],
    isBrokenDown: true,
    steps: [
      { id: 'step_1', title: 'Review AVL tree invariants and rotation formulas', completed: true, linkedTaskId: 'task_avl_1' },
      { id: 'step_2', title: 'Code recursive node height recalculation helper', completed: true, linkedTaskId: 'task_avl_2' },
      { id: 'step_3', title: 'Implement single Left and Right rotation operations', completed: false, linkedTaskId: 'task_avl_3' },
      { id: 'step_4', title: 'Handle zigzag Double Rotations (LR & RL)', completed: false, linkedTaskId: 'task_avl_4' },
      { id: 'step_5', title: 'Write unit tests on 1,000 random permutations', completed: false, linkedTaskId: 'task_avl_5' },
      { id: 'step_6', title: 'Submit code and benchmark output to GradeScope', completed: false, linkedTaskId: 'task_avl_6' }
    ]
  },
  {
    id: 'asg_2',
    title: 'Convolutional Neural Network for CIFAR-10',
    description: 'Construct a PyTorch ConvNet with batch normalization, dropout, and evaluate test accuracy curves.',
    courseId: 'course_ai401',
    type: 'project',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    estimatedMinutes: 180,
    submissionUrl: 'https://kaggle.com/c/uel-ai401/submissions',
    links: ['https://pytorch.org/tutorials/beginner/blitz/cifar10_tutorial.html'],
    isBrokenDown: false,
    steps: []
  },
  {
    id: 'asg_3',
    title: 'Eigenvalues & Diagonalization Problem Set',
    description: 'Compute characteristic polynomials, find eigenspaces, and prove symmetric matrix orthogonality.',
    courseId: 'course_math210',
    type: 'homework',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 96 * 3600 * 1000).toISOString(),
    estimatedMinutes: 90,
    submissionUrl: 'https://canvas.uel.ac.uk/courses/math210/assignments/hw4',
    links: [],
    isBrokenDown: false,
    steps: []
  },
  {
    id: 'asg_4',
    title: 'RESTful Microservices & Distributed Caching',
    description: 'Design Redis session caching and benchmark latency under 5,000 concurrent requests.',
    courseId: 'course_web250',
    type: 'lab',
    status: 'completed',
    priority: 'low',
    dueDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    estimatedMinutes: 150,
    submissionUrl: 'https://github.com/uel-web250/redis-cache-lab',
    links: [],
    isBrokenDown: false,
    steps: []
  }
];

export const initialTasks: Task[] = [
  {
    id: 'task_avl_3',
    title: 'Implement single Left and Right AVL rotations',
    description: 'Part of Assignment 1. Ensure parent pointers and heights update correctly.',
    courseId: 'course_cs302',
    dueDate: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    priority: 'high',
    tags: ['avl', 'code', 'data-structures'],
    completed: false,
    subtasks: [
      { id: 'st_1', title: 'Write left_rotate(Node* z)', completed: false },
      { id: 'st_2', title: 'Write right_rotate(Node* z)', completed: false },
      { id: 'st_3', title: 'Test on 3-node degenerated tree', completed: false }
    ],
    assignmentId: 'asg_1',
    source: 'breakdown'
  },
  {
    id: 'task_avl_4',
    title: 'Handle zigzag Double Rotations (LR & RL)',
    description: 'Part of Assignment 1.',
    courseId: 'course_cs302',
    dueDate: new Date(Date.now() + 16 * 3600 * 1000).toISOString(),
    priority: 'high',
    tags: ['avl', 'data-structures'],
    completed: false,
    subtasks: [],
    assignmentId: 'asg_1',
    source: 'breakdown'
  },
  {
    id: 'task_ai_read',
    title: 'Read Chapter 4 on Backpropagation and Loss Functions',
    description: 'Preparation for tomorrow’s Machine Learning seminar on gradient descent variants.',
    courseId: 'course_ai401',
    dueDate: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    priority: 'medium',
    tags: ['reading', 'theory'],
    completed: false,
    subtasks: [
      { id: 'st_4', title: 'Review chain rule in multivariate calculus', completed: true },
      { id: 'st_5', title: 'Read Adam vs SGD comparison section', completed: false }
    ],
    source: 'user'
  },
  {
    id: 'task_math_prob',
    title: 'Solve Questions 5–9 in Strang Linear Algebra',
    description: 'Focus on spectral decomposition and positive definite matrices.',
    courseId: 'course_math210',
    dueDate: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    priority: 'medium',
    tags: ['math', 'practice'],
    completed: false,
    subtasks: [],
    source: 'user'
  },
  {
    id: 'task_git_sync',
    title: 'Fix issue #14: Docker container port conflict on 5432',
    description: 'Imported from GitHub web250 repository issues.',
    courseId: 'course_web250',
    dueDate: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
    priority: 'low',
    tags: ['docker', 'github'],
    completed: false,
    subtasks: [],
    source: 'github'
  },
  {
    id: 'task_avl_1',
    title: 'Review AVL tree invariants and rotation formulas',
    description: 'Completed earlier this morning.',
    courseId: 'course_cs302',
    dueDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    priority: 'high',
    tags: ['avl'],
    completed: true,
    completedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    subtasks: [],
    assignmentId: 'asg_1',
    source: 'breakdown'
  }
];

export const initialNotes: Note[] = [
  {
    id: 'note_avl',
    title: 'Lecture 12: Self-Balancing Binary Trees (AVL & Red-Black)',
    content: `<h2>AVL Tree Invariant</h2>
<p>An <strong>AVL tree</strong> is a self-balancing binary search tree where the height difference (balance factor) between left and right subtrees of any node is at most <code>1</code>:</p>
<pre><code>BalanceFactor(v) = height(left(v)) - height(right(v)) ∈ {-1, 0, 1}</code></pre>

<h3>Rotation Cases</h3>
<table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%; border-color: #cbd5e1;">
  <tr style="background-color: #f1f5f9;">
    <th>Imbalance Condition</th>
    <th>Insertion Path</th>
    <th>Required Operation</th>
  </tr>
  <tr>
    <td>Left-Left (LL)</td>
    <td>Left child of left child</td>
    <td>Single Right Rotation</td>
  </tr>
  <tr>
    <td>Right-Right (RR)</td>
    <td>Right child of right child</td>
    <td>Single Left Rotation</td>
  </tr>
  <tr>
    <td>Left-Right (LR)</td>
    <td>Right child of left child</td>
    <td>Double Rotation: Left then Right</td>
  </tr>
  <tr>
    <td>Right-Left (RL)</td>
    <td>Left child of right child</td>
    <td>Double Rotation: Right then Left</td>
  </tr>
</table>

<h3>Complexity Guarantees</h3>
<p>Because the tree height is bounded strictly by <mark style="background-color: #fef08a;">1.44 log₂(n)</mark>, operations such as lookup, minimum, maximum, insertion, and deletion are guaranteed to run in worst-case <code>O(log n)</code> time.</p>`,
    courseId: 'course_cs302',
    tags: ['trees', 'algorithms', 'avl', 'midterm-prep'],
    pinned: true,
    inTrash: false,
    createdAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    highlightedTerms: ['AVL tree', 'BalanceFactor', 'Single Right Rotation', 'Double Rotation', 'O(log n)']
  },
  {
    id: 'note_eigen',
    title: 'Spectral Theorem & Eigendecomposition',
    content: `<h2>Eigenvectors and Eigenvalues</h2>
<p>Given an <code>n × n</code> matrix <code>A</code>, a non-zero vector <code>v</code> is an eigenvector corresponding to eigenvalue <code>λ</code> if:</p>
<pre><code>A · v = λ · v  ==>  (A - λI)v = 0</code></pre>
<p>The scalar <code>λ</code> is found by solving the characteristic equation: <code>det(A - λI) = 0</code>.</p>

<h3>Bridge to Machine Learning</h3>
<p>In Machine Learning (AI 401), eigendecomposition of the data covariance matrix yields <mark style="background-color: #bae6fd;">Principal Component Analysis (PCA)</mark>, projecting high-dimensional features onto directions of maximal variance while minimizing reconstruction error.</p>`,
    courseId: 'course_math210',
    tags: ['linear-algebra', 'spectral-theorem', 'pca'],
    pinned: false,
    inTrash: false,
    createdAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    highlightedTerms: ['Eigenvectors', 'Eigenvalues', 'Principal Component Analysis (PCA)', 'Covariance Matrix']
  },
  {
    id: 'note_gradient',
    title: 'Optimization: Stochastic Gradient Descent & Adam',
    content: `<h2>Gradient Descent Fundamentals</h2>
<p>Optimization minimizes an empirical risk objective function <code>J(θ)</code> over dataset weights:</p>
<pre><code>θ_{t+1} = θ_t - η ∇ J(θ_t)</code></pre>

<h3>Key Optimizers</h3>
<ul>
  <li><strong>SGD with Momentum:</strong> Accumulates velocity vector to dampen oscillations across ravine gradients.</li>
  <li><strong>Adam (Adaptive Moment Estimation):</strong> Computes adaptive learning rates for each parameter using first (mean) and second (uncentered variance) moment estimates.</li>
</ul>

<h3>Cross-Course Connection</h3>
<p>The Hessian matrix of second derivatives connects directly with <mark style="background-color: #fef08a;">MATH 210 curvature analysis</mark>, determining saddle points vs local minima.</p>`,
    courseId: 'course_ai401',
    tags: ['gradient-descent', 'adam', 'optimization', 'deep-learning'],
    pinned: true,
    inTrash: false,
    createdAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 86400 * 1000).toISOString(),
    highlightedTerms: ['Gradient Descent', 'Adam', 'Momentum', 'Hessian Matrix', 'Saddle Points']
  }
];

export const initialFiles: DocumentFile[] = [
  {
    id: 'file_cs302_slides',
    name: 'CS302_Lecture12_SelfBalancingTrees.pdf',
    sizeBytes: 4200000,
    fileType: 'pdf',
    status: 'fully_read',
    pageCount: 38,
    uploadedAt: new Date(Date.now() - 4 * 86400 * 1000).toISOString(),
    courseId: 'course_cs302',
    isFavorite: true,
    summary: 'Comprehensive analysis of self-balancing binary search trees covering 2-3 trees, AVL rotations, and Red-Black invariant maintenance.',
    chunks: [
      {
        id: 'chunk_1',
        page: 7,
        content: 'Definition: An AVL tree is a BST with the property that for every node v, |height(left(v)) - height(right(v))| <= 1. If an insertion violates this property, rebalancing is performed via tree rotations.',
        hasVisuals: true,
        visualDescription: 'Tree diagram showing balance factor calculations at root and child nodes with left-heavy subtree.'
      },
      {
        id: 'chunk_2',
        page: 14,
        content: 'Left-Right Double Rotation: When a new key is added into the right subtree of the left child of node k3, we first execute left_rotate(k1) followed by right_rotate(k3).',
        hasVisuals: true,
        visualDescription: 'Step-by-step schematic of pointer reassignment during double rotation.'
      },
      {
        id: 'chunk_3',
        page: 29,
        content: 'Theorem: The maximum height of an AVL tree with n nodes is bounded by 1.4404 * log2(n + 2) - 0.3277. Proof uses Fibonacci tree bounds as the minimal node configuration.',
        hasVisuals: false
      }
    ]
  },
  {
    id: 'file_ai401_backprop',
    name: 'DeepLearning_Ch06_Backpropagation.pdf',
    sizeBytes: 8900000,
    fileType: 'pdf',
    status: 'fully_read',
    pageCount: 44,
    uploadedAt: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
    courseId: 'course_ai401',
    isFavorite: true,
    summary: 'Vectorized derivations of the computational graph backpropagation algorithm, chain rule, and automatic differentiation.',
    chunks: [
      {
        id: 'chunk_ai_1',
        page: 12,
        content: 'Computational Graphs: In forward propagation, input tensors pass through affine transformations followed by non-linear activations (ReLU, GELU). In backward propagation, the upstream gradient dL/dz is multiplied by the local Jacobian matrix.',
        hasVisuals: true,
        visualDescription: 'Directed acyclic computation graph showing forward flow and reverse adjoint gradients.'
      },
      {
        id: 'chunk_ai_2',
        page: 25,
        content: 'Vanishing Gradients: When using deep networks with Sigmoid or Tanh activations, the derivative saturates to near-zero for large inputs, preventing gradient flow to early layers.',
        hasVisuals: false
      }
    ]
  }
];

export const initialFlashcards: Flashcard[] = [
  {
    id: 'fc_1',
    deckId: 'deck_cs302',
    courseId: 'course_cs302',
    question: 'What is the maximum balance factor allowed in an AVL tree node?',
    answer: 'The balance factor must strictly be within {-1, 0, 1}. A balance factor of -2 or +2 triggers an immediate rotation.',
    citation: { file: 'CS302_Lecture12_SelfBalancingTrees.pdf', pageOrSlide: 'Page 7', quote: '|height(left(v)) - height(right(v))| <= 1' },
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 1,
    lapses: 0,
    dueDate: new Date().toISOString().slice(0, 10), // Due today
    state: 'review'
  },
  {
    id: 'fc_2',
    deckId: 'deck_cs302',
    courseId: 'course_cs302',
    question: 'When is a Double Left-Right (LR) rotation required instead of a single rotation?',
    answer: 'When a node is left-heavy (balance factor +2) and its left child is right-heavy (balance factor -1), creating a zigzag path.',
    citation: { file: 'CS302_Lecture12_SelfBalancingTrees.pdf', pageOrSlide: 'Page 14' },
    easeFactor: 2.4,
    intervalDays: 0,
    repetitions: 0,
    lapses: 1,
    dueDate: new Date().toISOString().slice(0, 10), // Due today
    state: 'learning'
  },
  {
    id: 'fc_3',
    deckId: 'deck_ai401',
    courseId: 'course_ai401',
    question: 'Why does the Adam optimizer maintain both first and second moment vectors?',
    answer: 'The first moment (mean) provides momentum to accelerate in consistent directions, while the second moment (variance) scales the step size per parameter inversely with gradient variance.',
    citation: { file: 'DeepLearning_Ch06_Backpropagation.pdf', pageOrSlide: 'Page 31' },
    easeFactor: 2.6,
    intervalDays: 3,
    repetitions: 2,
    lapses: 0,
    dueDate: new Date().toISOString().slice(0, 10), // Due today
    state: 'review'
  },
  {
    id: 'fc_4',
    deckId: 'deck_math210',
    courseId: 'course_math210',
    question: 'What is the characteristic equation used to solve for matrix eigenvalues?',
    answer: 'det(A - λI) = 0, where A is the square matrix, λ is the scalar eigenvalue, and I is the identity matrix.',
    easeFactor: 2.7,
    intervalDays: 6,
    repetitions: 3,
    lapses: 0,
    dueDate: new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 10), // Tomorrow
    state: 'review'
  }
];

export const initialDecks: FlashcardDeck[] = [
  { id: 'deck_cs302', name: 'CS 302: Trees & Balanced Structures', courseId: 'course_cs302', tag: 'Midterm 1' },
  { id: 'deck_ai401', name: 'AI 401: Deep Learning & Optimizers', courseId: 'course_ai401', tag: 'Neural Nets' },
  { id: 'deck_math210', name: 'MATH 210: Eigenvalues & Linear Systems', courseId: 'course_math210', tag: 'Exam Prep' }
];

export const initialFocusSessions: FocusSession[] = [
  { id: 'foc_1', durationMinutes: 25, actualMinutes: 25, taskId: 'task_avl_1', courseId: 'course_cs302', label: 'AVL Invariant Study', timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
  { id: 'foc_2', durationMinutes: 25, actualMinutes: 25, taskId: 'task_avl_2', courseId: 'course_cs302', label: 'Height Calculations', timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { id: 'foc_3', durationMinutes: 50, actualMinutes: 48, courseId: 'course_ai401', label: 'Backpropagation Derivation', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
  { id: 'foc_4', durationMinutes: 25, actualMinutes: 25, courseId: 'course_math210', label: 'Orthogonal Projections', timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
  { id: 'foc_5', durationMinutes: 45, actualMinutes: 42, courseId: 'course_web250', label: 'Docker Compose Setup', timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString() }
];

export const initialQuizzes: Quiz[] = [
  {
    id: 'quiz_cs302_avl',
    title: 'AVL Trees & Self-Balancing Invariants Quiz',
    courseId: 'course_cs302',
    fileId: 'file_cs302_slides',
    difficulty: 'medium',
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        prompt: 'What is the tight worst-case time complexity of inserting an element into an AVL tree with n nodes?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 'O(log n)',
        explanation: 'Due to height balancing bounded by 1.44 log₂(n), lookup, insertion, and rebalancing rotations require at most O(log n) steps.',
        topic: 'Complexity'
      },
      {
        id: 'q2',
        type: 'tf',
        prompt: 'True or False: A single left rotation alone can fix a Left-Right (LR) zigzag imbalance.',
        correctAnswer: 'False',
        explanation: 'A zigzag LR imbalance requires a double rotation: first a left rotation on the child, followed by a right rotation on the parent.',
        topic: 'Tree Rotations'
      },
      {
        id: 'q3',
        type: 'short',
        prompt: 'What is the balance factor of a node whose left subtree has height 4 and right subtree has height 2?',
        correctAnswer: '2',
        explanation: 'Balance factor = height(left) - height(right) = 4 - 2 = 2. This violates AVL balance and requires rebalancing.',
        topic: 'Balance Factor Calculation'
      }
    ],
    attempts: [
      {
        id: 'att_1',
        date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        score: 67,
        userAnswers: { q1: 'O(log n)', q2: 'True', q3: '2' },
        weakTopics: ['Tree Rotations']
      }
    ]
  }
];

export const initialExams: Exam[] = [
  {
    id: 'exam_cs302_midterm',
    name: 'CS 302 Midterm: Trees, Graphs & Dynamic Programming',
    courseId: 'course_cs302',
    date: new Date(Date.now() + 6 * 86400 * 1000).toISOString().slice(0, 10), // In 6 days
    weightPercentage: 25,
    readinessPercent: 68,
    room: 'Great Hall Aud 2',
    revisionSessions: [
      { id: 'rev_1', examId: 'exam_cs302_midterm', sessionNumber: 1, title: 'Session 1: Balanced Trees & AVL Invariant Mastery', date: new Date(Date.now() + 1 * 86400 * 1000).toISOString().slice(0, 10), durationMinutes: 60, focusArea: 'notes', completed: false },
      { id: 'rev_2', examId: 'exam_cs302_midterm', sessionNumber: 2, title: 'Session 2: Active Flashcard Recall on Tree Rotations', date: new Date(Date.now() + 2 * 86400 * 1000).toISOString().slice(0, 10), durationMinutes: 45, focusArea: 'flashcards', completed: false },
      { id: 'rev_3', examId: 'exam_cs302_midterm', sessionNumber: 3, title: 'Session 3: Practice Test & Weak Topic Drill on Graphs', date: new Date(Date.now() + 3 * 86400 * 1000).toISOString().slice(0, 10), durationMinutes: 60, focusArea: 'weak_topics', completed: false },
      { id: 'rev_4', examId: 'exam_cs302_midterm', sessionNumber: 4, title: 'Session 4: Consolidation & High-Difficulty Proofs', date: new Date(Date.now() + 4 * 86400 * 1000).toISOString().slice(0, 10), durationMinutes: 75, focusArea: 'consolidation', completed: false },
      { id: 'rev_5', examId: 'exam_cs302_midterm', sessionNumber: 5, title: 'Session 5: Eve-of-Exam Formula & Invariant Fast Review', date: new Date(Date.now() + 5 * 86400 * 1000).toISOString().slice(0, 10), durationMinutes: 40, focusArea: 'eve_of_exam', completed: false }
    ]
  },
  {
    id: 'exam_math210_final',
    name: 'MATH 210 Final Examination',
    courseId: 'course_math210',
    date: new Date(Date.now() + 21 * 86400 * 1000).toISOString().slice(0, 10), // In 21 days
    weightPercentage: 40,
    readinessPercent: 42,
    room: 'Euler 100',
    revisionSessions: []
  }
];

export const initialGradeItems: GradeItem[] = [
  // CS 302
  { id: 'g_1', courseId: 'course_cs302', name: 'Assignment 1: Linked Lists & Stacks', category: 'homework', earnedScore: 96, maxScore: 100, weightPercent: 10 },
  { id: 'g_2', courseId: 'course_cs302', name: 'Assignment 2: Hash Tables & Open Addressing', category: 'homework', earnedScore: 92, maxScore: 100, weightPercent: 10 },
  { id: 'g_3', courseId: 'course_cs302', name: 'Lab 1: Memory Profiling in C++', category: 'lab', earnedScore: 100, maxScore: 100, weightPercent: 5 },
  { id: 'g_4', courseId: 'course_cs302', name: 'Midterm Examination', category: 'exam', earnedScore: 0, maxScore: 100, weightPercent: 25, isUngraded: true },
  
  // AI 401
  { id: 'g_5', courseId: 'course_ai401', name: 'Quiz 1: Probability & Bayes Rule', category: 'quiz', earnedScore: 88, maxScore: 100, weightPercent: 10 },
  { id: 'g_6', courseId: 'course_ai401', name: 'Project 1: Linear Regression from Scratch', category: 'project', earnedScore: 95, maxScore: 100, weightPercent: 20 },
  
  // MATH 210
  { id: 'g_7', courseId: 'course_math210', name: 'Problem Set 1: Vector Spaces', category: 'homework', earnedScore: 85, maxScore: 100, weightPercent: 15 },
  { id: 'g_8', courseId: 'course_math210', name: 'Quiz 1: Matrix Inverses & Determinants', category: 'quiz', earnedScore: 90, maxScore: 100, weightPercent: 15 },
  
  // WEB 250
  { id: 'g_9', courseId: 'course_web250', name: 'Lab 1: Docker Containers', category: 'lab', earnedScore: 98, maxScore: 100, weightPercent: 15 },
  { id: 'g_10', courseId: 'course_web250', name: 'Milestone 1: Architecture RFC', category: 'project', earnedScore: 94, maxScore: 100, weightPercent: 20 }
];

export const initialAiMemories: AiMemory[] = [
  { id: 'mem_1', fact: 'Prefers deep focus study blocks between 09:00 and 12:00 in the morning.', category: 'schedule', createdAt: '2026-10-15' },
  { id: 'mem_2', fact: 'Targeting a 3.8+ GPA this term to qualify for undergraduate research fellowship.', category: 'goal', createdAt: '2026-10-18' },
  { id: 'mem_3', fact: 'Frequently stumbles on zigzag double rotations in tree balance problems.', category: 'weakness', createdAt: '2026-10-22' }
];

export const initialDailyPlan: DailyPlan = {
  date: new Date().toISOString().slice(0, 10),
  generatedBy: 'ai',
  blocks: [
    { id: 'b_1', time: '09:00 - 10:30', title: 'CS 302 Lecture: Turing Hall 101', type: 'class', completed: true, courseId: 'course_cs302' },
    { id: 'b_2', time: '11:00 - 12:15', title: 'Deep Work: Finish AVL Single Left/Right Rotations', type: 'study', completed: false, courseId: 'course_cs302', taskId: 'task_avl_3' },
    { id: 'b_3', time: '12:15 - 13:00', title: 'Lunch & Screen Break', type: 'break', completed: false },
    { id: 'b_4', time: '13:00 - 14:30', title: 'AI 401 Lecture: Lovelace Auditorium', type: 'class', completed: false, courseId: 'course_ai401' },
    { id: 'b_5', time: '15:00 - 16:00', title: 'Review 3 Due Flashcards & Solve 1 Quiz', type: 'study', completed: false, courseId: 'course_cs302' },
    { id: 'b_6', time: '16:30 - 17:30', title: 'Math 210 Problem Set Questions 5-9', type: 'study', completed: false, courseId: 'course_math210', taskId: 'task_math_prob' },
    { id: 'b_7', time: '17:30 - 18:00', title: 'Daily Review & Tomorrow Prep', type: 'review', completed: false }
  ]
};

export const initialInboxItems: InboxItem[] = [
  {
    id: 'inbox_1',
    title: 'Research Paper: FlashAttention-3 Fast Algorithms',
    content: 'Recommended by Prof. Chen during office hours. Contains useful GPU memory tiling techniques for project.',
    type: 'bookmark',
    url: 'https://arxiv.org/abs/2407.08608',
    processed: false,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: 'inbox_2',
    title: 'Dr. Vance: Office Hours Room Change',
    content: 'Tomorrow’s office hours will be held online via Zoom instead of Turing Hall 312.',
    type: 'email',
    emailSender: 'evelyn.vance@uel.ac.uk',
    emailSubject: 'CS 302 Office Hours update',
    processed: false,
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  },
  {
    id: 'inbox_3',
    title: 'Idea: Build visualization tool for Red-Black tree recoloring',
    content: 'Could use SVG canvas to step through insert operations for bonus project credit.',
    type: 'note',
    processed: false,
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  }
];

export const initialEvents: CalendarEvent[] = [
  {
    id: 'ev_1',
    title: 'CS 302 Office Hours (Online)',
    description: 'Clarification on AVL tree submission tests',
    location: 'Zoom Meeting ID: 882 1923',
    start: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 11) + '14:00',
    end: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 11) + '15:30',
    allDay: false,
    type: 'meeting',
    courseId: 'course_cs302',
    provider: 'local'
  },
  {
    id: 'ev_2',
    title: 'Guest Lecture: Scalable AI in Autonomous Driving',
    description: 'Dr. Maya Lin, Senior Research Scientist',
    location: 'Great Hall',
    start: new Date(Date.now() + 72 * 3600 * 1000).toISOString().slice(0, 11) + '16:00',
    end: new Date(Date.now() + 72 * 3600 * 1000).toISOString().slice(0, 11) + '18:00',
    allDay: false,
    type: 'event',
    provider: 'outlook'
  }
];

export const initialIntegrations: IntegrationConnector[] = [
  {
    provider: 'google',
    name: 'Google Calendar (OAuth 2.0)',
    connected: true,
    lastSync: '10 minutes ago',
    status: 'ok',
    importedCount: 14,
    skippedCount: 2,
    updatedCount: 3
  },
  {
    provider: 'outlook',
    name: 'Microsoft Outlook (Graph API)',
    connected: true,
    lastSync: '25 minutes ago',
    status: 'ok',
    importedCount: 8,
    skippedCount: 0,
    updatedCount: 1
  },
  {
    provider: 'moodle',
    name: 'University Moodle LMS',
    connected: true,
    lastSync: '1 hour ago',
    status: 'ok',
    importedCount: 4,
    skippedCount: 12,
    updatedCount: 2
  },
  {
    provider: 'github',
    name: 'GitHub Personal Access Token',
    connected: true,
    lastSync: '5 minutes ago',
    status: 'ok',
    importedCount: 22,
    skippedCount: 0,
    updatedCount: 0
  }
];

export const initialRepos: GitHubRepo[] = [
  {
    id: 'repo_cs302',
    courseId: 'course_cs302',
    owner: 'alexrivera-uel',
    repo: 'cs302-algorithms-lab',
    branch: 'main',
    notes: 'Primary coursework repository containing balanced trees, priority queues, and graph search implementations.',
    commits: [
      {
        hash: '7c8a14f',
        shortHash: '7c8a14f',
        author: 'Alex Rivera',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        message: 'feat(avl): add recursive height update and balance factor computation',
        date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        additions: 48,
        deletions: 12,
        changedFiles: 2,
        isOwnCommit: true,
        seen: true,
        aiSummary: 'Implemented height caching for AVL tree nodes; next step is implementing single left/right rotation methods.'
      },
      {
        hash: 'b2e910c',
        shortHash: 'b2e910c',
        author: 'Alex Rivera',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        message: 'test(bst): add randomized permutation test runner',
        date: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
        additions: 74,
        deletions: 5,
        changedFiles: 1,
        isOwnCommit: true,
        seen: true
      }
    ]
  }
];

export const initialNotifications: AppNotification[] = [
  {
    id: 'notif_1',
    title: 'Assignment Due Soon',
    message: 'Balanced Binary Search Trees & AVL Rotations is due in less than 24 hours.',
    type: 'assignment',
    timestamp: '20 minutes ago',
    read: false,
    link: 'assignments'
  },
  {
    id: 'notif_2',
    title: '3 Flashcards Due for Review',
    message: 'Maintain your SM-2 retention streak for CS 302 and AI 401.',
    type: 'reminder',
    timestamp: '1 hour ago',
    read: false,
    link: 'studyhub'
  },
  {
    id: 'notif_3',
    title: 'Class Countdown: AI 401 Lecture',
    message: 'Starts at 13:00 in Lovelace Auditorium.',
    type: 'class',
    timestamp: '2 hours ago',
    read: true,
    link: 'schedule'
  }
];

export const initialReminderLogs: ReminderLog[] = [
  {
    id: 'log_1',
    scheduledTime: '08:00 AM',
    actualTime: '08:00:03 AM',
    title: 'Morning Academic Digest (4 classes, 2 tasks, 3 flashcards)',
    category: 'Daily Digest',
    status: 'delivered',
    latenessMinutes: 0
  },
  {
    id: 'log_2',
    scheduledTime: '10:00 AM',
    actualTime: '10:00:12 AM',
    title: 'CS 302 Assignment 1 Deadline Warning (24h lead)',
    category: 'Assignment Lead Time',
    status: 'delivered',
    latenessMinutes: 0
  }
];
