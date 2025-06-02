// Aplicação Principal Modular
// Orquestra todos os módulos para criar a experiência completa

import { pipeline, env } from '@xenova/transformers';
import * as d3 from 'd3';
import { SemanticCategories } from './core/SemanticCategories.js';
import { WebGPUEngine } from './core/WebGPUEngine.js';
import { VisualizationEngine } from './core/VisualizationEngine.js';

// Configuração do ambiente
env.allowRemoteModels = true;
env.allowLocalModels = false;

class ModularEmbeddingVisualizer {
    constructor() {
        // Estado da aplicação
        this.model = null;
        this.isLoading = false;
        this.currentResults = [];
        this.currentTab = 'search';
        this.similarityThreshold = 0.50;
        this.inputWords = [];
        
        // Módulos especializados
        this.semanticCategories = new SemanticCategories();
        this.webgpuEngine = new WebGPUEngine();
        this.visualizationEngine = null; // Inicializado após DOM
        
        // Cache para otimização
        this.embeddingCache = new Map();
        
        this.initializeApp();
    }

    /**
     * Inicializa a aplicação
     */
    async initializeApp() {
        console.log('🚀 Iniciando Embedding Visualizer Modular v2.0');
        
        // Inicializar elementos DOM
        this.initializeElements();
        this.setupEventListeners();
        
        // Inicializar módulos
        await this.initializeModules();
        
        // Carregar modelo
        await this.loadModel();
    }

