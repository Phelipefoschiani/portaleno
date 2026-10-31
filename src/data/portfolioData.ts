// Base de Dados e Store dos Cadastros Provisórios de Portfólio (Acesso VIP Temporário)
import { hojeISO, parseData } from '../lib/datas';

export interface PermissoesPortifolio {
  ver_fotos: boolean;
  ver_precos: boolean;
  tabela_preco_nome: string;
  ver_eventos: boolean;
  ver_parceiros: boolean;
  liberar_pedidos: boolean;
  limite_valor_pedido?: number;
  forma_pagamento_autorizada?: string;
}

export interface ItemPedidoPortifolio {
  produto_id: string;
  produto_nome: string;
  tipo_embalagem: 'Saco 25kg' | 'Big Bag 1000kg' | 'Granel' | 'Fardo 10x1kg';
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface PedidoPortifolio {
  id: string;
  numero_pedido: string;
  cadastro_provisorio_id: string;
  nome_convidado: string;
  empresa_solicitante: string;
  rca_nome: string;
  data_hora: string;
  status: 'Aguardando Aprovação' | 'Aprovado pelo RCA' | 'Em Faturamento' | 'Entregue';
  itens: ItemPedidoPortifolio[];
  valor_total: number;
  forma_pagamento: string;
  endereco_entrega: string;
  observacoes_pedido?: string;
}

export interface CadastroProvisorio {
  id: string;
  codigo_acesso: string;
  nome_convidado: string;
  empresa_solicitante: string;
  cargo?: string;
  cpf_cnpj: string;
  email: string;
  telefone_whatsapp: string;
  cidade: string;
  uf: string;
  rca_responsavel_id?: string;
  rca_responsavel_nome?: string;
  data_criacao: string; // YYYY-MM-DD
  data_vencimento: string; // YYYY-MM-DD
  status: 'ATIVO' | 'EXPIRADO' | 'BLOQUEADO';
  permissoes: PermissoesPortifolio;
  observacoes?: string;
  visualizacoes_count: number;
  ultimo_acesso_em?: string;
  pedidos_realizados: PedidoPortifolio[];
}

export interface PortfolioProduto {
  id: string;
  nome: string;
  subtitulo: string;
  categoria: string;
  descricao: string;
  foto_url: string;
  fotos_galeria: string[];
  especificacoes: { rotulo: string; valor: string }[];
  preco_kg: number;
  preco_saco_25kg: number;
  preco_big_bag: number;
  disponibilidade_safra: string;
  destaque: boolean;
}

export interface PortfolioEvento {
  id: string;
  titulo: string;
  tipo: 'Feira do Agronegócio' | 'Dia de Campo' | 'Encontro de Parceiros' | 'Workshop Técnico' | 'Degustação & Gastronomia';
  data_inicio: string;
  data_fim: string;
  horario: string;
  local: string;
  cidade_uf: string;
  estande: string;
  descricao: string;
  imagem_url: string;
  destaque: boolean;
  link_credenciamento?: string;
}

export interface PortfolioParceiro {
  id: string;
  nome: string;
  categoria: 'Produtor Rural Homologado' | 'Certificadora de Qualidade' | 'Logística Especializada' | 'Cooperativa Agroindustrial';
  regiao: string;
  descricao: string;
  selos: string[];
  foto_url: string;
  desde: string;
}

// ==========================================
// 1. PRODUTOS DO PORTFÓLIO GRUPO ENO
// ==========================================
export const PRODUTOS_PORTFOLIO: PortfolioProduto[] = [
  {
    id: 'prod_fecula_nativa',
    nome: 'Fécula de Mandioca Nativa Industrial',
    subtitulo: 'Grau Alimentício e Industrial Super Premium',
    categoria: 'Féculas',
    descricao: 'Extraída de raízes selecionadas de mandioca fresca do Norte Pioneiro do Paraná e Vale do Paranapanema. Pureza excepcional, brancura superior e alta viscosidade natural.',
    foto_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
    fotos_galeria: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=900&q=80'
    ],
    especificacoes: [
      { rotulo: 'Umidade Máxima', valor: '< 13.0%' },
      { rotulo: 'Pureza em Amido', valor: 'Min. 99.2%' },
      { rotulo: 'pH em Solução', valor: '5.5 - 6.5' },
      { rotulo: 'Viscosidade Brabender', valor: '750 - 950 UB' },
      { rotulo: 'Certificações', valor: 'FSSC 22000, Não-OGM, Kosher' }
    ],
    preco_kg: 4.85,
    preco_saco_25kg: 121.25,
    preco_big_bag: 4850.00,
    disponibilidade_safra: 'Disponível Pronta Entrega',
    destaque: true
  },
  {
    id: 'prod_fecula_modificada',
    nome: 'Fécula Modificada Catiônica & Oxidada',
    subtitulo: 'Solução de Alta Performance para Papel e Alimentos',
    categoria: 'Modificadas',
    descricao: 'Amido quimicamente reativo com índice de substituição controlado. Proporciona excelente retenção, resistência mecânica e propriedades reológicas personalizadas.',
    foto_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80',
    fotos_galeria: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=900&q=80'
    ],
    especificacoes: [
      { rotulo: 'Grau de Substituição', valor: '0.025 - 0.040' },
      { rotulo: 'Cinzas Totais', valor: '< 0.4%' },
      { rotulo: 'Estabilidade Térmica', valor: 'Até 125°C sob cisalhamento' },
      { rotulo: 'Aplicação Principal', valor: 'Papel, Celulose, Molhos e Embutidos' }
    ],
    preco_kg: 6.20,
    preco_saco_25kg: 155.00,
    preco_big_bag: 6200.00,
    disponibilidade_safra: 'Produção sob Lote Programado',
    destaque: true
  },
  {
    id: 'prod_polvilho_azedo',
    nome: 'Polvilho Azedo Artesanal Fermentado',
    subtitulo: 'Fermentação Solar Natural Controlada',
    categoria: 'Polvilhos',
    descricao: 'Produzido com processo biológico de fermentação ao sol tradicional com controle microbiológico em tanques de inox. Expansão volumétrica inigualável para pão de queijo e biscoitos.',
    foto_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
    fotos_galeria: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80'
    ],
    especificacoes: [
      { rotulo: 'Poder de Expansão', valor: '> 14.0 cm³/g' },
      { rotulo: 'Acidez Volátil', valor: '3.5 - 4.5 mL NaOH 0.1N' },
      { rotulo: 'Granulometria', valor: '100% passante em malha 60' },
      { rotulo: 'Aroma', valor: 'Característico láctico suave' }
    ],
    preco_kg: 5.40,
    preco_saco_25kg: 135.00,
    preco_big_bag: 5400.00,
    disponibilidade_safra: 'Safra Vigente em Estoque',
    destaque: true
  },
  {
    id: 'prod_polvilho_doce',
    nome: 'Polvilho Doce Especial Fino',
    subtitulo: 'Alvura Máxima e Textura Aveludada',
    categoria: 'Polvilhos',
    descricao: 'Ideal para panificação sem glúten, confeitaria, massas leves e sobremesas finas. Secagem em flash dryer contínuo garantindo padronização térmica e ausência de resíduos.',
    foto_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=900&q=80',
    fotos_galeria: [
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=900&q=80'
    ],
    especificacoes: [
      { rotulo: 'Umidade', valor: '< 12.5%' },
      { rotulo: 'Cor L (Brancura)', valor: '> 96.5 pontos' },
      { rotulo: 'Glúten', valor: 'Isento (< 5 ppm)' },
      { rotulo: 'Alérgenos', valor: 'Livre de traços alergênicos' }
    ],
    preco_kg: 4.95,
    preco_saco_25kg: 123.75,
    preco_big_bag: 4950.00,
    disponibilidade_safra: 'Pronta Entrega',
    destaque: false
  },
  {
    id: 'prod_farinha_torrada',
    nome: 'Farinha de Mandioca Torrada Especial Biju',
    subtitulo: 'Crocância e Cor Dourada Homogênea',
    categoria: 'Farinhas',
    descricao: 'Elaborada com mandioca descascada e ralada sob temperatura controlada em fornos modernos com agitação mecânica contínua. Sem corantes, 100% natural.',
    foto_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80',
    fotos_galeria: [
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80'
    ],
    especificacoes: [
      { rotulo: 'Granulação', valor: 'Média Biju Selecionada' },
      { rotulo: 'Teor de Fibras', valor: '3.2g / 100g' },
      { rotulo: 'Conservação', valor: 'Embalagem hermética com barreira O₂' }
    ],
    preco_kg: 3.90,
    preco_saco_25kg: 97.50,
    preco_big_bag: 3900.00,
    disponibilidade_safra: 'Disponível em Lotes de 10 Toneladas',
    destaque: false
  },
  {
    id: 'prod_tapioca_hidratada',
    nome: 'Goma de Tapioca Hidratada Gourmet',
    subtitulo: 'Pronta para Preparo - Peneirada e Fresca',
    categoria: 'Tapiocas',
    descricao: 'Goma de fécula selecionada, perfeitamente dosada com água de nascente tratada. Sem conservantes químicos, macia na frigideira e sem soltar água.',
    foto_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    fotos_galeria: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'
    ],
    especificacoes: [
      { rotulo: 'Umidade Equilibrada', valor: '42.0% - 44.0%' },
      { rotulo: 'Conservação', valor: 'Resfriada / Atmosfera Modificada' },
      { rotulo: 'Validade', valor: '180 dias selada' }
    ],
    preco_kg: 5.80,
    preco_saco_25kg: 145.00,
    preco_big_bag: 5800.00,
    disponibilidade_safra: 'Produção Diária Fresca',
    destaque: true
  }
];

