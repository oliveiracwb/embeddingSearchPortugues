// Módulo de Categorias Semânticas
// Sistema inteligente de categorização de palavras em português

export class SemanticCategories {
    constructor() {
        // Sistema de categorias semânticas expandido e equilibrado
        this.categories = {
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
    }

    /**
     * Obtém o vocabulário completo de todas as categorias
     * @returns {string[]} Array com todas as palavras
     */
    getVocabulary() {
        const allWords = new Set();
        
        Object.values(this.categories).forEach(category => {
            category.words.forEach(word => allWords.add(word));
            category.related.forEach(word => allWords.add(word));
        });
        
        return Array.from(allWords);
    }

    /**
     * Identifica a categoria de uma palavra
     * @param {string} word - Palavra para categorizar
     * @returns {Object} Objeto com nome da categoria e peso
     */
    getCategoryForWord(word) {
        const lowerWord = word.toLowerCase();
        
        for (const [categoryName, category] of Object.entries(this.categories)) {
            if (category.words.includes(lowerWord) || category.related.includes(lowerWord)) {
                return { name: categoryName, weight: category.weight };
            }
        }
        
        return { name: 'geral', weight: 1.0 };
    }

    /**
     * Calcula similaridade avançada com ranking por categoria
     * @param {string} word1 - Primeira palavra
     * @param {string} word2 - Segunda palavra  
     * @param {number} cosineSimilarity - Similaridade cosseno base
     * @returns {number} Similaridade ajustada
     */
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

    /**
     * Obtém cores para categorias (para visualização)
     * @returns {Object} Mapeamento categoria → cor
     */
    getCategoryColors() {
        return {
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
    }

    /**
     * Estatísticas do vocabulário
     * @returns {Object} Informações sobre o vocabulário
     */
    getStats() {
        const stats = {
            totalWords: 0,
            categories: {}
        };

        Object.entries(this.categories).forEach(([name, category]) => {
            const totalWords = category.words.length + category.related.length;
            stats.categories[name] = {
                words: category.words.length,
                related: category.related.length,
                total: totalWords,
                weight: category.weight
            };
            stats.totalWords += totalWords;
        });

        return stats;
    }
} 