// Benchmark: CPU vs WebGPU Performance
// Script para comparar performance dos cálculos de similaridade

import { WebGPUEngine } from './core/WebGPUEngine.js';

class PerformanceBenchmark {
    constructor() {
        this.webgpuEngine = new WebGPUEngine();
        this.results = {
            cpu: [],
            webgpu: [],
            speedup: []
        };
    }

    /**
     * Gera dados de teste aleatórios
     */
    generateTestData(embeddingSize = 384, numEmbeddings = 100) {
        const targetEmbedding = new Array(embeddingSize).fill(0).map(() => Math.random() * 2 - 1);
        const embeddings = Array.from({length: numEmbeddings}, () => 
            new Array(embeddingSize).fill(0).map(() => Math.random() * 2 - 1)
        );
        
        return { targetEmbedding, embeddings };
    }

    /**
     * Executa benchmark CPU
     */
    async benchmarkCPU(targetEmbedding, embeddings, iterations = 5) {
        console.log(`🖥️ Benchmark CPU: ${embeddings.length} embeddings, ${iterations} iterações`);
        
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            
            const similarities = this.webgpuEngine.computeCosineSimilarityCPU(targetEmbedding, embeddings);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            times.push(duration);
            
            console.log(`  Iteração ${i + 1}: ${duration.toFixed(2)}ms`);
        }
        
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        console.log(`📊 CPU - Média: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
        
        return { avgTime, minTime, maxTime, times };
    }

    /**
     * Executa benchmark WebGPU
     */
    async benchmarkWebGPU(targetEmbedding, embeddings, iterations = 5) {
        console.log(`⚡ Benchmark WebGPU: ${embeddings.length} embeddings, ${iterations} iterações`);
        
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            
            try {
                const similarities = await this.webgpuEngine.computeCosineSimilarity(targetEmbedding, embeddings);
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                times.push(duration);
                
                console.log(`  Iteração ${i + 1}: ${duration.toFixed(2)}ms`);
            } catch (error) {
                console.warn(`  Iteração ${i + 1}: ERRO - ${error.message}`);
                return null; // WebGPU não disponível
            }
        }
        
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        console.log(`📊 WebGPU - Média: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
        
        return { avgTime, minTime, maxTime, times };
    }

    /**
     * Executa benchmark completo
     */
    async runFullBenchmark() {
        console.log('🚀 Iniciando Benchmark Completo...\n');
        
        // Inicializar WebGPU
        console.log('Inicializando WebGPU...');
        const webgpuSuccess = await this.webgpuEngine.initialize();
        console.log(`WebGPU disponível: ${webgpuSuccess}\n`);
        
        // Configurações de teste
        const testConfigs = [
            { embeddingSize: 384, numEmbeddings: 50, name: 'Pequeno' },
            { embeddingSize: 384, numEmbeddings: 100, name: 'Médio' },
            { embeddingSize: 384, numEmbeddings: 200, name: 'Grande' },
            { embeddingSize: 768, numEmbeddings: 100, name: 'Alta Dimensão' }
        ];
        
        for (const config of testConfigs) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`📦 TESTE: ${config.name} (${config.embeddingSize}D × ${config.numEmbeddings})`);
            console.log(`${'='.repeat(50)}`);
            
            // Gerar dados de teste
            const { targetEmbedding, embeddings } = this.generateTestData(
                config.embeddingSize, 
                config.numEmbeddings
            );
            
            // Benchmark CPU
            const cpuResults = await this.benchmarkCPU(targetEmbedding, embeddings);
            
            // Benchmark WebGPU (se disponível)
            let webgpuResults = null;
            if (webgpuSuccess) {
                webgpuResults = await this.benchmarkWebGPU(targetEmbedding, embeddings);
            }
            