// ==========================================
// 2. EVENTOS & FEIRAS DO GRUPO ENO
// ==========================================
export const EVENTOS_PORTFOLIO: PortfolioEvento[] = [
  {
    id: 'ev_01',
    titulo: 'Agrishow 2026 - 31ª Feira Internacional de Tecnologia Agrícola',
    tipo: 'Feira do Agronegócio',
    data_inicio: '27/04/2026',
    data_fim: '01/05/2026',
    horario: '08:00 às 18:00',
    local: 'Polo Regional de Desenvolvimento Tecnológico dos Agronegócios do Centro-Leste',
    cidade_uf: 'Ribeirão Preto / SP',
    estande: 'Pavilhão Agroindústria & Processamento - Estande D-48',
    descricao: 'Visite o espaço institucional do Grupo ENO. Demonstração de novas tecnologias de fécula modificada, degustação de derivados e reuniões comerciais exclusivas para parceiros convidados.',
    imagem_url: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=900&q=80',
    destaque: true
  },
  {
    id: 'ev_02',
    titulo: 'FIMAN 2026 - Feira Internacional da Mandioca',
    tipo: 'Feira do Agronegócio',
    data_inicio: '14/10/2026',
    data_fim: '16/10/2026',
    horario: '13:00 às 20:00',
    local: 'Parque de Exposições Presidente Arthur da Costa e Silva',
    cidade_uf: 'Paranavaí / PR',
    estande: 'Área Central de Grandes Indústrias - Estande A-12',
    descricao: 'O maior evento da cadeia produtiva da mandioca da América Latina. O Grupo ENO apresentará o novo lote de fécula nativa com certificação de pegada de carbono neutra.',
    imagem_url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=900&q=80',
    destaque: true
  },
  {
    id: 'ev_03',
    titulo: 'Dia de Campo & Colheita Sustentável Grupo ENO 2026',
    tipo: 'Dia de Campo',
    data_inicio: '22/05/2026',
    data_fim: '22/05/2026',
    horario: '07:30 às 14:00',
    local: 'Fazenda Experimental Vale do Paranapanema - Rod. PR-431',
    cidade_uf: 'Jacarezinho / PR',
    estande: 'Recepção VIP & Auditório Aberto da Fábrica',
    descricao: 'Encontro técnico de campo com demonstração de variedades de mandioca de alta densidade de amido, práticas regenerativas de solo e almoço com os fundadores e agricultores integrados.',
    imagem_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80',
    destaque: false
  },
  {
    id: 'ev_04',
    titulo: 'Workshop Gastronômico & Inovação em Panificação Sem Glúten',
    tipo: 'Workshop Técnico',
    data_inicio: '18/06/2026',
    data_fim: '18/06/2026',
    horario: '14:00 às 18:30',
    local: 'Centro Culinário & Food Innovation Brasil',
    cidade_uf: 'Curitiba / PR',
    estande: 'Bancada Master Chef & Sala de Rodada de Negócios',
    descricao: 'Masterclass com chefes renomados demonstrando a aplicação do Polvilho Azedo e Goma de Tapioca do Grupo ENO em escala industrial para franquias e indústrias de massas alimentícias.',
    imagem_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
    destaque: false
  }
];

