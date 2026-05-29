const express = require('express');
const fs = require('fs'); // Importando o módulo File System para persistência
const app = express();
const port = 3000;
const FILE_PATH = './tasks.json';

// Middleware para a aplicação entender JSON no corpo das requisições
app.use(express.json());

// Middleware de Logs
// Registra no terminal o método HTTP, a URL e o horário exato de cada requisição
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next(); // Passa para a próxima rota ou middleware
});

// Persistência em arquivo JSON
// Função auxiliar para carregar as tarefas do arquivo ou criá-lo com dados padrões
function loadTasks() {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      // Se o arquivo não existir, criamos com os dados iniciais do seu código
      const initialTasks = [
        { id: 1, description: 'Jogar no PC' },
        { id: 2, description: 'Estudar Node.js' },
        { id: 3, description: 'Fazer exercícios' }
      ];
      fs.writeFileSync(FILE_PATH, JSON.stringify(initialTasks, null, 2));
      return initialTasks;
    }
    const fileData = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error("Erro ao ler o arquivo de tarefas:", error);
    return [];
  }
}

// Função auxiliar para salvar as modificações de volta no arquivo JSON
function saveTasks(tasks) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error("Erro ao salvar as tarefas no arquivo:", error);
  }
}

// Rota GET - Buscar todas as tarefas 
app.get('/tasks', (req, res) => {
  let tasks = loadTasks();

  const { search, page, limit } = req.query;

  // Filtros de busca 
  if (search) {
    tasks = tasks.filter(task => 
      task.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Paginação de resultados
  if (page && limit) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    tasks = tasks.slice(startIndex, endIndex);
  }

  res.status(200).json(tasks);
});

// Rota GET - Buscar tarefa por ID
app.get('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const id = parseInt(req.params.id);
  const task = tasks.find(task => task.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  res.status(200).json(task);
});

// Rota POST - Criar nova tarefa
app.post('/tasks', (req, res) => {
  const tasks = loadTasks();
  const newTask = req.body;

  // Validação simples de campo para evitar objetos inválidos
  if (!newTask.description || typeof newTask.description !== 'string') {
    return res.status(400).json({ error: 'O campo "description" é obrigatório e deve ser um texto.' });
  }

  // Define um ID automático sequencial e seguro baseado na última tarefa
  const lastId = tasks.length > 0 ? tasks[tasks.length - 1].id : 0;
  newTask.id = lastId + 1;
  
  tasks.push(newTask);
  saveTasks(tasks); // Salva no arquivo JSON
  
  res.status(201).json(newTask);
});

// Rota PUT - Atualizar tarefa existente (Substituição completa)
app.put('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const id = parseInt(req.params.id);
  const updatedTask = req.body;
  
  const taskIndex = tasks.findIndex(task => task.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  if (!updatedTask.description) {
    return res.status(400).json({ error: 'O campo "description" é obrigatório para atualização via PUT.' });
  }

  tasks[taskIndex] = {
    id: id,
    description: updatedTask.description
  };

  saveTasks(tasks); // Salva as alterações no arquivo

  res.status(200).json(tasks[taskIndex]);
});

// Rota PATCH - Atualização parcial
app.patch('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const id = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(task => task.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  // Mescla o que já existia com o que foi enviado no body, mantendo o ID original intacto
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...req.body,
    id: id 
  };

  saveTasks(tasks); // Salva no arquivo JSON

  res.status(200).json(tasks[taskIndex]);
});

// Rota DELETE - Remover tarefa
app.delete('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const id = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(task => task.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  tasks.splice(taskIndex, 1);
  saveTasks(tasks); // Atualiza o arquivo JSON após remover
  
  res.status(204).send();
});

// Inicialização do servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});