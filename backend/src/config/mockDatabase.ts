// In-Memory Mock für lokale Entwicklung ohne MongoDB-Installation
const mockUsers: any[] = [];
const mockTasks: any[] = [];

/**
 * Mock-Datenbank für lokale Entwicklung ohne MongoDB.
 * Verwendet In-Memory Arrays anstelle von MongoDB.
 */
export const connectMockDatabase = async (): Promise<void> => {
  console.log('🧪 Using MOCK DATABASE (In-Memory) for development');
  console.log('💡 Data will be lost on server restart');
  console.log('📝 Switch to real MongoDB when ready (see MONGODB_SETUP.md)');
  
  // Erstelle Mock-User für Testing
  mockUsers.push({
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com', 
    password: '$2a$12$dummy.hash.for.password123', // bcrypt hash for "password"
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Erstelle Demo-Tasks
  mockTasks.push(
    {
      _id: '507f1f77bcf86cd799439021',
      title: 'Setup Development Environment',
      description: 'Install and configure all necessary tools',
      status: 'done',
      priority: 'high',
      owner: '507f1f77bcf86cd799439011',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000)
    },
    {
      _id: '507f1f77bcf86cd799439022', 
      title: 'Design Database Schema',
      description: 'Define user and task models',
      status: 'in-progress',
      priority: 'medium',
      owner: '507f1f77bcf86cd799439011',
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      updatedAt: new Date()
    },
    {
      _id: '507f1f77bcf86cd799439023',
      title: 'Implement Authentication',  
      description: 'JWT-based auth with refresh tokens',
      status: 'todo',
      priority: 'high',
      owner: '507f1f77bcf86cd799439011',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  );
};

// Mock Model-ähnliche Funktionen für User
export const MockUser = {
  findOne: (query: any) => {
    const user = mockUsers.find(u => 
      (query.email && u.email === query.email) ||
      (query._id && u._id === query._id)
    );
    return user ? { 
      ...user,
      comparePassword: async (password: string) => password === 'password' // Mock auth
    } : null;
  },
  
  create: (data: any) => {
    const newUser = {
      _id: new Date().getTime().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockUsers.push(newUser);
    return newUser;
  }
};

// Mock Model-ähnliche Funktionen für Task
export const MockTask = {
  find: (query: any) => {
    const tasks = mockTasks.filter(t => 
      (!query.owner || t.owner === query.owner) &&
      (!query.status || t.status === query.status) &&
      (!query.priority || t.priority === query.priority)
    );
    return {
      sort: () => tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    };
  },

  findOne: (query: any) => {
    return mockTasks.find(t => 
      t._id === query._id && 
      (!query.owner || t.owner === query.owner)
    );
  },

  create: (data: any) => {
    const newTask = {
      _id: new Date().getTime().toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockTasks.push(newTask);
    return newTask;
  },

  findByIdAndUpdate: (id: string, update: any) => {
    const taskIndex = mockTasks.findIndex(t => t._id === id);
    if (taskIndex !== -1) {
      mockTasks[taskIndex] = { ...mockTasks[taskIndex], ...update, updatedAt: new Date() };
      return mockTasks[taskIndex];
    }
    return null;
  },

  findByIdAndDelete: (id: string) => {
    const taskIndex = mockTasks.findIndex(t => t._id === id);
    if (taskIndex !== -1) {
      return mockTasks.splice(taskIndex, 1)[0];
    }
    return null;
  }
};