// ==========================================
// 3. PARCEIROS & REDE HOMOLOGADA DO GRUPO ENO
// ==========================================
export const PARCEIROS_PORTFOLIO: PortfolioParceiro[] = [
  {
    id: 'parc_01',
    nome: 'Associação de Mandiocultores do Norte Pioneiro (AMANOR)',
    categoria: 'Produtor Rural Homologado',
    regiao: 'Jacarezinho, Ribeirão Claro e Carlópolis / PR',
    descricao: 'Mais de 140 famílias produtoras de mandioca com assistência técnica direta da equipe agronômica do Grupo ENO, garantindo matéria-prima de máxima frescura moída em menos de 24h após a colheita.',
    selos: ['Agricultura Familiar Sustentável', 'Rastreabilidade Total', 'Zero Trabalho Infantil'],
    foto_url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=900&q=80',
    desde: '2018'
  },
  {
    id: 'parc_02',
    nome: 'Instituto Biodinâmico & Certificação IBD Alimentos Seguros',
    categoria: 'Certificadora de Qualidade',
    regiao: 'Nacional & Exportação',
    descricao: 'Auditorias contínuas que atestam a pureza microbiológica, laudos livres de transgênicos (Non-GMO Verified) e conformidade com os mais rigorosos padrões da indústria multinacional.',
    selos: ['FSSC 22000 Auditoria Aprovada', 'Non-GMO Project', 'Laudo Certificado em Lote'],
    foto_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80',
    desde: '2020'
  },
  {
    id: 'parc_03',
    nome: 'LogAgro Express & Cargas Secas Climatizadas',
    categoria: 'Logística Especializada',
    regiao: 'Sul, Sudeste e Centro-Oeste do Brasil',
    descricao: 'Frota dedicada com rastreamento via satélite em tempo real, carrocerias sider e furgões limpos com revestimento alimentício para transporte seguro de sacarias e Big Bags.',
    selos: ['Frota 100% Rastreada', 'Entrega FOB e CIF', 'Seguro de Carga Total'],
    foto_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80',
    desde: '2019'
  },
  {
    id: 'parc_04',
    nome: 'Cooperativa de Crédito & Financiamento Agrícola Sicoob / Sicredi',
    categoria: 'Cooperativa Agroindustrial',
    regiao: 'Paraná e São Paulo',
    descricao: 'Parceiro financeiro do Grupo ENO que viabiliza linhas de crédito facilitadas para adiantamento de safras, compra programada e faturamento estendido para clientes qualificados.',
    selos: ['Crédito Rural CPR', 'Boleto Registrado sem Taxa', 'Fiança Bancária'],
    foto_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80',
    desde: '2017'
  }
];