            // Calcular speedup
            if (webgpuResults) {
                const speedup = cpuResults.avgTime / webgpuResults.avgTime;
                console.log(`🏁 SPEEDUP: ${speedup.toFixed(2)}x mais rápido com WebGPU`);
                
                // Armazenar resultados
                this.results.cpu.push(cpuResults);
                this.results.webgpu.push(webgpuResults);
                this.results.speedup.push(speedup);
            } else {
                console.log(`⚠️ WebGPU não disponível - apenas CPU testado`);
                this.results.cpu.push(cpuResults);
            }
        }
        
        // Sumário final
        this.printSummary();
    }

    /**
     * Imprime sumário dos resultados
     */
    printSummary() {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📈 SUMÁRIO DOS RESULTADOS`);
        console.log(`${'='.repeat(60)}`);
        
        if (this.results.speedup.length > 0) {
            const avgSpeedup = this.results.speedup.reduce((a, b) => a + b) / this.results.speedup.length;
            const maxSpeedup = Math.max(...this.results.speedup);
            const minSpeedup = Math.min(...this.results.speedup);
            
            console.log(`⚡ Speedup Médio: ${avgSpeedup.toFixed(2)}x`);
            console.log(`🚀 Speedup Máximo: ${maxSpeedup.toFixed(2)}x`);
            console.log(`🐌 Speedup Mínimo: ${minSpeedup.toFixed(2)}x`);
            
            // Tempo médio por método
            const avgCPUTime = this.results.cpu.reduce((sum, r) => sum + r.avgTime, 0) / this.results.cpu.length;
            const avgWebGPUTime = this.results.webgpu.reduce((sum, r) => sum + r.avgTime, 0) / this.results.webgpu.length;
            
            console.log(`\n📊 Tempos Médios:`);
            console.log(`   CPU: ${avgCPUTime.toFixed(2)}ms`);
            console.log(`   WebGPU: ${avgWebGPUTime.toFixed(2)}ms`);
            
            // Recomendação
            if (avgSpeedup > 2) {
                console.log(`\n✅ RECOMENDAÇÃO: WebGPU oferece aceleração significativa (${avgSpeedup.toFixed(1)}x)`);
            } else if (avgSpeedup > 1.2) {
                console.log(`\n⚡ RECOMENDAÇÃO: WebGPU oferece melhoria moderada (${avgSpeedup.toFixed(1)}x)`);
            } else {
                console.log(`\n⚠️ RECOMENDAÇÃO: Diferença pequena - CPU pode ser suficiente`);
            }
        } else {
            console.log(`❌ WebGPU não disponível neste ambiente`);
            console.log(`🖥️ Apenas resultados CPU coletados`);
            
            const avgCPUTime = this.results.cpu.reduce((sum, r) => sum + r.avgTime, 0) / this.results.cpu.length;
            console.log(`📊 Tempo médio CPU: ${avgCPUTime.toFixed(2)}ms`);
        }
        
        // Informações do sistema
        this.printSystemInfo();
    }

    /**
     * Imprime informações do sistema
     */
    printSystemInfo() {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`💻 INFORMAÇÕES DO SISTEMA`);
        console.log(`${'='.repeat(60)}`);
        
        console.log(`🌐 User Agent: ${navigator.userAgent}`);
        console.log(`💾 Hardware Concurrency: ${navigator.hardwareConcurrency || 'Desconhecido'} cores`);
        console.log(`🖥️ Platform: ${navigator.platform}`);
        
        if (this.webgpuEngine.isSupported) {
            const deviceInfo = this.webgpuEngine.getDeviceInfo();
            if (deviceInfo) {
                console.log(`⚡ WebGPU Limites:`);
                console.log(`   Max Workgroup Size: ${deviceInfo.limits.maxWorkgroupSize}`);
                console.log(`   Max Storage Buffer: ${deviceInfo.limits.maxStorageBufferSize}`);
            }
        } else {
            console.log(`❌ WebGPU: Não suportado ou não disponível`);
        }
    }

    /**
     * Benchmark rápido para demonstração
     */
    async quickBenchmark() {
        console.log('⚡ Benchmark Rápido...\n');
        
        await this.webgpuEngine.initialize();
        
        const { targetEmbedding, embeddings } = this.generateTestData(384, 150);
        
        console.time('CPU Total');
        const cpuResult = this.webgpuEngine.computeCosineSimilarityCPU(targetEmbedding, embeddings);
        console.timeEnd('CPU Total');
        
        if (this.webgpuEngine.isSupported) {
            console.time('WebGPU Total');
            try {
                const gpuResult = await this.webgpuEngine.computeCosineSimilarity(targetEmbedding, embeddings);
                console.timeEnd('WebGPU Total');
                
                console.log(`✅ CPU: ${cpuResult.length} similaridades calculadas`);
                console.log(`✅ WebGPU: ${gpuResult.length} similaridades calculadas`);
                
                // Verificar se os resultados são similares
                const diff = Math.abs(cpuResult[0] - gpuResult[0]);
                console.log(`🔍 Diferença primeira similaridade: ${diff.toFixed(6)} (deve ser ~0)`);
                
            } catch (error) {
                console.error('❌ WebGPU falhou:', error);
            }
        }
    }

    /**
     * Limpa recursos
     */
    dispose() {
        this.webgpuEngine.dispose();
    }
}

// Executar benchmark quando DOM carregado
document.addEventListener('DOMContentLoaded', async () => {
    const benchmark = new PerformanceBenchmark();
    
    // Adicionar controles na página
    const controls = document.createElement('div');
    controls.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        z-index: 9999;
    `;
    
    controls.innerHTML = `
        <h3>🏁 Performance Benchmark</h3>
        <button id="quickBench">Benchmark Rápido</button>
        <button id="fullBench">Benchmark Completo</button>
        <button id="clearBench">Limpar Console</button>
        <p><small>Abra o console para ver resultados</small></p>
    `;
    
    document.body.appendChild(controls);
    
    // Event listeners
    document.getElementById('quickBench').onclick = () => {
        console.clear();
        benchmark.quickBenchmark();
    };
    
    document.getElementById('fullBench').onclick = () => {
        console.clear();
        benchmark.runFullBenchmark();
    };
    
    document.getElementById('clearBench').onclick = () => {
        console.clear();
    };
    
    // Cleanup ao fechar
    window.addEventListener('beforeunload', () => {
        benchmark.dispose();
    });
});

export { PerformanceBenchmark }; 