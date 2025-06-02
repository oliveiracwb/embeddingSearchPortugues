import * as d3 from 'd3';

// Módulo de Visualização
// Sistema de visualização interativa usando D3.js

export class VisualizationEngine {
    constructor(containerElement, categoryColors) {
        this.container = containerElement;
        this.categoryColors = categoryColors;
        this.svg = null;
        this.container_g = null;
        this.zoom = null;
        this.simulation = null;
    }

    /**
     * Renderiza grafo interativo com navegação
     * @param {Array} results - Resultados para visualizar
     * @param {Array} inputWords - Palavras de entrada para filtrar
     * @param {string} centralWord - Palavra/expressão central
     * @param {Function} onNodeClick - Callback para clique em nós
     * @param {Function} getEmbedding - Função para obter embeddings
     * @param {Function} computeSimilarities - Função para computar similaridades
     * @param {Object} semanticCategories - Sistema de categorias
     * @returns {Promise<void>}
     */
    async renderInteractiveGraph(results, inputWords, centralWord, onNodeClick, getEmbedding, computeSimilarities, semanticCategories) {
        console.log('🎯 VisualizationEngine.renderInteractiveGraph iniciado');
        console.log('📊 Parâmetros recebidos:', {
            results: results?.length,
            inputWords: inputWords?.length,
            centralWord,
            hasGetEmbedding: typeof getEmbedding === 'function',
            hasComputeSimilarities: typeof computeSimilarities === 'function',
            hasSemanticCategories: !!semanticCategories
        });
        
        // Limpeza total
        this.clearGraph();
        console.log('🧹 Grafo limpo');
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        console.log('📐 Dimensões do container:', { width, height });
        
        // Criar SVG com navegação
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('cursor', 'grab');
        
        // Container para elementos que sofrem zoom
        this.container_g = this.svg.append('g')
            .attr('class', 'zoom-container');
        
        console.log('🖼️ SVG criado');
        
        // Configurar zoom e pan
        this.setupZoomBehavior();
        console.log('🔍 Zoom configurado');
        
        // Criar controles de navegação
        this.createNavigationControls();
        console.log('🎛️ Controles criados');
        
        try {
            // Preparar dados do grafo
            console.log('⚙️ Preparando dados do grafo...');
            const { nodes, links } = await this.prepareGraphData(results, inputWords, centralWord, getEmbedding, computeSimilarities, semanticCategories);
            console.log('📈 Dados preparados:', { nodes: nodes?.length, links: links?.length });
            
            // Renderizar elementos
            console.log('🎨 Renderizando elementos...');
            this.renderLinks(links);
            this.renderNodes(nodes, onNodeClick);
            this.renderLabels(nodes);
            console.log('🎭 Elementos renderizados');
            
            // Configurar simulação física
            console.log('⚡ Configurando simulação física...');
            this.setupSimulation(nodes, links, width, height);
            console.log('🔄 Simulação configurada');
            
            console.log('✅ Grafo NAVEGÁVEL renderizado com sucesso!');
        } catch (error) {
            console.error('❌ Erro durante renderização do grafo:', error);
            throw error;
        }
    }

