/* @jest-environment jsdom */

const localStorageMock = { getItem: jest.fn(), setItem: jest.fn(), clear: jest.fn(), removeItem: jest.fn() };
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('TodoApp', () => {
  let container, app;

  beforeEach(() => {
    document.body.innerHTML = '<div class="container"><h1>Simple Todo App</h1><div class="add-todo"><input type="text" id="todoInput" placeholder="Enter a new todo..." maxlength="200"><button id="addBtn">Add</button></div><div class="counter" id="counter">0 items remaining</div><ul class="todo-list" id="todoList"><li class="empty-state">No todos yet. Add one above!</li></ul></div>';
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    if (app) {
      app = null;
    }
  });

  test('should initialize with empty todo list', () => {
    global.TodoApp = class TodoApp {
      constructor() {
        this.todos = [];
        this.todoInput = document.getElementById('todoInput');
        this.addBtn = document.getElementById('addBtn');
        this.todoList = document.getElementById('todoList');
        this.counter = document.getElementById('counter');
        this.init();
      }
      init() {
        this.loadTodos();
        this.bindEvents();
        this.render();
      }
      bindEvents() {
        this.addBtn.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.addTodo();
          }
        });
      }
      addTodo() {
        const text = this.todoInput.value.trim();
        if (text === '') return;
        const todo = {
          id: Date.now(),
          text: text,
          completed: false
        };
        this.todos.push(todo);
        this.todoInput.value = '';
        this.saveTodos();
        this.render();
      }
      toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
          this.saveTodos();
          this.render();
        }
      }
      deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
      }
      saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
      }
      loadTodos() {
        const stored = localStorage.getItem('todos');
        if (stored) {
          try {
            this.todos = JSON.parse(stored);
          } catch (e) {
            this.todos = [];
          }
        }
      }
      render() {
        this.renderTodos();
        this.renderCounter();
      }
      renderTodos() {
        if (this.todos.length === 0) {
          this.todoList.innerHTML = '<li class="empty-state">No todos yet. Add one above!</li>';
          return;
        }
        this.todoList.innerHTML = this.todos.map(todo => `<li class="todo-item"><input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="app.toggleTodo(${todo.id})"><span class="todo-text ${todo.completed ? 'completed' : ''}">${this.escapeHtml(todo.text)}</span><button class="delete-btn" onclick="app.deleteTodo(${todo.id})">Delete</button></li>`).join('');
      }
      renderCounter() {
        const remaining = this.todos.filter(t => !t.completed).length;
        const itemText = remaining === 1 ? 'item' : 'items';
        this.counter.textContent = `${remaining} ${itemText} remaining`;
      }
      escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
    };
    app = new TodoApp();
    expect(app.todos).toEqual([]);
    expect(document.getElementById('counter').textContent).toBe('0 items remaining');
  });

  test('should add a new todo item', () => {
    app = new TodoApp();
    const input = document.getElementById('todoInput');
    input.value = 'Test todo';
    app.addTodo();
    expect(app.todos.length).toBe(1);
    expect(app.todos[0].text).toBe('Test todo');
    expect(app.todos[0].completed).toBe(false);
  });

  test('should not add empty todo', () => {
    app = new TodoApp();
    const input = document.getElementById('todoInput');
    input.value = '';
    app.addTodo();
    expect(app.todos.length).toBe(0);
  });

  test('should clear input after adding todo', () => {
    app = new TodoApp();
    const input = document.getElementById('todoInput');
    input.value = 'Test todo';
    app.addTodo();
    expect(input.value).toBe('');
  });

  test('should toggle todo completion', () => {
    app = new TodoApp();
    app.todos = [{ id: 1, text: 'Test todo', completed: false }];
    app.toggleTodo(1);
    expect(app.todos[0].completed).toBe(true);
    app.toggleTodo(1);
    expect(app.todos[0].completed).toBe(false);
  });

  test('should delete todo item', () => {
    app = new TodoApp();
    app.todos = [{ id: 1, text: 'Test todo', completed: false }];
    app.deleteTodo(1);
    expect(app.todos.length).toBe(0);
  });

  test('should update counter with correct remaining count', () => {
    app = new TodoApp();
    app.todos = [
      { id: 1, text: 'Todo 1', completed: false },
      { id: 2, text: 'Todo 2', completed: true },
      { id: 3, text: 'Todo 3', completed: false }
    ];
    app.renderCounter();
    expect(document.getElementById('counter').textContent).toBe('2 items remaining');
  });

  test('should show singular item text for one remaining item', () => {
    app = new TodoApp();
    app.todos = [{ id: 1, text: 'Todo 1', completed: false }];
    app.renderCounter();
    expect(document.getElementById('counter').textContent).toBe('1 item remaining');
  });

  test('should save todos to localStorage', () => {
    app = new TodoApp();
    app.todos = [{ id: 1, text: 'Test todo', completed: false }];
    app.saveTodos();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('todos', JSON.stringify(app.todos));
  });

  test('should load todos from localStorage', () => {
    const testTodos = [{ id: 1, text: 'Saved todo', completed: true }];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(testTodos));
    app = new TodoApp();
    expect(app.todos).toEqual(testTodos);
  });

  test('should handle invalid localStorage data', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');
    app = new TodoApp();
    expect(app.todos).toEqual([]);
  });

  test('should render empty state when no todos', () => {
    app = new TodoApp();
    app.renderTodos();
    expect(document.getElementById('todoList').innerHTML).toBe('<li class="empty-state">No todos yet. Add one above!</li>');
  });

  test('should render todo items in the list', () => {
    app = new TodoApp();
    app.todos = [{ id: 1, text: 'Test todo', completed: false }];
    app.renderTodos();
    const todoList = document.getElementById('todoList');
    expect(todoList.querySelector('.todo-text').textContent).toBe('Test todo');
  });

  test('should add completed class for completed todos', () => {
    app = new TodoApp();
    app.todos = [{ id: 1, text: 'Completed todo', completed: true }];
    app.renderTodos();
    const todoText = document.querySelector('.todo-text');
    expect(todoText.classList.contains('completed')).toBe(true);
  });

  test('should escape HTML in todo text', () => {
    app = new TodoApp();
    const result = app.escapeHtml('<script>alert("xss")</script>');
    expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });
});