    /**
     * Inicializa elementos DOM
     */
    initializeElements() {
        // Elementos de abas
        this.searchTab = document.getElementById('searchTab');
        this.mathTab = document.getElementById('mathTab');
        this.searchTabContent = document.getElementById('searchTabContent');
        this.mathTabContent = document.getElementById('mathTabContent');
        
        // Elementos de busca
        this.wordInput = document.getElementById('wordInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.btnText = this.searchBtn.querySelector('.btn-text');
        this.loadingSpinner = this.searchBtn.querySelector('.loading-spinner');
        
        // Elementos de matemática
        this.mathExpression = document.getElementById('mathExpression');
        this.calculateBtn = document.getElementById('calculateBtn');
        this.calcBtnText = this.calculateBtn.querySelector('.calc-btn-text');
        this.calcLoadingSpinner = this.calculateBtn.querySelector('.calc-loading-spinner');
        
        // Elementos de visualização
        this.similarWords = document.getElementById('similarWords');
        this.networkGraph = document.getElementById('networkGraph');
        this.resultsTitle = document.getElementById('resultsTitle');
        
        // Status
        this.statusText = document.getElementById('statusText');
        this.progressFill = document.getElementById('progressFill');
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Sistema de abas
        this.searchTab.addEventListener('click', () => this.switchTab('search'));
        this.mathTab.addEventListener('click', () => this.switchTab('math'));
        
        // Busca semântica
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Exemplos de busca
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.wordInput.value = e.target.dataset.word;
                this.performSearch();
            });
        });

        // Cálculo semântico
        this.calculateBtn.addEventListener('click', () => this.performCalculation());
        this.mathExpression.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performCalculation();
        });
        
        // Exemplos de cálculo
        document.querySelectorAll('.math-example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.mathExpression.value = e.target.dataset.expr;
                this.performCalculation();
            });
        });
    }

    /**
     * Inicializa módulos especializados
     */
    async initializeModules() {
        console.log('🔧 Inicializando módulos...');
        
        // Inicializar WebGPU Engine
        await this.webgpuEngine.initialize();
        
        // Inicializar Visualization Engine
        this.visualizationEngine = new VisualizationEngine(
            this.networkGraph,
            this.semanticCategories.getCategoryColors()
        );
        
        console.log('✅ Módulos inicializados!');
        console.log('📊 Estatísticas:', this.semanticCategories.getStats());
    }

    /**
     * Carrega modelo de embeddings
     */
    async loadModel() {
        try {
            this.updateStatus('Carregando modelo E5-Small...', 10);
            
            this.model = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
                progress_callback: (progress) => {
                    if (progress.status === 'downloading') {
                        const percent = Math.round((progress.loaded / progress.total) * 80);
                        this.updateStatus(`Baixando: ${percent}%`, percent);
                    } else if (progress.status === 'loading') {
                        this.updateStatus('Carregando modelo...', 85);
                    }
                }
            });
            
            // Teste do modelo
            this.updateStatus('Testando modelo...', 90);
            const testEmbedding = await this.getEmbedding('teste');
            console.log('✅ Modelo testado:', testEmbedding.length, 'dimensões');
            
            this.updateStatus('Sistema pronto!', 100);
            this.enableInterface();
            
            setTimeout(() => {
                document.getElementById('statusBar').style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error('❌ Erro ao carregar modelo:', error);
            this.updateStatus('Erro ao carregar modelo. Recarregue a página.', 0);
        }
    }

    /**
     * Obtém embedding com cache
     */
    async getEmbedding(text) {
        if (!this.model) {
            throw new Error('Modelo não carregado');
        }
        
        // Verificar cache
        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }
        
        try {
            const processedText = text.toLowerCase().trim();
            const output = await this.model(processedText, { 
                pooling: 'mean', 
                normalize: true 
            });
            
            const embeddingData = Array.from(output.data || output);
            
            if (!embeddingData || embeddingData.length === 0) {
                throw new Error('Embedding vazio');
            }
            
            // Armazenar no cache
            this.embeddingCache.set(text, embeddingData);
            
            return embeddingData;
            
        } catch (error) {
            console.error(`Erro ao processar "${text}":`, error);
            throw error;
        }
    }

    /**
     * Calcula similaridades usando WebGPU ou CPU
     */
    async computeSimilarities(targetEmbedding, embeddings) {
        try {
            return await this.webgpuEngine.computeCosineSimilarity(targetEmbedding, embeddings);
        } catch (error) {
            console.warn('Fallback para CPU:', error);
            return this.webgpuEngine.computeCosineSimilarityCPU(targetEmbedding, embeddings);
        }
    }

    /**
     * Realiza busca semântica
     */
    async performSearch() {
        const word = this.wordInput.value.trim();
        if (!word || this.isLoading || !this.model) return;

        this.clearResults();
        this.setSearchLoading(true);
        
        try {
            this.inputWords = [word.toLowerCase()];
            
            console.log(`🔍 Busca: "${word}"`);
            const category = this.semanticCategories.getCategoryForWord(word);
            console.log(`📂 Categoria: ${category.name}`);
            
            // Calcular embeddings
            const targetEmbedding = await this.getEmbedding(word);
            const vocabulary = this.semanticCategories.getVocabulary();
            const wordsToCompare = vocabulary.filter(w => w.toLowerCase() !== word.toLowerCase());
            
            // Processar em lotes
            const embeddings = await this.processEmbeddingsBatch(wordsToCompare);
            
            // Calcular similaridades
            const similarities = await this.computeSimilarities(targetEmbedding, embeddings);
            
            // Aplicar ranking
            this.currentResults = this.rankResults(word, wordsToCompare, similarities);
            
            console.log(`✅ ${this.currentResults.length} resultados encontrados`);
            
            this.resultsTitle.textContent = `Busca: "${word}" (${category.name}) - ${this.currentResults.length} resultados`;
            this.displayResults();
            
        } catch (error) {
            console.error('Erro na busca:', error);
            alert('Erro ao buscar palavras similares.');
        } finally {
            this.setSearchLoading(false);
        }
    }

    /**
     * Realiza cálculo semântico
     */
    async performCalculation() {
        const expression = this.mathExpression.value.trim();
        if (!expression || this.isLoading || !this.model) return;

        this.clearResults();
        this.setCalcLoading(true);
        
        try {
            const parsedExpression = this.parseExpression(expression);
            if (!parsedExpression) {
                alert('Formato inválido. Use: palavra1 + palavra2 ou palavra1 - palavra2');
                return;
            }

            this.inputWords = parsedExpression.map(item => item.word.toLowerCase());
            
            console.log(`🧮 Cálculo: "${expression}"`);
            
            // Calcular embedding resultante
            let resultEmbedding = await this.getEmbedding(parsedExpression[0].word);
            
            for (let i = 1; i < parsedExpression.length; i++) {
                const item = parsedExpression[i];
                const embedding = await this.getEmbedding(item.word);
                
                if (item.operation === '+') {
                    resultEmbedding = resultEmbedding.map((val, idx) => val + embedding[idx]);
                } else {
                    resultEmbedding = resultEmbedding.map((val, idx) => val - embedding[idx]);
                }
            }
            
            // Normalizar
            const magnitude = Math.sqrt(resultEmbedding.reduce((sum, val) => sum + val * val, 0));
            resultEmbedding = resultEmbedding.map(val => val / magnitude);
            
            // Encontrar similares
            const vocabulary = this.semanticCategories.getVocabulary();
            const wordsToCompare = vocabulary.filter(word => 
                !this.inputWords.includes(word.toLowerCase())
            );
            
            const embeddings = await this.processEmbeddingsBatch(wordsToCompare);
            const similarities = await this.computeSimilarities(resultEmbedding, embeddings);
            
            this.currentResults = this.rankResults(this.inputWords[0], wordsToCompare, similarities);
            
            console.log(`✅ ${this.currentResults.length} resultados do cálculo`);
            
            this.resultsTitle.textContent = `Cálculo: ${expression} - ${this.currentResults.length} resultados`;
            this.displayResults();
            
        } catch (error) {
            console.error('Erro no cálculo:', error);
            alert('Erro ao realizar cálculo.');
        } finally {
            this.setCalcLoading(false);
        }
    }

    /**
     * Processa embeddings em lotes para otimização
     */
    async processEmbeddingsBatch(words, batchSize = 25) {
        const embeddings = [];
        
        for (let i = 0; i < words.length; i += batchSize) {
            const batch = words.slice(i, i + batchSize);
            const batchEmbeddings = await Promise.all(
                batch.map(w => this.getEmbedding(w))
            );
            embeddings.push(...batchEmbeddings);
        }
        
        return embeddings;
    }

    /**
     * Aplica ranking aos resultados
     */
    rankResults(baseWord, words, similarities) {
        const rankedResults = words.map((w, i) => {
            const cosineSim = similarities[i];
            const advancedSim = this.semanticCategories.calculateAdvancedSimilarity(baseWord, w, cosineSim);
            
            return {
                word: w,
                similarity: advancedSim,
                cosine: cosineSim,
                category: this.semanticCategories.getCategoryForWord(w).name
            };
        });
        
        return rankedResults
            .filter(r => r.similarity >= this.similarityThreshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 12);
    }

    /**
     * Parse de expressões matemáticas
     */
    parseExpression(expression) {
        const tokens = expression.replace(/\s+/g, ' ').split(/\s*([+-])\s*/);
        
        if (tokens.length < 3) return null;
        
        const result = [{ word: tokens[0].trim(), operation: null }];
        
        for (let i = 1; i < tokens.length; i += 2) {
            const operation = tokens[i];
            const word = tokens[i + 1];
            
            if ((operation === '+' || operation === '-') && word) {
                result.push({ word: word.trim(), operation });
            }
        }
        
        return result.length > 1 ? result : null;
    }

    /**
     * Troca de abas
     */
    switchTab(tab) {
        console.log(`🔄 Trocando para: ${tab}`);
        this.clearResults();
        this.currentTab = tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tab === 'search') {
            this.searchTab.classList.add('active');
            this.searchTabContent.classList.add('active');
        } else {
            this.mathTab.classList.add('active');
            this.mathTabContent.classList.add('active');
        }
    }

    /**
     * Exibe resultados
     */
    displayResults() {
        if (!this.currentResults.length) return;
        
        console.log('🎨 displayResults iniciado com', this.currentResults.length, 'resultados');
        
        // Lista
        console.log('📋 Renderizando lista...');
        this.visualizationEngine.renderResultsList(
            this.currentResults,
            this.similarWords,
            (word) => {
                if (this.currentTab === 'search') {
                    this.wordInput.value = word;
                    this.performSearch();
                } else {
                    this.mathExpression.value = word;
                }
            }
        );
        console.log('✅ Lista renderizada');
        
        // Grafo
        const centralWord = this.currentTab === 'search' ? 
            (this.wordInput.value || 'centro') : 
            (this.mathExpression.value || 'cálculo');
            
        console.log('🕸️ Renderizando grafo para palavra central:', centralWord);
        console.log('📊 Dados para o grafo:', {
            results: this.currentResults.length,
            inputWords: this.inputWords,
            centralWord: centralWord
        });
        
        try {
            this.visualizationEngine.renderInteractiveGraph(
                this.currentResults,
                this.inputWords,
                centralWord,
                (word) => {
                    if (this.currentTab === 'search') {
                        this.wordInput.value = word;
                        this.performSearch();
                    } else {
                        this.mathExpression.value = word;
                    }
                },
                // Passar métodos necessários para o grafo
                (text) => this.getEmbedding(text),
                (targetEmbedding, embeddings) => this.computeSimilarities(targetEmbedding, embeddings),
                this.semanticCategories
            );
            console.log('✅ Chamada do grafo concluída');
        } catch (error) {
            console.error('❌ Erro ao renderizar grafo:', error);
        }
    }

    /**
     * Limpa resultados
     */
    clearResults() {
        this.currentResults = [];
        this.inputWords = [];
        this.similarWords.innerHTML = '';
        this.networkGraph.innerHTML = '';
        this.resultsTitle.textContent = 'Resultados';
    }

    /**
     * Controla loading da busca
     */
    setSearchLoading(loading) {
        this.isLoading = loading;
        this.searchBtn.disabled = loading;
        
        if (loading) {
            this.btnText.style.display = 'none';
            this.loadingSpinner.style.display = 'inline';
        } else {
            this.btnText.style.display = 'inline';
            this.loadingSpinner.style.display = 'none';
        }
    }

    /**
     * Controla loading do cálculo
     */
    setCalcLoading(loading) {
        this.isLoading = loading;
        this.calculateBtn.disabled = loading;
        
        if (loading) {
            this.calcBtnText.style.display = 'none';
            this.calcLoadingSpinner.style.display = 'inline';
        } else {
            this.calcBtnText.style.display = 'inline';
            this.calcLoadingSpinner.style.display = 'none';
        }
    }

    /**
     * Atualiza status
     */
    updateStatus(text, progress) {
        this.statusText.textContent = text;
        this.progressFill.style.width = `${progress}%`;
    }

    /**
     * Habilita interface
     */
    enableInterface() {
        this.searchBtn.disabled = false;
        this.calculateBtn.disabled = false;
        this.wordInput.disabled = false;
        this.mathExpression.disabled = false;
    }

    /**
     * Finaliza aplicação
     */
    dispose() {
        this.webgpuEngine.dispose();
        this.visualizationEngine.dispose();
        this.embeddingCache.clear();
        console.log('🧹 Aplicação finalizada');
    }
}

// Inicializar aplicação modular
document.addEventListener('DOMContentLoaded', () => {
    window.embeddingVisualizer = new ModularEmbeddingVisualizer();
}); 