    /**
     * Configura comportamento de zoom e pan
     */
    setupZoomBehavior() {
        this.zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                this.container_g.attr('transform', event.transform);
            })
            .on('start', () => {
                this.svg.style('cursor', 'grabbing');
            })
            .on('end', () => {
                this.svg.style('cursor', 'grab');
            });
        
        this.svg.call(this.zoom);
    }

    /**
     * Cria controles de navegação
     */
    createNavigationControls() {
        const controls = d3.select(this.container)
            .append('div')
            .attr('class', 'graph-controls')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('gap', '5px')
            .style('z-index', '1000');
        
        // Botão zoom in
        this.createControlButton(controls, '+', 'Zoom In', () => {
            this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.5);
        });
        
        // Botão zoom out
        this.createControlButton(controls, '−', 'Zoom Out', () => {
            this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.67);
        });
        
        // Botão reset
        this.createControlButton(controls, '⌂', 'Centralizar', () => {
            this.svg.transition().duration(500).call(
                this.zoom.transform,
                d3.zoomIdentity.translate(0, 0).scale(1)
            );
        });
        
        // Indicador de navegação
        this.createNavigationHint();
    }

    /**
     * Cria botão de controle
     */
    createControlButton(parent, text, title, onClick) {
        parent.append('button')
            .attr('class', 'zoom-btn')
            .style('width', '40px')
            .style('height', '40px')
            .style('border', 'none')
            .style('border-radius', '50%')
            .style('background', '#6366f1')
            .style('color', 'white')
            .style('font-size', text === '⌂' ? '14px' : '18px')
            .style('font-weight', 'bold')
            .style('cursor', 'pointer')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
            .style('transition', 'all 0.2s')
            .text(text)
            .attr('title', title)
            .on('click', onClick)
            .on('mouseover', function() {
                d3.select(this).style('background', '#5855eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#6366f1');
            });
    }

    /**
     * Cria indicador de navegação
     */
    createNavigationHint() {
        const navHint = d3.select(this.container)
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
        
        setTimeout(() => {
            navHint.transition().duration(1000).style('opacity', 0).remove();
        }, 5000);
    }

    /**
     * Prepara dados para o grafo (primeiro e segundo nível)
     * @param {Array} results - Resultados principais
     * @param {Array} inputWords - Palavras de entrada
     * @param {string} centralWord - Palavra central
     * @param {Function} getEmbedding - Função para obter embeddings
     * @param {Function} computeSimilarities - Função para computar similaridades
     * @param {Object} semanticCategories - Sistema de categorias
     * @returns {Object} Nós e links do grafo
     */
    async prepareGraphData(results, inputWords, centralWord, getEmbedding, computeSimilarities, semanticCategories) {
        console.log('📊 prepareGraphData iniciado');
        
        // Primeiro nível (8 palavras)
        const firstLevelResults = results.slice(0, 8);
        console.log('📌 Primeiro nível:', firstLevelResults.map(r => r.word));
        
        console.log('🔗 Calculando segundo nível do grafo...');
        const secondLevelNodes = new Map();
        
        // SEGUNDO NÍVEL: Calcular palavras relacionadas aos primeiros 2 resultados
        for (const result of firstLevelResults.slice(0, 2)) { // Usar 2 primeiros para segundo nível
            try {
                console.log(`🔍 Calculando segundo nível para: ${result.word}`);
                
                if (!getEmbedding || typeof getEmbedding !== 'function') {
                    console.error('❌ getEmbedding não é uma função válida:', typeof getEmbedding);
                    break;
                }
                
                const relatedEmbedding = await getEmbedding(result.word);
                console.log(`✅ Embedding obtido para ${result.word}:`, relatedEmbedding?.length, 'dimensões');
                
                if (!semanticCategories || typeof semanticCategories.getVocabulary !== 'function') {
                    console.error('❌ semanticCategories não é válido:', semanticCategories);
                    break;
                }
                
                const vocabulary = semanticCategories.getVocabulary();
                console.log(`📚 Vocabulário obtido:`, vocabulary?.length, 'palavras');
                
                const wordsToCompare = vocabulary.filter(w => 
                    w.toLowerCase() !== result.word.toLowerCase() &&
                    !firstLevelResults.some(fr => fr.word.toLowerCase() === w.toLowerCase()) &&
                    !inputWords.includes(w.toLowerCase())
                );
                
                console.log(`🔎 Palavras para comparar com ${result.word}:`, wordsToCompare.length);
                
                // Calcular embeddings em lotes para o segundo nível
                const embeddings = [];
                const batchSize = 15; // Lotes menores para segundo nível
                
                console.log(`⚙️ Processando embeddings em lotes de ${batchSize}...`);
                for (let i = 0; i < Math.min(wordsToCompare.length, 60); i += batchSize) {
                    const batch = wordsToCompare.slice(i, i + batchSize);
                    console.log(`   Lote ${Math.floor(i/batchSize) + 1}:`, batch);
                    
                    const batchEmbeddings = await Promise.all(
                        batch.map(w => getEmbedding(w))
                    );
                    embeddings.push(...batchEmbeddings);
                    console.log(`   ✅ Lote processado, total: ${embeddings.length} embeddings`);
                }
                
                if (!computeSimilarities || typeof computeSimilarities !== 'function') {
                    console.error('❌ computeSimilarities não é uma função válida:', typeof computeSimilarities);
                    break;
                }
                
                console.log(`🔢 Calculando similaridades...`);
                const similarities = await computeSimilarities(relatedEmbedding, embeddings);
                console.log(`✅ Similaridades calculadas:`, similarities?.length);
                
                const secondLevelCandidates = wordsToCompare.slice(0, embeddings.length)
                    .map((w, i) => ({
                        word: w,
                        similarity: similarities[i],
                        category: semanticCategories.getCategoryForWord(w).name,
                        parentWord: result.word
                    }))
                    .filter(r => r.similarity >= 0.55) // Threshold para segundo nível
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, 3); // 3 palavras por nó do primeiro nível
                
                console.log(`📈 Segundo nível para "${result.word}":`, secondLevelCandidates.map(c => c.word));
                
                secondLevelCandidates.forEach(candidate => {
                    if (!secondLevelNodes.has(candidate.word)) {
                        secondLevelNodes.set(candidate.word, candidate);
                    }
                });
                
            } catch (error) {
                console.error(`❌ Erro ao calcular segundo nível para ${result.word}:`, error);
            }
        }
        
        const secondLevelResults = Array.from(secondLevelNodes.values());
        console.log(`✅ Segundo nível calculado: ${secondLevelResults.length} nós adicionais`);
        
        // Construir nós
        const nodes = [];
        
        // Nó central
        nodes.push({
            id: centralWord,
            similarity: 1,
            category: 'central',
            level: 'central',
            size: 28
        });
        console.log(`➕ Nó central adicionado: ${centralWord}`);
        
        // Nós do primeiro nível
        firstLevelResults.forEach((result, index) => {
            nodes.push({
                id: result.word,
                similarity: result.similarity,
                category: result.category,
                level: 'first',
                size: 14 + result.similarity * 10,
                index: index
            });
        });
        console.log(`➕ ${firstLevelResults.length} nós do primeiro nível adicionados`);
        
        // Nós do segundo nível
        secondLevelResults.forEach((result, index) => {
            nodes.push({
                id: result.word,
                similarity: result.similarity,
                category: result.category,
                level: 'second',
                size: 8 + result.similarity * 5,
                parentWord: result.parentWord,
                index: index
            });
        });
        console.log(`➕ ${secondLevelResults.length} nós do segundo nível adicionados`);
        
        console.log('📍 Todos os nós do grafo:', nodes.map(n => `${n.id}(${n.level})`));
        
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
        console.log(`🔗 ${firstLevelResults.length} links do primeiro nível adicionados`);
        
        // Links do primeiro nível para segundo nível
        secondLevelResults.forEach(result => {
            if (result.parentWord) {
                links.push({
                    source: result.parentWord,
                    target: result.word,
                    similarity: result.similarity,
                    level: 'second',
                    strength: result.similarity * 0.8
                });
            }
        });
        
        console.log('🔗 Links do grafo:', links.length, 'conexões');
        console.log('✅ prepareGraphData concluído');
        
        return { nodes, links };
    }

    /**
     * Renderiza links do grafo
     */
    renderLinks(links) {
        this.container_g.append('g')
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
                if (d.level === 'first') return Math.sqrt(d.similarity * 8);
                if (d.level === 'second') return Math.sqrt(d.similarity * 4);
                return 2;
            });
    }

    /**
     * Renderiza nós do grafo
     */
    renderNodes(nodes, onNodeClick) {
        const nodeSelection = this.container_g.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => this.getNodeColor(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', d => this.getStrokeWidth(d))
            .style('cursor', 'pointer');
        
        // Eventos de interação
        nodeSelection.on('click', (event, d) => {
            event.stopPropagation();
            if (d.level !== 'central' && onNodeClick) {
                onNodeClick(d.id);
            }
        });
        
        // Hover effects
        nodeSelection.on('mouseover', this.handleNodeHover.bind(this));
        nodeSelection.on('mouseout', this.handleNodeUnhover.bind(this));
    }

    /**
     * Renderiza labels dos nós
     */
    renderLabels(nodes) {
        this.container_g.append('g')
            .selectAll('text')
            .data(nodes)
            .enter().append('text')
            .text(d => d.id)
            .attr('font-size', d => this.getFontSize(d))
            .attr('font-weight', d => this.getFontWeight(d))
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('fill', d => d.level === 'second' ? '#64748b' : '#1e293b')
            .style('pointer-events', 'none')
            .style('text-shadow', '1px 1px 2px rgba(255, 255, 255, 0.8)');
    }

    /**
     * Configura simulação física D3
     */
    setupSimulation(nodes, links, width, height) {
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(d => {
                    if (d.level === 'first') return 130;
                    if (d.level === 'second') return 90;
                    return 110;
                })
                .strength(d => d.strength)
            )
            .force('charge', d3.forceManyBody()
                .strength(d => {
                    if (d.level === 'central') return -1000;
                    if (d.level === 'first') return -450;
                    if (d.level === 'second') return -250;
                    return -350;
                })
            )
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => d.size + 8)
            );
        
        // Atualizar posições a cada tick
        this.simulation.on('tick', () => {
            this.updatePositions();
        });
    }

    /**
     * Atualiza posições dos elementos
     */
    updatePositions() {
        this.container_g.selectAll('line')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        this.container_g.selectAll('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        this.container_g.selectAll('text')
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    }

    /**
     * Obtém cor do nó baseada na categoria
     */
    getNodeColor(d) {
        if (d.level === 'central') return '#6366f1';
        
        const baseColor = this.categoryColors[d.category] || '#374151';
        
        if (d.level === 'second') {
            return baseColor + '99'; // 60% opacidade
        }
        
        return baseColor;
    }

    /**
     * Obtém largura do stroke baseada no nível
     */
    getStrokeWidth(d) {
        if (d.level === 'central') return 4;
        if (d.level === 'first') return 3;
        return 2;
    }

    /**
     * Obtém tamanho da fonte baseado no nível
     */
    getFontSize(d) {
        if (d.level === 'central') return '15px';
        if (d.level === 'first') return '12px';
        return '10px';
    }

    /**
     * Obtém peso da fonte baseado no nível
     */
    getFontWeight(d) {
        if (d.level === 'central') return 'bold';
        if (d.level === 'first') return '600';
        return '500';
    }

    /**
     * Manipula hover do nó
     */
    handleNodeHover(event, d) {
        d3.select(event.target)
            .transition()
            .duration(200)
            .attr('r', d.size * 1.3)
            .attr('stroke-width', d.level === 'central' ? 5 : 4);
        
        // Highlight das conexões
        this.container_g.selectAll('line')
            .transition()
            .duration(200)
            .attr('stroke-opacity', l => {
                if (l.source.id === d.id || l.target.id === d.id) {
                    return l.level === 'first' ? 1.0 : 0.9;
                }
                return l.level === 'first' ? 0.2 : 0.1;
            });
    }

    /**
     * Manipula unhover do nó
     */
    handleNodeUnhover(event, d) {
        d3.select(event.target)
            .transition()
            .duration(200)
            .attr('r', d.size)
            .attr('stroke-width', this.getStrokeWidth(d));
        
        // Restaurar opacidade
        this.container_g.selectAll('line')
            .transition()
            .duration(200)
            .attr('stroke-opacity', l => l.level === 'first' ? 0.8 : 0.6);
    }

    /**
     * Limpa grafo completamente
     */
    clearGraph() {
        this.container.innerHTML = '';
        
        if (this.simulation) {
            this.simulation.stop();
            this.simulation = null;
        }
        
        this.svg = null;
        this.container_g = null;
        this.zoom = null;
    }

    /**
     * Renderiza lista de resultados
     * @param {Array} results - Resultados para exibir
     * @param {Element} listContainer - Container da lista
     * @param {Function} onItemClick - Callback para clique em item
     */
    renderResultsList(results, listContainer, onItemClick) {
        listContainer.innerHTML = '';
        
        results.forEach((result, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.style.animationDelay = `${index * 0.05}s`;
            
            const percentage = Math.round(result.similarity * 100);
            const categoryColor = this.categoryColors[result.category] || '#374151';
            
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
                if (onItemClick) {
                    onItemClick(result.word);
                }
            });
            
            listContainer.appendChild(wordItem);
        });
    }

    /**
     * Finaliza e limpa recursos
     */
    dispose() {
        this.clearGraph();
        console.log('🎨 Visualization Engine finalizado');
    }
} 