// ==========================================
// 4. CADASTROS PROVISÓRIOS INICIAIS
// ==========================================
// Sem dados de exemplo: os cadastros provisórios ficam no armazenamento local (cadastrosData)
export const CADASTROS_PROVISORIOS_INICIAIS: CadastroProvisorio[] = [];

/**
 * Função utilitária para checar se a data de vencimento está expirada
 * (o acesso vale até o fim do dia do vencimento). Data inválida/ausente = expirado.
 */
export function isCadastroExpirado(dataVencimentoStr: string): boolean {
  const dataVenc = parseData(dataVencimentoStr);
  if (!dataVenc) return true;
  const hoje = parseData(hojeISO())!;
  return dataVenc.getTime() < hoje.getTime();
}

/**
 * Retorna os dias restantes para o vencimento (ou negativo se já expirou)
 */
export function getDiasRestantes(dataVencimentoStr: string): number {
  const dataVenc = parseData(dataVencimentoStr);
  if (!dataVenc) return 0;
  const hoje = parseData(hojeISO())!;
  return Math.round((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/** Acesso do convidado bloqueado: vencido pela data ou bloqueado manualmente (status BLOQUEADO). */
export function isAcessoPortfolioBloqueado(c: Pick<CadastroProvisorio, 'data_vencimento' | 'status'>): boolean {
  return c.status === 'BLOQUEADO' || isCadastroExpirado(c.data_vencimento);
}
