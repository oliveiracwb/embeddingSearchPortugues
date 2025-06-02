// Módulo WebGPU Engine
// Sistema de aceleração GPU para cálculos de similaridade cosseno

export class WebGPUEngine {
    constructor() {
        this.device = null;
        this.isSupported = false;
        this.isInitialized = false;
    }

    /**
     * Inicializa WebGPU
     * @returns {Promise<boolean>} Sucesso da inicialização
     */
    async initialize() {
        try {
            if (!navigator.gpu) {
                console.log('WebGPU não suportado neste navegador');
                return false;
            }

            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                console.log('Adaptador WebGPU não encontrado');
                return false;
            }

            this.device = await adapter.requestDevice();
            this.isSupported = true;
            this.isInitialized = true;
            
            console.log('🚀 WebGPU Engine inicializado com sucesso!');
            return true;
            
        } catch (error) {
            console.log('WebGPU não disponível:', error);
            this.isSupported = false;
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Calcula similaridade cosseno usando WebGPU
     * @param {Float32Array} targetEmbedding - Embedding alvo
     * @param {Float32Array[]} embeddings - Array de embeddings para comparar
     * @returns {Promise<number[]>} Array de similaridades
     */
    async computeCosineSimilarity(targetEmbedding, embeddings) {
        if (!this.isSupported || !this.device) {
            throw new Error('WebGPU não está disponível');
        }

        const targetSize = targetEmbedding.length;
        const numEmbeddings = embeddings.length;
        const embeddingSize = targetSize;

        // 1. Criar buffers GPU
        const targetBuffer = this.device.createBuffer({
            size: targetSize * 4, // 4 bytes por float32
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(targetBuffer, 0, new Float32Array(targetEmbedding));

        const embeddingsBuffer = this.device.createBuffer({
            size: numEmbeddings * embeddingSize * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(embeddingsBuffer, 0, new Float32Array(embeddings.flat()));

        const outputBuffer = this.device.createBuffer({
            size: numEmbeddings * 4, // Um float32 para cada similaridade
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });

        // 2. Criar shader WGSL
        const shaderModule = this.device.createShaderModule({
            code: this.createCosineSimilarityShader(numEmbeddings, embeddingSize),
        });

        // 3. Criar pipeline
        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            ],
        });

        const pipelineLayout = this.device.createPipelineLayout({ 
            bindGroupLayouts: [bindGroupLayout] 
        });

        const computePipeline = await this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: {
                module: shaderModule,
                entryPoint: "main",
            },
        });

        // 4. Criar bind group
        const bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: targetBuffer } },
                { binding: 1, resource: { buffer: embeddingsBuffer } },
                { binding: 2, resource: { buffer: outputBuffer } },
            ],
        });

        // 5. Executar na GPU
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline);
        passEncoder.setBindGroup(0, bindGroup);
        
        const workgroupCount = Math.ceil(numEmbeddings / 64);
        passEncoder.dispatchWorkgroups(workgroupCount);
        passEncoder.end();

        // 6. Copiar resultado de volta
        const gpuReadBuffer = this.device.createBuffer({
            size: numEmbeddings * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        commandEncoder.copyBufferToBuffer(outputBuffer, 0, gpuReadBuffer, 0, numEmbeddings * 4);

        this.device.queue.submit([commandEncoder.finish()]);

        // 7. Ler resultados
        await gpuReadBuffer.mapAsync(GPUMapMode.READ);
        const resultData = new Float32Array(gpuReadBuffer.getMappedRange());
        const similarities = Array.from(resultData);
        gpuReadBuffer.unmap();

        // 8. Limpeza
        this.destroyBuffers([targetBuffer, embeddingsBuffer, outputBuffer, gpuReadBuffer]);

        return similarities;
    }

    /**
     * Gera o shader WGSL para cálculo de similaridade cosseno
     * @param {number} numEmbeddings - Número de embeddings
     * @param {number} embeddingSize - Tamanho de cada embedding
     * @returns {string} Código WGSL
     */
    createCosineSimilarityShader(numEmbeddings, embeddingSize) {
        return `
            @group(0) @binding(0) var<storage, read> targetEmbedding: array<f32>;
            @group(0) @binding(1) var<storage, read> embeddings: array<f32>;
            @group(0) @binding(2) var<storage, read_write> output: array<f32>;

            @workgroup_size(64) // Otimizado para a maioria das GPUs
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
                // Loop desenrolado para melhor performance
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
                
                output[idx] = similarity;
            }
        `;
    }

    /**
     * Calcula similaridade usando CPU como fallback
     * @param {Float32Array} targetEmbedding - Embedding alvo
     * @param {Float32Array[]} embeddings - Array de embeddings
     * @returns {number[]} Array de similaridades
     */
    computeCosineSimilarityCPU(targetEmbedding, embeddings) {
        return embeddings.map(embedding => {
            const dotProduct = targetEmbedding.reduce((sum, a, i) => sum + a * embedding[i], 0);
            const magnitudeA = Math.sqrt(targetEmbedding.reduce((sum, a) => sum + a * a, 0));
            const magnitudeB = Math.sqrt(embedding.reduce((sum, b) => sum + b * b, 0));
            return dotProduct / (magnitudeA * magnitudeB);
        });
    }

    /**
     * Destrói buffers GPU para liberar memória
     * @param {GPUBuffer[]} buffers - Array de buffers para destruir
     */
    destroyBuffers(buffers) {
        buffers.forEach(buffer => {
            if (buffer && typeof buffer.destroy === 'function') {
                buffer.destroy();
            }
        });
    }

    /**
     * Obtém informações sobre o dispositivo WebGPU
     * @returns {Object} Informações do dispositivo
     */
    getDeviceInfo() {
        if (!this.device) {
            return null;
        }

        return {
            supported: this.isSupported,
            initialized: this.isInitialized,
            limits: {
                maxWorkgroupSize: this.device.limits?.maxComputeWorkgroupSizeX || 'desconhecido',
                maxStorageBufferSize: this.device.limits?.maxStorageBufferBindingSize || 'desconhecido'
            }
        };
    }

    /**
     * Calcula número ideal de workgroups
     * @param {number} totalItems - Total de itens para processar
     * @param {number} workgroupSize - Tamanho do workgroup
     * @returns {number} Número de workgroups
     */
    calculateOptimalWorkgroups(totalItems, workgroupSize = 64) {
        return Math.ceil(totalItems / workgroupSize);
    }

    /**
     * Limpa recursos e finaliza engine
     */
    dispose() {
        this.device = null;
        this.isSupported = false;
        this.isInitialized = false;
        console.log('🧹 WebGPU Engine finalizado');
    }
} 