// Exemplos de Uso dos Módulos Individuais
// Como integrar cada módulo em projetos externos

import { SemanticCategories } from '../core/SemanticCategories.js';
import { WebGPUEngine } from '../core/WebGPUEngine.js';
import { VisualizationEngine } from '../core/VisualizationEngine.js';

// =================================
// 1. USANDO APENAS SEMANTIC CATEGORIES
// =================================

async function exemploSemanticCategories() {
    console.log('📚 Exemplo: SemanticCategories');
    
    const categories = new SemanticCategories();
    
    // Obter vocabulário completo
    const vocab = categories.getVocabulary();
    console.log(`Vocabulário: ${vocab.length} palavras`);
    
    // Identificar categoria de uma palavra
    const category = categories.getCategoryForWord('médica');
    console.log(`"médica" → categoria: ${category.name}, peso: ${category.weight}`);
    
    // Calcular similaridade avançada
    const similarity = categories.calculateAdvancedSimilarity('médico', 'médica', 0.85);
    console.log(`Similaridade médico↔médica: ${similarity.toFixed(3)}`);
    
    // Obter cores para visualização
    const colors = categories.getCategoryColors();
    console.log('Cores disponíveis:', Object.keys(colors));
    
    // Estatísticas
    const stats = categories.getStats();
    console.log('Estatísticas:', stats);
}

// =================================
// 2. USANDO APENAS WEBGPU ENGINE
// =================================

async function exemploWebGPUEngine() {
    console.log('⚡ Exemplo: WebGPUEngine');
    
    const engine = new WebGPUEngine();
    
    // Inicializar WebGPU
    const success = await engine.initialize();
    console.log(`WebGPU inicializado: ${success}`);
    
    if (success) {
        // Exemplo com dados de teste
        const targetEmbedding = new Array(384).fill(0).map(() => Math.random());
        const embeddings = Array.from({length: 100}, () => 
            new Array(384).fill(0).map(() => Math.random())
        );
        
        console.time('WebGPU Compute');
        const similarities = await engine.computeCosineSimilarity(targetEmbedding, embeddings);
        console.timeEnd('WebGPU Compute');
        
        console.log(`Calculadas ${similarities.length} similaridades`);
        console.log(`Primeira similaridade: ${similarities[0].toFixed(4)}`);
        
        // Informações do dispositivo
        const deviceInfo = engine.getDeviceInfo();
        console.log('Device Info:', deviceInfo);
    } else {
        // Fallback CPU
        console.time('CPU Compute');
        const targetEmbedding = new Array(384).fill(0).map(() => Math.random());
        const embeddings = Array.from({length: 100}, () => 
            new Array(384).fill(0).map(() => Math.random())
        );
        
        const similarities = engine.computeCosineSimilarityCPU(targetEmbedding, embeddings);
        console.timeEnd('CPU Compute');
        
        console.log(`Fallback CPU: ${similarities.length} similaridades calculadas`);
    }
    
    // Limpeza
    engine.dispose();
}

// =================================
// 3. USANDO APENAS VISUALIZATION ENGINE
// =================================

async function exemploVisualizationEngine() {
    console.log('🎨 Exemplo: VisualizationEngine');
    
    // Criar container de teste
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '400px';
    document.body.appendChild(container);
    
    const categories = new SemanticCategories();
    const colors = categories.getCategoryColors();
    
    const viz = new VisualizationEngine(container, colors);
    
    // Dados de exemplo
    const mockResults = [
        { word: 'amor', similarity: 0.95, category: 'emoções' },
        { word: 'carinho', similarity: 0.89, category: 'emoções' },
        { word: 'felicidade', similarity: 0.85, category: 'emoções' },
        { word: 'paixão', similarity: 0.82, category: 'emoções' },
        { word: 'bondade', similarity: 0.78, category: 'emoções' }
    ];
    
    const inputWords = ['amizade'];
    const centralWord = 'amizade';
    
    // Renderizar grafo
    await viz.renderInteractiveGraph(
        mockResults,
        inputWords, 
        centralWord,
        (word) => console.log(`Clicado: ${word}`)
    );
    
    // Criar container para lista
    const listContainer = document.createElement('div');
    listContainer.style.marginTop = '20px';
    document.body.appendChild(listContainer);
    
    // Renderizar lista
    viz.renderResultsList(
        mockResults,
        listContainer,
        (word) => console.log(`Item clicado: ${word}`)
    );
    
    console.log('Visualizações renderizadas!');
    
    // Limpeza após 10 segundos
    setTimeout(() => {
        viz.dispose();
        container.remove();
        listContainer.remove();
        console.log('Visualizações limpas');
    }, 10000);
}

