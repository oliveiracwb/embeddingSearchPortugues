import { pipeline, env } from '@xenova/transformers';
import * as d3 from 'd3';

// Configuração do ambiente
env.allowRemoteModels = true;
env.allowLocalModels = false;

class AdvancedEmbeddingVisualizer {
    constructor() {
        this.model = null;
        this.isLoading = false;
        this.currentResults = [];
        this.currentView = 'list';
        this.currentTab = 'search';
        this.similarityThreshold = 0.50; // Threshold ajustado para melhor qualidade
        this.inputWords = [];
        this.webgpuDevice = null;
        this.webgpuSupported = false;
        
        // Sistema de categorias semânticas expandido e equilibrado
        this.semanticCategories = {
            realeza: {
                weight: 2.0, // Reduzido de 3.0 para evitar dominância
                words: ['rei', 'rainha', 'príncipe', 'princesa', 'imperador', 'imperatriz', 'monarca', 'coroa', 'trono', 'palácio', 'reino', 'império', 'nobre', 'duque', 'duquesa', 'conde', 'condessa', 'barão', 'baronesa'],
                related: ['poder', 'governo', 'autoridade', 'estado', 'país', 'comandar', 'liderar', 'soberano', 'majestade', 'real', 'nobreza']
            },
            família: {
                weight: 2.5,
                words: ['pai', 'mãe', 'filho', 'filha', 'irmão', 'irmã', 'avô', 'avó', 'bisavô', 'bisavó', 'tio', 'tia', 'primo', 'prima', 'marido', 'esposa', 'namorado', 'namorada', 'noivo', 'noiva', 'família', 'parente', 'cunhado', 'cunhada', 'sogro', 'sogra'],
                related: ['amor', 'carinho', 'casa', 'lar', 'união', 'relacionamento', 'casamento', 'parentesco', 'laço', 'vínculo']
            },
            pessoas: {
                weight: 2.0,
                words: ['homem', 'mulher', 'criança', 'jovem', 'adulto', 'adulta', 'idoso', 'idosa', 'bebê', 'menino', 'menina', 'rapaz', 'moça', 'pessoa', 'gente', 'indivíduo', 'ser', 'humano', 'cidadão', 'cidadã'],
                related: ['vida', 'sociedade', 'comunidade', 'população', 'humanidade', 'gênero', 'idade']
            },
            profissões: {
                weight: 2.0,
                words: ['médico', 'médica', 'doutora', 'enfermeiro', 'enfermeira', 'professor', 'professora', 'engenheiro', 'engenheira', 'advogado', 'advogada', 'policial', 'bombeiro', 'bombeira', 'dentista', 'veterinário', 'veterinária', 'cozinheiro', 'cozinheira', 'garçom', 'garçonete', 'motorista', 'piloto', 'soldado', 'artista', 'músico', 'escritor', 'escritora', 'jornalista', 'arquiteto', 'arquiteta', 'psicólogo', 'psicóloga', 'farmacêutico', 'farmacêutica', 'contador', 'contadora'],
                related: ['trabalho', 'carreira', 'profissão', 'emprego', 'salário', 'ocupação', 'ofício', 'especialista']
            },
            emoções: {
                weight: 2.5,
                words: ['amor', 'felicidade', 'tristeza', 'raiva', 'medo', 'alegria', 'saudade', 'esperança', 'paz', 'paixão', 'ódio', 'inveja', 'ciúme', 'carinho', 'amizade', 'bondade', 'compaixão', 'gratidão', 'ansiedade', 'nervosismo', 'calma', 'serenidade', 'entusiasmo', 'melancolia'],
                related: ['sentimento', 'coração', 'alma', 'espírito', 'emocional', 'afeto', 'humor', 'estado']
            },
            objetos: {
                weight: 1.5,
                words: ['casa', 'carro', 'livro', 'telefone', 'computador', 'mesa', 'cadeira', 'cama', 'sofá', 'televisão', 'roupa', 'sapato', 'relógio', 'chave', 'dinheiro', 'porta', 'janela', 'espelho', 'lâmpada', 'geladeira'],
                related: ['objeto', 'coisa', 'item', 'material', 'produto', 'utensílio', 'ferramenta', 'equipamento']
            },
            natureza: {
                weight: 2.0,
                words: ['água', 'fogo', 'terra', 'ar', 'sol', 'lua', 'estrela', 'nuvem', 'chuva', 'vento', 'árvore', 'flor', 'planta', 'animal', 'cachorro', 'gato', 'pássaro', 'peixe', 'borboleta', 'abelha', 'floresta', 'montanha', 'rio', 'mar', 'oceano'],
                related: ['natural', 'ambiente', 'mundo', 'planeta', 'universo', 'ecologia', 'vida', 'selvagem']
            },
            abstratos: {
                weight: 1.8,
                words: ['vida', 'morte', 'tempo', 'espaço', 'conhecimento', 'sabedoria', 'verdade', 'mentira', 'liberdade', 'justiça', 'poder', 'força', 'energia', 'destino', 'sorte', 'futuro', 'passado', 'presente'],
                related: ['conceito', 'ideia', 'pensamento', 'filosofia', 'abstrato', 'teoria', 'princípio']
            }
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeWebGPU();
        this.loadAdvancedModel();
    }

    async initializeWebGPU() {
        try {
            if (!navigator.gpu) {
                console.log('WebGPU não suportado neste navegador');
                return;
            }

            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.log('Adaptador WebGPU não encontrado');
                return;
            }

            this.webgpuDevice = await adapter.requestDevice();
            this.webgpuSupported = true;
            console.log('🚀 WebGPU inicializado com sucesso! Aceleração ativada.');
            
            // Mostrar indicador WebGPU
            const indicator = document.getElementById('webgpuIndicator');
            if (indicator) {
                indicator.classList.add('active');
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 5000); // Esconder após 5 segundos
            }
            
        } catch (error) {
            console.log('WebGPU não disponível:', error);
            this.webgpuSupported = false;
        }
    }

    async loadAdvancedModel() {
        try {
            this.updateStatus('Carregando modelo português otimizado...', 10);
            
            // Usar modelo multilíngue mais leve e confiável
            this.model = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
                progress_callback: (progress) => {
                    if (progress.status === 'downloading') {
                        const percent = Math.round((progress.loaded / progress.total) * 80);
                        this.updateStatus(`Baixando modelo: ${percent}%`, percent);
                    } else if (progress.status === 'loading') {
                        this.updateStatus('Inicializando modelo...', 85);
                    }
                }
            });
            
            // Teste rápido do modelo
            this.updateStatus('Testando modelo...', 90);
            const testEmbedding = await this.getAdvancedEmbedding('teste');
            console.log('✅ Modelo testado com sucesso!', testEmbedding.length, 'dimensões');
            
            this.updateStatus('Sistema carregado com sucesso!', 100);
            this.enableInterface();
            
            setTimeout(() => {
                document.getElementById('statusBar').style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error('Erro detalhado ao carregar modelo:', error);
            
            // Tentar modelo de fallback
            try {
                this.updateStatus('Tentando modelo alternativo...', 50);
                
                this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                    progress_callback: (progress) => {
                        if (progress.status === 'downloading') {
                            const percent = Math.round((progress.loaded / progress.total) * 40) + 50;
                            this.updateStatus(`Baixando modelo alternativo: ${percent}%`, percent);
                        }
                    }
                });
                
                this.updateStatus('Modelo alternativo carregado!', 100);
                this.enableInterface();
                
                setTimeout(() => {
                    document.getElementById('statusBar').style.display = 'none';
                }, 2000);
                
            } catch (fallbackError) {
                console.error('Erro no modelo de fallback:', fallbackError);
                this.updateStatus('Erro ao carregar modelo. Verifique sua conexão e recarregue a página.', 0);
                
                // Mostrar detalhes do erro para debug
                const errorDetails = document.createElement('div');
                errorDetails.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 5px; font-size: 12px;';
                errorDetails.innerHTML = `
                    <strong>Detalhes técnicos:</strong><br>
                    Erro principal: ${error.message}<br>
                    Erro fallback: ${fallbackError.message}<br>
                    <em>Recarregue a página ou verifique sua conexão com a internet.</em>
                `;
                document.getElementById('statusBar').appendChild(errorDetails);
            }
        }
    }

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

    setupEventListeners() {
        // Sistema de abas
        this.searchTab.addEventListener('click', () => this.switchTab('search'));
        this.mathTab.addEventListener('click', () => this.switchTab('math'));
        
        // Busca semântica
        this.searchBtn.addEventListener('click', () => this.searchSimilarWords());
        this.wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchSimilarWords();
        });

        // Exemplos de busca
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.wordInput.value = e.target.dataset.word;
                this.searchSimilarWords();
            });
        });

        // Cálculo semântico
        this.calculateBtn.addEventListener('click', () => this.performMathCalculation());
        this.mathExpression.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performMathCalculation();
        });
        
        // Exemplos de cálculo
        document.querySelectorAll('.math-example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.mathExpression.value = e.target.dataset.expr;
                this.performMathCalculation();
            });
        });
    }

    getSemanticVocabulary() {
        // Extrair todas as palavras de todas as categorias
        const allWords = new Set();
        
        Object.values(this.semanticCategories).forEach(category => {
            category.words.forEach(word => allWords.add(word));
            category.related.forEach(word => allWords.add(word));
        });
        
        return Array.from(allWords);
    }

    getCategoryForWord(word) {
        const lowerWord = word.toLowerCase();
        
        for (const [categoryName, category] of Object.entries(this.semanticCategories)) {
            if (category.words.includes(lowerWord) || category.related.includes(lowerWord)) {
                return { name: categoryName, weight: category.weight };
            }
        }
        
        return { name: 'geral', weight: 1.0 };
    }

    async getAdvancedEmbedding(text) {
        if (!this.model) {
            throw new Error('Modelo não carregado');
        }
        
        try {
            // Processar texto para português
            const processedText = text.toLowerCase().trim();
            
            // Usar configuração compatível com os modelos
            const output = await this.model(processedText, { 
                pooling: 'mean', 
                normalize: true 
            });
            
            // Extrair dados do embedding
            let embeddingData;
            if (output.data) {
                embeddingData = Array.from(output.data);
            } else if (output.last_hidden_state) {
                // Para alguns modelos que retornam estrutura diferente
                const tensor = output.last_hidden_state;
                embeddingData = Array.from(tensor.data);
            } else {
                // Fallback direto
                embeddingData = Array.from(output);
            }
            
            // Verificar se o embedding é válido
            if (!embeddingData || embeddingData.length === 0) {
                throw new Error('Embedding vazio retornado');
            }
            
            return embeddingData;
            
        } catch (error) {
            console.error(`Erro ao processar embedding para "${text}":`, error);
            
            // Tentar método simplificado
            try {
                const output = await this.model(text);
                const embeddingData = Array.from(output.data || output);
                
                if (embeddingData && embeddingData.length > 0) {
                    return embeddingData;
                }
                
                throw new Error('Nenhum dado válido retornado');
                
            } catch (simpleError) {
                console.error(`Erro no método simplificado para "${text}":`, simpleError);
                throw new Error(`Falha ao processar embedding: ${error.message}`);
            }
        }
    }

    // Cálculo acelerado de similaridade usando WebGPU REAL
    async computeSimilarityWebGPU(targetEmbedding, embeddings) {
        if (!this.webgpuSupported || !this.webgpuDevice) {
            // Fallback para CPU
            return this.computeSimilarityCPU(targetEmbedding, embeddings);
        }

        try {
            console.log('🚀 Usando WebGPU REAL para aceleração...');
            
            const device = this.webgpuDevice;
            const targetSize = targetEmbedding.length;
            const numEmbeddings = embeddings.length;
            const embeddingSize = targetSize; // Assumindo que todos têm o mesmo tamanho

            // 1. Criar buffers GPU
            const targetBuffer = device.createBuffer({
                size: targetSize * 4, // 4 bytes por float32
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            device.queue.writeBuffer(targetBuffer, 0, new Float32Array(targetEmbedding));

            const embeddingsBuffer = device.createBuffer({
                size: numEmbeddings * embeddingSize * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            device.queue.writeBuffer(embeddingsBuffer, 0, new Float32Array(embeddings.flat()));

            const outputBuffer = device.createBuffer({
                size: numEmbeddings * 4, // Um float32 para cada similaridade
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            });

            // 2. Definir o shader de computação (WGSL)
            const shaderModule = device.createShaderModule({
                code: `
                    struct SimResult {
                        similarity: f32,
                    };

                    @group(0) @binding(0) var<storage, read> targetEmbedding: array<f32>;
                    @group(0) @binding(1) var<storage, read> embeddings: array<f32>;
                    @group(0) @binding(2) var<storage, write> output: array<SimResult>;

                    @workgroup_size(64) // Tamanho do workgroup otimizado
                    @compute
                    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                        let idx = global_id.x;
                        if (idx >= ${numEmbeddings}u) {
                            return;
                        }

                        let embeddingOffset = idx * ${embeddingSize}u;
                        var dotProduct: f32 = 0.0;
                        var magA_sq: f32 = 0.0;
                        var magB_sq: f32 = 0.0;

                        // Calcular produto escalar e magnitudes em paralelo
                        for (var i = 0u; i < ${embeddingSize}u; i = i + 1u) {
                            let valA = targetEmbedding[i];
                            let valB = embeddings[embeddingOffset + i];
                            dotProduct = dotProduct + valA * valB;
                            magA_sq = magA_sq + valA * valA;
                            magB_sq = magB_sq + valB * valB;
                        }

                        let magnitudeA = sqrt(magA_sq);
                        let magnitudeB = sqrt(magB_sq);

                        var similarity: f32 = 0.0;
                        if (magnitudeA > 0.0 && magnitudeB > 0.0) {
                            similarity = dotProduct / (magnitudeA * magnitudeB);
                        }
                        
                        output[idx].similarity = similarity;
                    }
                `,
            });

            // 3. Criar layout de pipeline e pipeline
            const bindGroupLayout = device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                    { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                    { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                ],
            });

            const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

            const computePipeline = await device.createComputePipeline({
                layout: pipelineLayout,
                compute: {
                    module: shaderModule,
                    entryPoint: "main",
                },
            });

            // 4. Criar Bind Group
            const bindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: targetBuffer } },
                    { binding: 1, resource: { buffer: embeddingsBuffer } },
                    { binding: 2, resource: { buffer: outputBuffer } },
                ],
            });

            // 5. Enviar comandos para a GPU
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, bindGroup);
            const workgroupCount = Math.ceil(numEmbeddings / 64); // Um workgroup para cada 64 embeddings
            passEncoder.dispatchWorkgroups(workgroupCount);
            passEncoder.end();

            const gpuReadBuffer = device.createBuffer({
                size: numEmbeddings * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            });
            commandEncoder.copyBufferToBuffer(outputBuffer, 0, gpuReadBuffer, 0, numEmbeddings * 4);

            device.queue.submit([commandEncoder.finish()]);

            // 6. Ler resultados de volta da GPU
            await gpuReadBuffer.mapAsync(GPUMapMode.READ);
            const resultData = new Float32Array(gpuReadBuffer.getMappedRange());
            const similarities = Array.from(resultData);
            gpuReadBuffer.unmap();

            // Limpeza de buffers
            targetBuffer.destroy();
            embeddingsBuffer.destroy();
            outputBuffer.destroy();
            gpuReadBuffer.destroy();

            console.log(`⚡ WebGPU acelerou ${numEmbeddings} cálculos de similaridade!`);
            return similarities;

        } catch (error) {
            console.warn('Erro ao usar WebGPU, caindo para CPU:', error);
            return this.computeSimilarityCPU(targetEmbedding, embeddings);
        }
    }

    computeSimilarityCPU(targetEmbedding, embeddings) {
        return embeddings.map(embedding => {
            const dotProduct = targetEmbedding.reduce((sum, a, i) => sum + a * embedding[i], 0);
            const magnitudeA = Math.sqrt(targetEmbedding.reduce((sum, a) => sum + a * a, 0));
            const magnitudeB = Math.sqrt(embedding.reduce((sum, b) => sum + b * b, 0));
            return dotProduct / (magnitudeA * magnitudeB);
        });
    }

    // Sistema de ranking corrigido e equilibrado
    calculateAdvancedSimilarity(word1, word2, cosineSimilarity) {
        const category1 = this.getCategoryForWord(word1);
        const category2 = this.getCategoryForWord(word2);
        
        let categoryBonus = 1.0;
        
        // Bonus PEQUENO se estão na mesma categoria (para não inflar demais)
        if (category1.name === category2.name && category1.name !== 'geral') {
            categoryBonus = 1.1; // Apenas 10% de bonus
        }
        
        // REMOVER aplicação de pesos que estava inflacionando
        // Aplicar apenas o bonus de categoria, mantendo a similaridade original
        const weightedSimilarity = cosineSimilarity * categoryBonus;
        
        // Penalizar palavras muito diferentes em tamanho (suavizado)
        const lengthDifference = Math.abs(word1.length - word2.length);
        const lengthPenalty = lengthDifference > 8 ? 0.9 : 1.0; // Penalidade muito pequena
        
        // MANTER a proporção original - NÃO limitar a 1.0 se não for necessário
        return weightedSimilarity * lengthPenalty;
    }

    switchTab(tab) {
        console.log(`🔄 Trocando para aba: ${tab}`);
        this.clearContext();
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
        console.log(`✅ Contexto limpo para aba: ${tab}`);
    }

    clearContext() {
        console.log('🧹 Limpando contexto completo...');
        this.currentResults = [];
        this.inputWords = [];
        this.similarWords.innerHTML = '';
        this.networkGraph.innerHTML = '';
        this.resultsTitle.textContent = 'Resultados';
        this.setSearchLoading(false);
        this.setCalcLoading(false);
        console.log('✅ Contexto limpo!');
    }

    updateStatus(text, progress) {
        this.statusText.textContent = text;
        this.progressFill.style.width = `${progress}%`;
    }

    enableInterface() {
        this.searchBtn.disabled = false;
        this.calculateBtn.disabled = false;
        this.wordInput.disabled = false;
        this.mathExpression.disabled = false;
    }

    // BUSCA SEMÂNTICA AVANÇADA (corrigida)
    async searchSimilarWords() {
        const word = this.wordInput.value.trim();
        if (!word || this.isLoading || !this.model) return;

        // LIMPEZA COMPLETA E FORÇADA
        console.log('🧹 LIMPEZA TOTAL antes da busca...');
        this.clearPreviousResults();
        this.currentResults = []; // Force clear
        this.inputWords = []; // Force clear
        this.similarWords.innerHTML = ''; // Force clear DOM
        this.networkGraph.innerHTML = ''; // Force clear DOM
        
        this.setSearchLoading(true);
        
        try {
            // REDEFINIR completamente as palavras de entrada
            this.inputWords = [word.toLowerCase()];
            
            console.log(`🧠 Iniciando busca ISOLADA para: "${word}"`);
            console.log(`📝 Palavra de entrada ATUAL:`, this.inputWords);
            console.log(`🔄 Estado anterior limpo: currentResults=${this.currentResults.length}`);
            
            const category = this.getCategoryForWord(word);
            console.log(`📂 Categoria detectada: ${category.name} (peso: ${category.weight})`);
            
            const targetEmbedding = await this.getAdvancedEmbedding(word);
            const vocabulary = this.getSemanticVocabulary();
            
            // Filtrar palavras válidas
            const wordsToCompare = vocabulary.filter(w => 
                w.toLowerCase() !== word.toLowerCase()
            );
            
            console.log(`🚀 Processando ${wordsToCompare.length} palavras com sistema ISOLADO`);
            console.log(`🔍 Primeiro lote de palavras:`, wordsToCompare.slice(0, 5));
            
            // Calcular embeddings em paralelo
            const embeddings = [];
            const batchSize = 20;
            
            for (let i = 0; i < wordsToCompare.length; i += batchSize) {
                const batch = wordsToCompare.slice(i, i + batchSize);
                const batchEmbeddings = await Promise.all(
                    batch.map(w => this.getAdvancedEmbedding(w))
                );
                embeddings.push(...batchEmbeddings);
            }
            
            // Calcular similaridades base
            const similarities = await this.computeSimilarityWebGPU(targetEmbedding, embeddings);
            
            // Aplicar ranking avançado corrigido
            const rankedResults = wordsToCompare.map((w, i) => {
                const cosineSim = similarities[i];
                const advancedSim = this.calculateAdvancedSimilarity(word, w, cosineSim);
                
                return {
                    word: w,
                    similarity: advancedSim,
                    cosine: cosineSim,
                    category: this.getCategoryForWord(w).name
                };
            });
            
            // Filtrar e ordenar com threshold ajustado
            const filteredResults = rankedResults
                .filter(r => r.similarity >= this.similarityThreshold)
                .sort((a, b) => b.similarity - a.similarity);
            
            // FORÇA novo array, sem referências antigas
            this.currentResults = [...filteredResults.slice(0, 12)];
            
            console.log(`✅ Busca ISOLADA concluída!`);
            console.log(`📊 ${this.currentResults.length} resultados NOVOS encontrados`);
            console.log(`🔍 Primeiros 3 resultados ATUAIS:`, this.currentResults.slice(0, 3).map(r => r.word));
            
            if (this.currentResults.length === 0) {
                await this.fallbackSearch(word, targetEmbedding, wordsToCompare, embeddings);
                return;
            }
            
            this.resultsTitle.textContent = `Busca: "${word}" (${category.name}) - ${this.currentResults.length} resultados`;
            this.displayResults();
            
        } catch (error) {
            console.error('Erro na busca:', error);
            alert('Erro ao buscar palavras similares. Tente novamente.');
        } finally {
            this.setSearchLoading(false);
        }
    }

    async fallbackSearch(word, targetEmbedding, wordsToCompare, embeddings) {
        console.log(`🔄 Executando busca ISOLADA com threshold reduzido...`);
        
        const similarities = await this.computeSimilarityWebGPU(targetEmbedding, embeddings);
        
        const results = wordsToCompare.map((w, i) => ({
            word: w,
            similarity: similarities[i],
            category: this.getCategoryForWord(w).name
        }));
        
        // FORÇA novo array, sem referências antigas
        this.currentResults = [...results
            .filter(r => r.similarity >= 0.3) // Threshold mais baixo para fallback
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10)];
        
        console.log(`✅ Fallback ISOLADO concluído: ${this.currentResults.length} resultados`);
        
        this.resultsTitle.textContent = `Busca (Expandida): "${word}" - ${this.currentResults.length} resultados`;
        this.displayResults();
    }

    // CÁLCULO SEMÂNTICO CORRIGIDO (sincronizado com busca avançada)
    async performMathCalculation() {
        const expression = this.mathExpression.value.trim();
        if (!expression || this.isLoading || !this.model) return;

        // LIMPEZA COMPLETA E FORÇADA
        console.log('🧹 LIMPEZA TOTAL antes do cálculo...');
        this.clearPreviousResults();
        this.currentResults = []; // Force clear
        this.inputWords = []; // Force clear
        this.similarWords.innerHTML = ''; // Force clear DOM
        this.networkGraph.innerHTML = ''; // Force clear DOM
        
        this.setCalcLoading(true);
        
        try {
            const parsedExpression = this.parseExpression(expression);
            if (!parsedExpression) {
                alert('Formato inválido. Use: palavra1 + palavra2 ou palavra1 - palavra2');
                return;
            }

            // REDEFINIR completamente as palavras de entrada
            this.inputWords = parsedExpression.map(item => item.word.toLowerCase());
            
            console.log(`🧮 Iniciando cálculo ISOLADO para: "${expression}"`);
            console.log(`📝 Palavras de entrada ATUAIS:`, this.inputWords);
            console.log(`🔄 Estado anterior limpo: currentResults=${this.currentResults.length}`);

            // DEBUG: Calcular embeddings individuais para debug
            console.log(`📊 CALCULANDO EMBEDDINGS INDIVIDUAIS...`);
            
            let resultEmbedding = await this.getAdvancedEmbedding(parsedExpression[0].word);
            console.log(`🔢 Embedding "${parsedExpression[0].word}": ${resultEmbedding.slice(0, 5).map(v => v.toFixed(3))}... (${resultEmbedding.length} dims)`);
            
            for (let i = 1; i < parsedExpression.length; i++) {
                const item = parsedExpression[i];
                const embedding = await this.getAdvancedEmbedding(item.word);
                
                console.log(`🔢 Embedding "${item.word}": ${embedding.slice(0, 5).map(v => v.toFixed(3))}... (${embedding.length} dims)`);
                console.log(`➕ Operação: ${item.operation}`);
                
                if (item.operation === '+') {
                    resultEmbedding = resultEmbedding.map((val, idx) => val + embedding[idx]);
                } else {
                    resultEmbedding = resultEmbedding.map((val, idx) => val - embedding[idx]);
                }
                
                console.log(`🎯 Resultado parcial: ${resultEmbedding.slice(0, 5).map(v => v.toFixed(3))}...`);
            }
            
            // Normalizar o resultado
            const magnitude = Math.sqrt(resultEmbedding.reduce((sum, val) => sum + val * val, 0));
            resultEmbedding = resultEmbedding.map(val => val / magnitude);
            
            console.log(`✨ Embedding FINAL normalizado: ${resultEmbedding.slice(0, 5).map(v => v.toFixed(3))}... (magnitude: ${magnitude.toFixed(3)})`);
            
            // TESTE: verificar similaridade direta com palavras esperadas
            console.log(`🧪 TESTE DE SIMILARIDADE DIRETA...`);
            const testWords = ['professora', 'médica', 'rainha', 'princesa'];
            
            for (const testWord of testWords) {
                const testEmbedding = await this.getAdvancedEmbedding(testWord);
                const directSimilarity = this.computeSimilarityCPU(resultEmbedding, [testEmbedding])[0];
                console.log(`🎯 Similaridade direta com "${testWord}": ${directSimilarity.toFixed(4)}`);
            }
            
            await this.findSimilarToEmbeddingAdvanced(resultEmbedding, expression);
            
        } catch (error) {
            console.error('Erro no cálculo:', error);
            alert('Erro ao realizar cálculo. Verifique a expressão.');
        } finally {
            this.setCalcLoading(false);
        }
    }

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

    // Nova função para cálculos semânticos com ranking avançado
    async findSimilarToEmbeddingAdvanced(targetEmbedding, expression) {
        // GARANTIR que estamos trabalhando com estado limpo
        console.log(`🎯 findSimilarToEmbeddingAdvanced iniciado LIMPO`);
        console.log(`🚫 Palavras a excluir:`, this.inputWords);
        
        const vocabulary = this.getSemanticVocabulary();
        
        const wordsToCompare = vocabulary.filter(word => 
            !this.inputWords.includes(word.toLowerCase())
        );
        
        console.log(`🚀 Calculando similaridades para ${wordsToCompare.length} palavras (excluindo ${this.inputWords.length})`);
        console.log(`🔍 Vocabulário total:`, vocabulary.length);
        console.log(`🔍 Primeiro lote de palavras a comparar:`, wordsToCompare.slice(0, 10));
        
        // TESTE: verificar se temos as palavras esperadas no vocabulário
        const expectedWords = ['professora', 'médica', 'enfermeira', 'doutora', 'educadora'];
        const foundExpected = expectedWords.filter(w => vocabulary.includes(w));
        console.log(`📚 Palavras femininas encontradas no vocabulário:`, foundExpected);
        
        // Calcular embeddings em lotes
        const embeddings = [];
        const batchSize = 25;
        
        for (let i = 0; i < wordsToCompare.length; i += batchSize) {
            const batch = wordsToCompare.slice(i, i + batchSize);
            const batchEmbeddings = await Promise.all(
                batch.map(w => this.getAdvancedEmbedding(w))
            );
            embeddings.push(...batchEmbeddings);
        }
        
        // Calcular similaridades base
        const similarities = await this.computeSimilarityWebGPU(targetEmbedding, embeddings);
        
        // DEBUG: mostrar similaridades brutas para palavras específicas
        const debugWords = ['professora', 'médica', 'rainha', 'princesa', 'educadora', 'doutora'];
        debugWords.forEach(debugWord => {
            const index = wordsToCompare.indexOf(debugWord);
            if (index !== -1) {
                console.log(`🔍 Similaridade bruta "${debugWord}":`, similarities[index]);
            }
        });
        
        // Aplicar ranking avançado como na busca semântica
        const baseWord = this.inputWords[0] || 'cálculo'; // Palavra base para ranking
        console.log(`🎯 Palavra base para ranking:`, baseWord);
        
        const rankedResults = wordsToCompare.map((w, i) => {
            const cosineSim = similarities[i];
            const advancedSim = this.calculateAdvancedSimilarity(baseWord, w, cosineSim);
            
            return {
                word: w,
                similarity: advancedSim,
                cosine: cosineSim,
                category: this.getCategoryForWord(w).name
            };
        });
        
        // DEBUG: mostrar ranking para palavras específicas após processamento
        debugWords.forEach(debugWord => {
            const result = rankedResults.find(r => r.word === debugWord);
            if (result) {
                console.log(`🎯 Após ranking "${debugWord}": similarity=${result.similarity}, cosine=${result.cosine}, category=${result.category}`);
            }
        });
        
        // Filtrar e ordenar
        const filteredResults = rankedResults
            .filter(r => r.similarity >= this.similarityThreshold)
            .sort((a, b) => b.similarity - a.similarity);
        
        console.log(`📊 Resultados acima do threshold (${this.similarityThreshold}):`, filteredResults.length);
        console.log(`🏆 Top 10 resultados:`, filteredResults.slice(0, 10).map(r => `${r.word}(${r.similarity.toFixed(3)})`));
        
        // FORÇA novo array, sem referências antigas
        this.currentResults = [...filteredResults.slice(0, 12)];
        
        if (this.currentResults.length === 0) {
            console.log(`⚠️ Nenhum resultado acima do threshold, usando fallback...`);
            // Fallback com threshold reduzido
            this.currentResults = [...rankedResults
                .filter(r => r.similarity >= 0.3)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 10)];
            
            console.log(`🔄 Fallback - Top 10:`, this.currentResults.map(r => `${r.word}(${r.similarity.toFixed(3)})`));
        }
        
        console.log(`✅ Cálculo ISOLADO concluído: ${this.currentResults.length} resultados NOVOS`);
        console.log(`🎯 Resultados FINAIS:`, this.currentResults.map(r => `${r.word}(${r.category})`));
        
        this.resultsTitle.textContent = `Cálculo: ${expression} - ${this.currentResults.length} resultados`;
        this.displayResults();
    }

    clearPreviousResults() {
        console.log('🧹 FORÇANDO limpeza completa de resultados...');
        
        // Limpar arrays
        this.currentResults = [];
        this.inputWords = [];
        
        // Limpar DOM completamente
        if (this.similarWords) {
            this.similarWords.innerHTML = '';
        }
        if (this.networkGraph) {
            this.networkGraph.innerHTML = '';
        }
        
        // Forçar garbage collection dos elementos D3
        if (window.d3 && this.networkGraph) {
            d3.select(this.networkGraph).selectAll('*').remove();
        }
        
        console.log('✅ Limpeza FORÇADA concluída!');
        console.log(`📊 Estado atual: results=${this.currentResults.length}, inputs=${this.inputWords.length}`);
    }

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

    displayResults() {
        if (!this.currentResults.length) return;
        
        this.displayListView();
        this.displayGraphView();
    }

    displayListView() {
        this.similarWords.innerHTML = '';
        
        this.currentResults.forEach((result, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.style.animationDelay = `${index * 0.05}s`;
            
            const percentage = Math.round(result.similarity * 100);
            
            // Cores por categoria
            const categoryColors = {
                'realeza': '#f59e0b',
                'família': '#ef4444',
                'pessoas': '#10b981',
                'profissões': '#8b5cf6',
                'emoções': '#f97316',
                'objetos': '#6b7280',
                'natureza': '#059669',
                'abstratos': '#7c3aed',
                'geral': '#374151'
            };
            
            const categoryColor = categoryColors[result.category] || '#374151';
            
            wordItem.innerHTML = `
                <div class="word-text">
                    ${result.word}
                    <span class="category-badge" style="background-color: ${categoryColor}">${result.category}</span>
                </div>
                <div class="similarity-score">${percentage}% similar</div>
                <div class="similarity-bar">
                    <div class="similarity-fill" style="width: ${percentage}%"></div>
                </div>
            `;
            
            wordItem.addEventListener('click', () => {
                if (this.currentTab === 'search') {
                    this.wordInput.value = result.word;
                    this.searchSimilarWords();
                } else {
                    this.mathExpression.value = result.word;
                }
            });
            
            this.similarWords.appendChild(wordItem);
        });
    }

    async displayGraphView() {
        // LIMPEZA TOTAL E FORÇADA do grafo
        console.log('🔗 INICIANDO displayGraphView com limpeza total...');
        console.log('📊 currentResults atuais:', this.currentResults.map(r => r.word));
        
        this.networkGraph.innerHTML = '';
        
        // Forçar limpeza D3
        if (window.d3) {
            d3.select(this.networkGraph).selectAll('*').remove();
        }
        
        const width = this.networkGraph.clientWidth;
        const height = this.networkGraph.clientHeight;
        
        // Criar SVG com comportamento de zoom
        const svg = d3.select(this.networkGraph)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('cursor', 'grab');
        
        // Criar container para os elementos que serão afetados pelo zoom
        const container = svg.append('g')
            .attr('class', 'zoom-container');
        
        // Configurar comportamento de zoom e pan
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3]) // Zoom mínimo 30%, máximo 300%
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            })
            .on('start', () => {
                svg.style('cursor', 'grabbing');
            })
            .on('end', () => {
                svg.style('cursor', 'grab');
            });
        
        // Aplicar comportamento de zoom ao SVG
        svg.call(zoom);
        
        // Criar controles de navegação
        const controls = d3.select(this.networkGraph)
            .append('div')
            .attr('class', 'graph-controls')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('gap', '5px')
            .style('z-index', '1000');
        
        // Botão de zoom in
        controls.append('button')
            .attr('class', 'zoom-btn')
            .style('width', '40px')
            .style('height', '40px')
            .style('border', 'none')
            .style('border-radius', '50%')
            .style('background', '#6366f1')
            .style('color', 'white')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
            .style('transition', 'all 0.2s')
            .text('+')
            .on('click', () => {
                svg.transition().duration(300).call(
                    zoom.scaleBy, 1.5
                );
            })
            .on('mouseover', function() {
                d3.select(this).style('background', '#5855eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#6366f1');
            });
        
        // Botão de zoom out
        controls.append('button')
            .attr('class', 'zoom-btn')
            .style('width', '40px')
            .style('height', '40px')
            .style('border', 'none')
            .style('border-radius', '50%')
            .style('background', '#6366f1')
            .style('color', 'white')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
            .style('transition', 'all 0.2s')
            .text('−')
            .on('click', () => {
                svg.transition().duration(300).call(
                    zoom.scaleBy, 0.67
                );
            })
            .on('mouseover', function() {
                d3.select(this).style('background', '#5855eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#6366f1');
            });
        
        // Botão de reset/centralizar
        controls.append('button')
            .attr('class', 'zoom-btn')
            .style('width', '40px')
            .style('height', '40px')
            .style('border', 'none')
            .style('border-radius', '50%')
            .style('background', '#6366f1')
            .style('color', 'white')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
            .style('transition', 'all 0.2s')
            .text('⌂')
            .attr('title', 'Centralizar')
            .on('click', () => {
                svg.transition().duration(500).call(
                    zoom.transform,
                    d3.zoomIdentity.translate(0, 0).scale(1)
                );
            })
            .on('mouseover', function() {
                d3.select(this).style('background', '#5855eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#6366f1');
            });
        
        // Adicionar indicador de navegação
        const navHint = d3.select(this.networkGraph)
            .append('div')
            .style('position', 'absolute')
            .style('bottom', '10px')
            .style('left', '10px')
            .style('background', 'rgba(0,0,0,0.7)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '5px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html('🖱️ Arrastar: mover • 🔄 Scroll: zoom • 🎯 Clique: buscar');
        
        // Esconder indicador após alguns segundos
        setTimeout(() => {
            navHint.transition().duration(1000).style('opacity', 0).remove();
        }, 5000);
        
        // PRIMEIRO NÍVEL: Mais palavras (8 ao invés de 6)
        const firstLevelResults = [...this.currentResults.slice(0, 8)]; // Aumentado de 6 para 8
        
        console.log('🎯 Primeiro nível:', firstLevelResults.map(r => r.word));
        
        // SEGUNDO NÍVEL: Restaurado com limpeza
        console.log('🔗 Calculando segundo nível do grafo (limpo)...');
        const secondLevelNodes = new Map();
        
        for (const result of firstLevelResults.slice(0, 2)) { // Usar 2 primeiros para segundo nível
            try {
                console.log(`🔍 Calculando segundo nível para: ${result.word}`);
                
                const relatedEmbedding = await this.getAdvancedEmbedding(result.word);
                const vocabulary = this.getSemanticVocabulary();
                
                const wordsToCompare = vocabulary.filter(w => 
                    w.toLowerCase() !== result.word.toLowerCase() &&
                    !firstLevelResults.some(fr => fr.word.toLowerCase() === w.toLowerCase()) &&
                    !this.inputWords.includes(w.toLowerCase())
                );
                
                // Calcular embeddings em lotes para o segundo nível
                const embeddings = [];
                const batchSize = 15; // Aumentado de 10 para 15
                
                for (let i = 0; i < Math.min(wordsToCompare.length, 60); i += batchSize) { // Aumentado de 50 para 60
                    const batch = wordsToCompare.slice(i, i + batchSize);
                    const batchEmbeddings = await Promise.all(
                        batch.map(w => this.getAdvancedEmbedding(w))
                    );
                    embeddings.push(...batchEmbeddings);
                }
                
                const similarities = await this.computeSimilarityWebGPU(relatedEmbedding, embeddings);
                
                const secondLevelCandidates = wordsToCompare.slice(0, embeddings.length)
                    .map((w, i) => ({
                        word: w,
                        similarity: similarities[i],
                        category: this.getCategoryForWord(w).name,
                        parentWord: result.word
                    }))
                    .filter(r => r.similarity >= 0.55) // Threshold ligeiramente reduzido
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, 3); // Aumentado de 2 para 3 palavras por nó
                
                console.log(`📈 Segundo nível para "${result.word}":`, secondLevelCandidates.map(c => c.word));
                
                secondLevelCandidates.forEach(candidate => {
                    if (!secondLevelNodes.has(candidate.word)) {
                        secondLevelNodes.set(candidate.word, candidate);
                    }
                });
                
            } catch (error) {
                console.warn(`Erro ao calcular segundo nível para ${result.word}:`, error);
            }
        }
        
        const secondLevelResults = Array.from(secondLevelNodes.values());
        console.log(`✅ Segundo nível calculado: ${secondLevelResults.length} nós adicionais`);
        
        // Construir todos os nós
        let allNodes = [];
        
        // Nó central
        const centralWord = this.currentTab === 'search' ? 
            (this.wordInput.value || 'centro') : 
            (this.mathExpression.value || 'cálculo');
            
        allNodes.push({
            id: centralWord,
            similarity: 1,
            category: 'central',
            level: 'central',
            size: 28 // Aumentado de 25 para 28
        });
        
        // Nós do primeiro nível
        firstLevelResults.forEach((result, index) => {
            allNodes.push({
                id: result.word,
                similarity: result.similarity,
                category: result.category,
                level: 'first',
                size: 14 + result.similarity * 10, // Ligeiramente maior
                index: index
            });
        });
        
        // Nós do segundo nível
        secondLevelResults.forEach((result, index) => {
            allNodes.push({
                id: result.word,
                similarity: result.similarity,
                category: result.category,
                level: 'second',
                size: 8 + result.similarity * 5, // Ligeiramente maior
                parentWord: result.parentWord,
                index: index
            });
        });
        
        console.log('📍 Todos os nós do grafo:', allNodes.map(n => `${n.id}(${n.level})`));
        
        // Construir links
        const links = [];
        
        // Links do centro para primeiro nível
        firstLevelResults.forEach(result => {
            links.push({
                source: centralWord,
                target: result.word,
                similarity: result.similarity,
                level: 'first',
                strength: result.similarity
            });
        });
        
        // Links do primeiro nível para segundo nível
        secondLevelResults.forEach(result => {
            if (result.parentWord) {
                links.push({
                    source: result.parentWord,
                    target: result.word,
                    similarity: result.similarity,
                    level: 'second',
                    strength: result.similarity * 0.8 // Ligeiramente mais forte
                });
            }
        });
        
        console.log('🔗 Links do grafo:', links.length, 'conexões');
        
        // Configurar simulação com forças ajustadas
        const simulation = d3.forceSimulation(allNodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(d => {
                    if (d.level === 'first') return 130; // Ligeiramente mais espaçado
                    if (d.level === 'second') return 90;
                    return 110;
                })
                .strength(d => d.strength)
            )
            .force('charge', d3.forceManyBody()
                .strength(d => {
                    if (d.level === 'central') return -1000; // Mais força para o centro
                    if (d.level === 'first') return -450;
                    if (d.level === 'second') return -250;
                    return -350;
                })
            )
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => d.size + 8) // Mais espaço entre nós
            );
        
        // Renderizar links (no container que sofre zoom)
        const link = container.append('g')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', d => {
                if (d.level === 'first') return '#6366f1';
                if (d.level === 'second') return '#94a3b8';
                return '#999';
            })
            .attr('stroke-opacity', d => {
                if (d.level === 'first') return 0.8;
                if (d.level === 'second') return 0.6;
                return 0.7;
            })
            .attr('stroke-width', d => {
                if (d.level === 'first') return Math.sqrt(d.similarity * 8); // Ligeiramente mais espesso
                if (d.level === 'second') return Math.sqrt(d.similarity * 4);
                return 2;
            });
        
        // Renderizar nós (no container que sofre zoom)
        const node = container.append('g')
            .selectAll('circle')
            .data(allNodes)
            .enter().append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => {
                if (d.level === 'central') return '#6366f1';
                
                const categoryColors = {
                    'realeza': '#f59e0b',
                    'família': '#ef4444', 
                    'pessoas': '#10b981',
                    'profissões': '#8b5cf6',
                    'emoções': '#f97316',
                    'objetos': '#6b7280',
                    'natureza': '#059669',
                    'abstratos': '#7c3aed',
                    'geral': '#374151'
                };
                
                const baseColor = categoryColors[d.category] || '#374151';
                
                // Segundo nível com opacidade reduzida
                if (d.level === 'second') {
                    return baseColor + '99'; // 60% de opacidade
                }
                
                return baseColor;
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', d => {
                if (d.level === 'central') return 4; // Mais destaque
                if (d.level === 'first') return 3;
                if (d.level === 'second') return 2;
                return 2;
            })
            .style('cursor', 'pointer');
        
        // Renderizar labels (no container que sofre zoom)
        const label = container.append('g')
            .selectAll('text')
            .data(allNodes)
            .enter().append('text')
            .text(d => d.id)
            .attr('font-size', d => {
                if (d.level === 'central') return '15px'; // Ligeiramente maior
                if (d.level === 'first') return '12px';
                if (d.level === 'second') return '10px';
                return '11px';
            })
            .attr('font-weight', d => {
                if (d.level === 'central') return 'bold';
                if (d.level === 'first') return '600';
                if (d.level === 'second') return '500';
                return '500';
            })
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('fill', d => {
                if (d.level === 'second') return '#64748b';
                return '#1e293b';
            })
            .style('pointer-events', 'none')
            .style('text-shadow', '1px 1px 2px rgba(255, 255, 255, 0.8)');
        
        // Atualizar posições na simulação
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
        
        // Interatividade dos nós (prevenir interferência com zoom)
        node.on('click', (event, d) => {
            event.stopPropagation(); // Prevenir propagação para o zoom
            if (d.level !== 'central') {
                if (this.currentTab === 'search') {
                    this.wordInput.value = d.id;
                    this.searchSimilarWords();
                } else {
                    this.mathExpression.value = d.id;
                }
            }
        });
        
        // Hover effects melhorados
        node.on('mouseover', (event, d) => {
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr('r', d.size * 1.3) // Mais zoom no hover
                .attr('stroke-width', d.level === 'central' ? 5 : 4);
            
            // Highlight das conexões relacionadas
            link
                .transition()
                .duration(200)
                .attr('stroke-opacity', l => {
                    if (l.source.id === d.id || l.target.id === d.id) {
                        return l.level === 'first' ? 1.0 : 0.9;
                    }
                    return l.level === 'first' ? 0.2 : 0.1;
                });
        });
        
        node.on('mouseout', (event, d) => {
            d3.select(event.target)
                .transition()
                .duration(200)
                .attr('r', d.size)
                .attr('stroke-width', d.level === 'central' ? 4 : (d.level === 'first' ? 3 : 2));
            
            // Restaurar opacidade original
            link
                .transition()
                .duration(200)
                .attr('stroke-opacity', l => {
                    if (l.level === 'first') return 0.8;
                    if (l.level === 'second') return 0.6;
                    return 0.7;
                });
        });
        
        console.log('✅ Grafo NAVEGÁVEL renderizado com sucesso!');
    }
}

// Inicializar aplicação avançada
document.addEventListener('DOMContentLoaded', () => {
    window.embeddingVisualizer = new AdvancedEmbeddingVisualizer();
});