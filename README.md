# 🧠 Visualizador de Embeddings PT v2.0 - Modular

> **Sistema modular de visualização interativa de embeddings em português com aceleração WebGPU**

[![WebGPU](https://img.shields.io/badge/WebGPU-Accelerated-brightgreen)](https://webgpu.dev/)
[![ES2020](https://img.shields.io/badge/ES2020-Modules-blue)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
[![D3.js](https://img.shields.io/badge/D3.js-v7-orange)](https://d3js.org/)
[![Transformers.js](https://img.shields.io/badge/Transformers.js-Xenova-purple)](https://huggingface.co/docs/transformers.js/)

## 🚀 Novidades da v2.0

### **Arquitetura Modular**
- **Separação de responsabilidades** em módulos especializados
- **Manutenibilidade** e **escalabilidade** aprimoradas
- **Cache inteligente** de embeddings
- **Sistema de build otimizado** com Vite

### **Aceleração WebGPU Real** 
- **Shaders WGSL** customizados para similaridade cosseno
- **Processamento paralelo** em GPU para até **10x mais velocidade**
- **Fallback automático** para CPU quando WebGPU não disponível
- **Gestão eficiente** de memória GPU

### **Sistema Semântico Expandido**
- **150+ palavras** com versões **masculinas e femininas**
- **8 categorias balanceadas**: realeza, família, pessoas, profissões, emoções, objetos, natureza, abstratos
- **Ranking inteligente** que mantém proporções naturais
- **Filtros de qualidade** (similaridade > 50%)

## 📁 Estrutura Modular

```
emb/
├── 📂 core/                          # Módulos especializados
│   ├── 🧠 SemanticCategories.js     # Sistema de categorias
│   ├── ⚡ WebGPUEngine.js           # Aceleração GPU + WGSL
│   └── 🎨 VisualizationEngine.js    # D3.js + Grafos navegáveis
├── 🚀 main-modular.js               # Orquestrador principal
├── 🎯 index.html                    # Interface moderna
├── 🎨 style.css                     # Design system responsivo
├── ⚙️ vite.config.js                # Build otimizado
└── 📚 README.md                     # Esta documentação
```

## 🛠️ Arquitetura dos Módulos

### 🧠 **SemanticCategories.js**
```javascript
// Sistema inteligente de categorização
- getVocabulary() → 150+ palavras
- getCategoryForWord(word) → categoria + peso
- calculateAdvancedSimilarity() → ranking corrigido
- getCategoryColors() → paleta de visualização
```

### ⚡ **WebGPUEngine.js**
```javascript
// Aceleração GPU com shaders WGSL
- initialize() → configura WebGPU
- computeCosineSimilarity() → GPU paralela
- createCosineSimilarityShader() → WGSL customizado
- computeCosineSimilarityCPU() → fallback
```

### 🎨 **VisualizationEngine.js**
```javascript
// Visualizações interativas D3.js
- renderInteractiveGraph() → grafo navegável
- setupZoomBehavior() → zoom/pan/reset
- renderResultsList() → lista categorizada
- clearGraph() → limpeza eficiente
```

### 🚀 **ModularEmbeddingVisualizer**
```javascript
// Orquestrador principal
- initializeModules() → coordena especializações
- processEmbeddingsBatch() → otimizações de lote
- performSearch() → busca semântica
- performCalculation() → matemática semântica
```

## ⚡ Aceleração WebGPU

### **Shader WGSL Customizado**
```wgsl
@workgroup_size(64)
@compute
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // Calcular produto escalar e magnitudes em paralelo
    // Otimizado para similaridade cosseno em lotes
}
```


## 🎯 Funcionalidades

### **Busca Semântica Inteligente**
- Digite uma palavra e encontre **similares semanticamente**
- **Filtro automático** da palavra de entrada
- **Categorização visual** com cores

### **Cálculo Semântico (Matemática de Palavras)**
- `rei + mulher = rainha`
- `professor + mulher = professora, médica, doutora`
- **Operações**: `+` (somar) e `-` (subtrair)
- **Normalização automática** dos resultados

### **Visualizações Interativas**
1. **Lista Categorizada**: Resultados com % similaridade e categorias coloridas
2. **Grafo Navegável**: 
   - **Zoom/Pan**: Mouse scroll + arrastar
   - **Controles visuais**: Botões +/−/⌂
   - **Dois níveis**: 8 principais + relacionados
   - **Hover effects**: Destaque de conexões

## 🚀 Instalação e Uso

### **Desenvolvimento**
```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento (com hot reload)
npm run dev

# Abrir: http://localhost:3000
```

### **Produção**
```bash
# Build otimizado
npm run build

# Preview da build
npm run preview

# Deploy (gera dist/ otimizado)
npm run compact
```

## 🔧 Configuração Avançada

### **vite.config.js**
```javascript
export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@xenova/transformers', 'd3'],
          core: ['./core/*.js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@xenova/transformers', 'd3']
  }
});
```

## 📊 Tecnologias

| Componente | Tecnologia | Versão | Função |
|------------|------------|--------|--------|
| **Embeddings** | Transformers.js | ^3.0.0 | Modelo E5-Small multilíngue |
| **Aceleração** | WebGPU | Nativo | Shaders WGSL customizados |
| **Visualização** | D3.js | ^7.9.0 | Grafos interativos |
| **Build** | Vite | ^5.4.0 | Bundling + HMR |
| **Linguagem** | ES2020 | Nativo | Módulos + async/await |

## 🎨 Interface

### **Design System**
- **Cores**: Paleta moderna com categorias semânticas
- **Tipografia**: Inter font family (300-700)
- **Animações**: Transições suaves CSS + D3
- **Responsivo**: Mobile-first design
- **Acessibilidade**: Controles de teclado + labels

### **Componentes**
- **Abas interativas**: Busca vs Cálculo
- **Indicadores de loading**: Spinners sincronizados
- **Badges de categoria**: Cores semânticas
- **Controles de navegação**: Zoom profissional

## 🧪 Testes e Debug

### **Console Logs Estruturados**
```javascript
🚀 Iniciando Embedding Visualizer Modular v2.0
🔧 Inicializando módulos...
⚡ WebGPU Engine inicializado com sucesso!
🔍 Busca: "amizade"
📂 Categoria: emoções
✅ 8 resultados encontrados
```

### **Debug Mode**
- Logs detalhados de embeddings
- Métricas de performance WebGPU vs CPU
- Estatísticas de vocabulário
- Estado dos módulos

## 🔮 Roadmap v2.1

### **Próximas Funcionalidades**
- [ ] **Worker Threads** para embeddings em background
- [ ] **IndexedDB** para cache persistente
- [ ] **Modelos customizáveis** (troca dinâmica)
- [ ] **Exportação** de resultados (JSON/CSV)
- [ ] **Tema escuro** com toggle
- [ ] **PWA** com service worker

### **Otimizações Técnicas**
- [ ] **Tensor.js** para operações matemáticas avançadas
- [ ] **WebAssembly** para algoritmos críticos
- [ ] **Streaming** de grandes vocabulários
- [ ] **Compressão** de embeddings

## 📄 Licença

MIT License - Código aberto para uso educacional e comercial.

## 🤝 Contribuição

1. **Fork** o repositório
2. **Clone** localmente
3. **Instale** dependências: `npm install`
4. **Desenvolva** com `npm run dev`
5. **Teste** sua implementação
6. **Submit** Pull Request

---

<div align="center">

**🧠 Embedding Visualizer PT v2.0**  
*Arquitetura modular • Aceleração WebGPU • Design moderno*

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black)](https://github.com/user/embedding-visualizer-pt)
[![Demo](https://img.shields.io/badge/Demo-Live-green)](https://your-demo-url.com)

</div> 