// =================================
// 4. INTEGRAÇÃO CUSTOMIZADA
// =================================

class CustomEmbeddingApp {
    constructor() {
        this.categories = new SemanticCategories();
        this.webgpu = new WebGPUEngine();
        this.viz = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Inicializando app customizado...');
        
        // Inicializar WebGPU
        await this.webgpu.initialize();
        
        // Configurar visualização se houver container
        const container = document.getElementById('custom-viz');
        if (container) {
            this.viz = new VisualizationEngine(
                container, 
                this.categories.getCategoryColors()
            );
        }
        
        console.log('✅ App customizado pronto!');
    }
    
    async buscarSimilares(palavra, vocabularioCustom = null) {
        console.log(`🔍 Buscando similares para: ${palavra}`);
        
        const vocab = vocabularioCustom || this.categories.getVocabulary();
        const wordsToCompare = vocab.filter(w => w !== palavra);
        
        // Aqui você integraria com seu modelo de embeddings
        // const targetEmbedding = await seuModelo.getEmbedding(palavra);
        // const embeddings = await Promise.all(wordsToCompare.map(w => seuModelo.getEmbedding(w)));
        
        // Simulação para exemplo
        const similarities = wordsToCompare.map(() => Math.random());
        
        const results = wordsToCompare.map((w, i) => ({
            word: w,
            similarity: similarities[i],
            category: this.categories.getCategoryForWord(w).name
        }));
        
        // Ranking
        const ranked = results
            .filter(r => r.similarity > 0.5)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10);
        
        console.log(`✅ ${ranked.length} resultados encontrados`);
        
        // Visualizar se disponível
        if (this.viz) {
            await this.viz.renderInteractiveGraph(
                ranked,
                [palavra],
                palavra,
                (word) => this.buscarSimilares(word)
            );
        }
        
        return ranked;
    }
    
    dispose() {
        this.webgpu.dispose();
        if (this.viz) {
            this.viz.dispose();
        }
        console.log('🧹 App customizado finalizado');
    }
}

// =================================
// 5. EXEMPLO PARA NODEJS (SEM WEBGPU/D3)
// =================================

export function exemploNodeJS() {
    console.log('📦 Exemplo: Node.js (apenas SemanticCategories)');
    
    // No Node.js, use apenas SemanticCategories
    const categories = new SemanticCategories();
    
    // Análise de texto
    function analisarTexto(texto) {
        const palavras = texto.toLowerCase().split(/\s+/);
        const categorias = {};
        
        palavras.forEach(palavra => {
            const category = categories.getCategoryForWord(palavra);
            if (!categorias[category.name]) {
                categorias[category.name] = [];
            }
            categorias[category.name].push(palavra);
        });
        
        return categorias;
    }
    
    // Teste
    const texto = "O médico e a enfermeira demonstraram muito amor e carinho";
    const analise = analisarTexto(texto);
    console.log('Análise do texto:', analise);
    
    return analise;
}

// =================================
// EXECUTAR EXEMPLOS
// =================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Executando exemplos dos módulos...');
    
    try {
        // Exemplo 1: Categorias
        await exemploSemanticCategories();
        console.log('---');
        
        // Exemplo 2: WebGPU
        await exemploWebGPUEngine();
        console.log('---');
        
        // Exemplo 3: Visualização (se DOM disponível)
        if (typeof document !== 'undefined') {
            await exemploVisualizationEngine();
            console.log('---');
        }
        
        // Exemplo 4: App customizado
        const customApp = new CustomEmbeddingApp();
        setTimeout(async () => {
            await customApp.buscarSimilares('tecnologia');
            
            // Cleanup
            setTimeout(() => {
                customApp.dispose();
            }, 5000);
        }, 2000);
        
        console.log('✅ Todos os exemplos executados!');
        
    } catch (error) {
        console.error('❌ Erro nos exemplos:', error);
    }
});

// Para uso direto
export {
    exemploSemanticCategories,
    exemploWebGPUEngine, 
    exemploVisualizationEngine,
    CustomEmbeddingApp,
    exemploNodeJS
}; 